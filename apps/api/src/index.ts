import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

import type { User, Pin, Comment } from './types';

interface Env {
  Bindings: Bindings & {
    ALLOW_ORIGINS: string;
  };
  Variables: {
    appId: string;
    userId: string;
  };
}

const app = new Hono<Env>();
app.get('*', secureHeaders());
app.use('*', logger());

app.use('*', async (c, next) => {
  console.log(c.env.ALLOW_ORIGINS);
  return cors({
    origin: c.env.ALLOW_ORIGINS || '*',
    allowHeaders: ['Aloy-App-ID', 'Aloy-User-ID'],
    exposeHeaders: ['X-Total-Count'],
  })(c, next);
});

app.use('*', async (c, next) => {
  const appId = c.req.header('Aloy-App-ID');
  if (!appId) return c.json({ error: { code: 'MISSING_APP_ID' } }, 400);
  c.set('appId', appId);

  await next();
});

app.post('/users', async (c) => {
  const { id, name } = await c.req.json(); // TODO: validate
  const stmt = c.env.DB.prepare(`
    INSERT INTO users (_id, app_id, name)
    VALUES (?, ?, ?)
    ON CONFLICT (_id, app_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const userId = await stmt.bind(id, c.get('appId'), name).first('id');
  return c.json({ user: { id: userId } }, 200);
});

app.use('*', async (c, next) => {
  const userId = c.req.header('Aloy-User-ID');
  if (!userId) return c.json({ error: { code: 'MISSING_USER_ID' } }, 400);
  c.set('userId', userId);

  await next();
});

app.get('/pins', async (c) => {
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
  if (!results.length) return c.json({ pins: [] }, 200);

  const pinIds = [];
  const userIds = [];
  for (const pin of results) {
    pinIds.push(pin.id);
    userIds.push(pin.user_id);
  }
  const [users, comments] = await Promise.all([getUsers(c.env.DB, userIds), getRootComments(c.env.DB, pinIds)]);

  const pins = results.map(({ user_id, ...pin }) => ({ ...pin, user: users[user_id], comment: comments[pin.id] }));
  c.header('X-Total-Count', pins.length.toString());
  return c.json({ pins }, 200);
});

app.post('/pins', async (c) => {
  const { _path, path, w, _x, x, _y, y, text } = await c.req.json(); // TODO: validate

  const stmt = c.env.DB.prepare(`
    INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, created_at
  `);
  const pin = await stmt
    .bind(c.get('appId'), c.get('userId'), _path, path, w, _x, x, _y, y)
    .first<Pick<Pin, 'id' | 'created_at'>>();
  if (!pin) return c.json({ pin: null }, 500);

  const stmt2 = c.env.DB.prepare(`
    INSERT INTO comments (pin_id, user_id, text, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?4)
  `);
  await stmt2.bind(pin.id, c.get('userId'), text, pin.created_at).run();

  return c.json({ pin: { id: pin.id } }, 200);
});

app.delete('/pins/:id', async (c) => {
  const stmt = c.env.DB.prepare('DELETE FROM pins WHERE id = ? AND user_id = ?');
  await stmt.bind(c.req.param('id'), c.get('userId')).run();
  return c.json({ success: true }, 200);
});

app.post('/pins/:id/complete', async (c) => {
  let stmt;
  if ((await c.req.text()) === '1') {
    stmt = c.env.DB.prepare(`
      UPDATE pins
      SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?2
      WHERE id = ?1 AND completed_at IS NULL
    `);
  } else {
    stmt = c.env.DB.prepare(`
      UPDATE pins
      SET completed_at = NULL, completed_by_id = NULL
      WHERE id = ?1 AND completed_at IS NOT NULL
    `);
  }
  await stmt.bind(c.req.param('id'), c.get('userId')).run();
  return c.json({ success: true }, 200);
});

app.get('/pins/:id/comments', async (c) => {
  const stmt = c.env.DB.prepare(`
    SELECT id, user_id, text, created_at, updated_at
    FROM comments
    WHERE pin_id = ?
    ORDER BY id ASC
    LIMIT -1 OFFSET 1
  `);
  const { results } = await stmt.bind(c.req.param('id')).all<Omit<Comment, 'pin_id'>>();
  if (!results.length) return c.json({ comments: [] }, 200);

  const userIds = [...new Set(results.map((comment) => comment.user_id))];
  const users = await getUsers(c.env.DB, userIds);

  c.header('X-Total-Count', results.length.toString());
  return c.json({ comments: results.map(({ user_id, ...comment }) => ({ ...comment, user: users[user_id] })) }, 200);
});

app.post('/pins/:id/comments', async (c) => {
  const { text } = await c.req.json(); // TODO: validate
  const stmt = c.env.DB.prepare('INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id');
  const commentId = await stmt.bind(c.req.param('id'), c.get('userId'), text).first('id');
  return c.json({ comment: { id: commentId } }, 200);
});

app.patch('/comments/:id', async (c) => {
  const { text } = await c.req.json(); // TODO: validate
  const stmt = c.env.DB.prepare('UPDATE comments SET text = ?3 WHERE id = ?1 AND user_id = ?2');
  await stmt.bind(c.req.param('id'), c.get('userId'), text).run();
  return c.json({ success: true }, 200);
});

app.delete('/comments/:id', async (c) => {
  const stmt = c.env.DB.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?');
  await stmt.bind(c.req.param('id'), c.get('userId')).run();
  return c.json({ success: true }, 200);
});

export default app;

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

export const getRootComments = async (d1: D1Database, ids: number[]) => {
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
