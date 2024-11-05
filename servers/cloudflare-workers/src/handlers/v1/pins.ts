import { Hono } from 'hono';
import * as v from 'valibot';

import type { Env, User, Pin, Comment } from '../../types';
import * as validator from '../../validator';

const pins = new Hono<Env>();

pins.get('/', async (c) => {
  const stmt = c.env.DB.prepare(`
    SELECT
      p.id, p.user_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
      (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
    FROM pins p
    WHERE p.app_id = ?1
      AND CASE WHEN ?2 != '' THEN p.user_id = ?2 ELSE TRUE END
      AND CASE WHEN ?3 != '' THEN p._path = ?3 ELSE TRUE END
    ORDER BY p.id DESC
  `);
  const { results } = await stmt
    .bind(c.get('appId'), c.req.query('me') === '1' ? c.get('userId') : '', c.req.query('_path') || '')
    .all<Omit<Pin, 'app_id' | '_path' | 'completed_by_id'> & { text: string }>();
  if (!results.length) return c.json({ nodes: [], error: null }, 200);

  const pinIds = [];
  const userIds = [];
  for (const pin of results) {
    pinIds.push(pin.id);
    userIds.push(pin.user_id);
  }
  const [users, comments] = await Promise.all([getUsers(c.env.DB, userIds), getRootComments(c.env.DB, pinIds)]);

  const nodes = results.map(({ user_id, ...pin }) => ({ ...pin, user: users[user_id], comment: comments[pin.id] }));
  c.header('X-Total-Count', nodes.length.toString());
  return c.json({ nodes, error: null }, 200);
});

const createPinSchema = v.object({
  _path: v.string(),
  path: v.string(),
  w: v.number(),
  _x: v.number(),
  x: v.number(),
  _y: v.number(),
  y: v.number(),
  text: v.string(),
});

pins.post('/', validator.json(createPinSchema), async (c) => {
  const { _path, path, w, _x, x, _y, y, text } = await c.req.valid('json');

  const stmt = c.env.DB.prepare(`
      INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, created_at
    `);
  const pin = await stmt
    .bind(c.get('appId'), c.get('userId'), _path, path, w, _x, x, _y, y)
    .first<Pick<Pin, 'id' | 'created_at'>>();
  if (!pin) return c.json({ pin: null, error: null }, 500);

  const stmt2 = c.env.DB.prepare(`
      INSERT INTO comments (pin_id, user_id, text, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?4)
    `);
  await stmt2.bind(pin.id, c.get('userId'), text, pin.created_at).run();

  return c.json({ pin: { id: pin.id }, error: null }, 200);
});

pins.delete('/:id', async (c) => {
  const stmt = c.env.DB.prepare('DELETE FROM pins WHERE id = ? AND user_id = ?');
  await stmt.bind(c.req.param('id'), c.get('userId')).run();
  return c.json({ success: true, error: null }, 200);
});

pins.post('/:id/complete', async (c) => {
  if ((await c.req.text()) === '1') {
    const stmt = c.env.DB.prepare(`
      UPDATE pins
      SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?2
      WHERE id = ?1 AND completed_at IS NULL
    `);
    await stmt.bind(c.req.param('id'), c.get('userId')).run();
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

pins.get('/:id/comments', async (c) => {
  const stmt = c.env.DB.prepare(`
    SELECT id, user_id, text, created_at, updated_at
    FROM comments
    WHERE pin_id = ?
    ORDER BY id ASC
    LIMIT -1 OFFSET 1
  `);
  const { results } = await stmt.bind(c.req.param('id')).all<Omit<Comment, 'pin_id'>>();
  if (!results.length) return c.json({ nodes: [], error: null }, 200);

  const userIds = [...new Set(results.map((comment) => comment.user_id))];
  const users = await getUsers(c.env.DB, userIds);

  const nodes = results.map(({ user_id, ...comment }) => ({ ...comment, user: users[user_id] }));
  c.header('X-Total-Count', nodes.length.toString());
  return c.json({ nodes, error: null }, 200);
});

const createCommentSchema = v.object({
  text: v.string(),
});

pins.post('/:id/comments', validator.json(createCommentSchema), async (c) => {
  const { text } = await c.req.valid('json');
  const stmt = c.env.DB.prepare('INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id');
  const commentId = await stmt.bind(c.req.param('id'), c.get('userId'), text).first('id');
  return c.json({ comment: { id: commentId }, error: null }, 200);
});

export default pins;

const getUsers = async (d1: D1Database, ids: string[]) => {
  const stmt = d1.prepare(`
    SELECT _id, id, name
    FROM users
    WHERE id IN (${Array.from({ length: ids.length }).fill('?').join(',')})
  `);
  return (await stmt.bind(...ids).all<User>()).results.reduce(
    (users, user) => ({ ...users, [user.id]: { id: user._id, name: user.name } }),
    {} as { [id: string]: User },
  );
};

const getRootComments = async (d1: D1Database, ids: number[]) => {
  type Row = Pick<Comment, 'id' | 'pin_id' | 'text' | 'created_at' | 'updated_at'>;

  const stmt = d1.prepare(`
    SELECT id, pin_id, text, created_at, updated_at
    FROM comments
    WHERE pin_id IN (${Array.from({ length: ids.length }).fill('?').join(',')})
    GROUP BY pin_id
    HAVING MIN(created_at)
  `);
  return (await stmt.bind(...ids).all<Row>()).results.reduce(
    (comments, { pin_id, ...comment }) => ({ ...comments, [pin_id]: comment }),
    {} as { [id: string]: Omit<Row, 'pin_id'> },
  );
};
