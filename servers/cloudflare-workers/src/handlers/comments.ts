import { Hono } from 'hono';
import * as v from 'valibot';

import type { Env } from '../types';
import * as validator from '../validator';

const comments = new Hono<Env>();

const updateCommentSchema = v.object({
  text: v.string(),
});

comments.patch('/comments/:id', validator.json(updateCommentSchema), async (c) => {
  const { text } = await c.req.valid('json');
  const stmt = c.env.DB.prepare('UPDATE comments SET text = ?3 WHERE id = ?1 AND user_id = ?2');
  await stmt.bind(c.req.param('id'), c.get('userId'), text).run();
  return c.json({ success: true, error: null }, 200);
});

comments.delete('/comments/:id', async (c) => {
  const stmt = c.env.DB.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?');
  await stmt.bind(c.req.param('id'), c.get('userId')).run();
  return c.json({ success: true, error: null }, 200);
});

export default comments;
