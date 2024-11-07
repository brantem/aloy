import { Hono } from 'hono';

import users from './users';
import pins from './pins';
import comments from './comments';

const v1 = new Hono<Env>();

v1.route('/users', users);

v1.use('/*', async (c, next) => {
  const userId = c.req.header('Aloy-User-ID');
  if (!userId) return c.json({ error: { code: 'MISSING_USER_ID' } }, 400);
  c.set('userId', userId);

  await next();
});

v1.route('/pins', pins);

v1.route('/comments', comments);

export default v1;
