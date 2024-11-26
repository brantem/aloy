import { Hono } from 'hono';
import * as v from 'valibot';

import { UploadAttachmentResult, uploadAttachments } from './attachments';
import { getUsers, getComments, getAttachments } from './shared';

import type { Pin, Comment } from '../../types';
import * as validator from '../../validator';

const pins = new Hono<Env>();

pins.get('/', async (c) => {
  const stmt = c.env.DB.prepare(`
    WITH t AS (
		  SELECT id, pin_id
		  FROM comments
		  GROUP BY pin_id
		  HAVING MIN(created_at)
		)
    SELECT
      p.id, p.user_id, t.id AS comment_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
      (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
    FROM pins p
		JOIN t ON t.pin_id = p.id
    WHERE p.app_id = ?1
      AND CASE WHEN ?2 != '' THEN p.user_id = ?2 ELSE TRUE END
      AND CASE WHEN ?3 != '' THEN p._path = ?3 ELSE TRUE END
    ORDER BY p.id DESC
  `);
  const { results } = await stmt
    .bind(c.var.appId, c.req.query('me') === '1' ? c.var.userId : '', c.req.query('_path') || '')
    .all<Omit<Pin, 'app_id' | '_path' | 'completed_by_id'> & { comment_id: number }>();
  if (!results.length) return c.json({ nodes: [], error: null }, 200, { 'X-Total-Count': '0' });

  const userIds = [...new Set(results.map((pin) => pin.user_id))];
  const commentIds = [...new Set(results.map((pin) => pin.comment_id))];
  const [users, comments, attachments] = await Promise.all([
    getUsers(userIds),
    getComments(commentIds),
    getAttachments(commentIds),
  ]);

  const nodes = results.map(({ user_id, ...pin }) => ({
    ...pin,
    user: users[user_id],
    comment: { ...comments[pin.comment_id], attachments: attachments[pin.comment_id] || [] },
  }));
  return c.json({ nodes, error: null }, 200, { 'X-Total-Count': nodes.length.toString() });
});

const createPinSchema = v.object({
  _path: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  path: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  w: v.pipe(v.string(), v.transform(Number)),
  _x: v.pipe(v.string(), v.transform(Number)),
  x: v.pipe(v.string(), v.transform(Number)),
  _y: v.pipe(v.string(), v.transform(Number)),
  y: v.pipe(v.string(), v.transform(Number)),
  text: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});

type CreatePinBody = v.InferInput<typeof createPinSchema> & {
  attachments: Record<string, File>;
};

pins.post('/', async (c) => {
  const _body = await c.req.parseBody<{ dot: true }, CreatePinBody>({ dot: true });

  const result = v.safeParse(createPinSchema, _body);
  if (!result.success) return c.json({ pin: null, error: validator.issuesToError(result.issues) }, 200);
  const body = result.output;

  let attachments: UploadAttachmentResult[];
  try {
    attachments = await uploadAttachments(_body.attachments);
  } catch (err) {
    if (err === 'INTERNAL_SERVER_ERROR') throw err;
    return c.json({ error: err }, 400);
  }

  const stmt = c.env.DB.prepare(`
    INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, created_at
  `);
  const pinId = await stmt
    .bind(c.var.appId, c.var.userId, body._path, body.path, body.w, body._x, body.x, body._y, body.y)
    .first('id');
  if (!pinId) return c.json({ pin: null, error: null }, 500);

  const stmt2 = c.env.DB.prepare(`INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id`);
  const commentId = await stmt2.bind(pinId, c.var.userId, body.text).first('id');

  if (!attachments.length) return c.json({ pin: { id: pinId }, error: null }, 200);

  const stmt3 = c.env.DB.prepare('INSERT INTO attachments (comment_id, url, data) VALUES (?, ?, ?)');
  await Promise.all(attachments.map((v) => stmt3.bind(commentId, v.url, JSON.stringify(v.data)).run()));

  return c.json({ pin: { id: pinId }, error: null }, 200);
});

pins.post('/:id/complete', async (c) => {
  if ((await c.req.text()).trim() === '1') {
    const stmt = c.env.DB.prepare(`
      UPDATE pins
      SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?2
      WHERE id = ?1 AND completed_at IS NULL
    `);
    await stmt.bind(c.req.param('id'), c.var.userId).run();
  } else {
    const stmt = c.env.DB.prepare(`
      UPDATE pins
      SET completed_at = NULL, completed_by_id = NULL
      WHERE id = ?1 AND completed_at IS NOT NULL
    `);
    await stmt.bind(c.req.param('id')).run();
  }
  return c.json({ success: true, error: null }, 200);
});

pins.delete('/:id', async (c) => {
  const stmt = c.env.DB.prepare('DELETE FROM pins WHERE id = ? AND user_id = ?');
  await stmt.bind(c.req.param('id'), c.var.userId).run();
  return c.json({ success: true, error: null }, 200);
});

pins.get('/:id/comments', async (c) => {
  const stmt = c.env.DB.prepare(`
    SELECT id, user_id, text, created_at, updated_at
    FROM comments
    WHERE pin_id = ?
    ORDER BY id ASC
    LIMIT -1 OFFSET 1
  `);
  const { results } = await stmt.bind(c.req.param('id')).all<Omit<Comment, 'pin_id'>>();
  if (!results.length) return c.json({ nodes: [], error: null }, 200, { 'X-Total-Count': '0' });

  const commentIds = [...new Set(results.map((comment) => comment.id))];
  const userIds = [...new Set(results.map((comment) => comment.user_id))];
  const [users, attachments] = await Promise.all([getUsers(userIds), getAttachments(commentIds)]);

  const nodes = results.map(({ user_id, ...comment }) => ({
    ...comment,
    user: users[user_id],
    attachments: attachments[comment.id] || [],
  }));
  return c.json({ nodes, error: null }, 200, { 'X-Total-Count': nodes.length.toString() });
});

const createCommentSchema = v.object({
  text: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});

type CreateCommentBody = v.InferInput<typeof createCommentSchema> & {
  attachments: Record<string, File>;
};

pins.post('/:id/comments', async (c) => {
  const _body = await c.req.parseBody<{ dot: true }, CreateCommentBody>({ dot: true });

  const result = v.safeParse(createCommentSchema, _body);
  if (!result.success) return c.json({ comment: null, error: validator.issuesToError(result.issues) }, 200);
  const body = result.output;

  let attachments: UploadAttachmentResult[];
  try {
    attachments = await uploadAttachments(_body.attachments);
  } catch (err) {
    if (err === 'INTERNAL_SERVER_ERROR') throw err;
    return c.json({ error: err }, 400);
  }

  const stmt = c.env.DB.prepare('INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id');
  const commentId = await stmt.bind(c.req.param('id'), c.var.userId, body.text).first('id');

  if (!attachments.length) return c.json({ comment: { id: commentId }, error: null }, 200);

  const stmt2 = c.env.DB.prepare('INSERT INTO attachments (comment_id, url, data) VALUES (?, ?, ?)');
  await Promise.all(attachments.map((v) => stmt2.bind(commentId, v.url, JSON.stringify(v.data)).run()));

  return c.json({ comment: { id: commentId }, error: null }, 200);
});

export default pins;
