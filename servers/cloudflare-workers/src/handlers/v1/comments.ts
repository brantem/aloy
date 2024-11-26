import { Hono } from 'hono';

import * as schemas from './schemas';

import * as validator from '../../validator';

const comments = new Hono<Env>();

comments.patch('/:id', validator.json(schemas.updateComment), async (c) => {
  const { text } = await c.req.valid('json');
  const stmt = c.env.DB.prepare('UPDATE comments SET text = ?3 WHERE id = ?1 AND user_id = ?2');
  await stmt.bind(c.req.param('id'), c.var.userId, text).run();
  return c.json({ success: true, error: null }, 200);
});

comments.delete('/:id', async (c) => {
  const commentId = c.req.param('id');

  const stmt = c.env.DB.prepare(`SELECT url FROM attachments WHERE id = ?`);
  const { results } = await stmt.bind(commentId).all<{ url: string }>();
  const keys = results.map((attachment) => attachment.url.replace(c.var.config.assetsBaseUrl + '/', ''));

  await Promise.all([
    c.env.DB.prepare('DELETE FROM comments WHERE id = ? AND user_id = ?').bind(commentId, c.var.userId).run(),
    c.env.Bucket.delete(keys),
  ]);

  return c.json({ success: true, error: null }, 200);
});

export default comments;
