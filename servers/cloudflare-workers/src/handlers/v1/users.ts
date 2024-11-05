import { Hono } from 'hono';
import * as v from 'valibot';

import type { Env } from '../../types';
import * as validator from '../../validator';

const users = new Hono<Env>();

const createUserSchema = v.object({
  id: v.string(),
  name: v.string(),
});

users.post('/', validator.json(createUserSchema), async (c) => {
  const { id, name } = await c.req.valid('json');
  const stmt = c.env.DB.prepare(`
    INSERT INTO users (_id, app_id, name)
    VALUES (?, ?, ?)
    ON CONFLICT (_id, app_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const userId = await stmt.bind(id, c.get('appId'), name).first('id');
  return c.json({ user: { id: userId }, error: null }, 200);
});

export default users;
