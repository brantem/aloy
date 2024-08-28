import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

import users from './handlers/users';
import pins from './handlers/pins';
import comments from './handlers/comments';

import type { Env } from './types';

const app = new Hono<Env>();
app.get('*', secureHeaders());
app.use('*', logger());

app.use('*', async (c, next) => {
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

app.route('/users', users);

app.use('*', async (c, next) => {
  const userId = c.req.header('Aloy-User-ID');
  if (!userId) return c.json({ error: { code: 'MISSING_USER_ID' } }, 400);
  c.set('userId', userId);

  await next();
});

app.route('/pins', pins);
app.route('/comments', comments);

export default app;
