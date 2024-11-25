import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';

import v1 from './handlers/v1';

const app = new Hono<Env>();
app.get(secureHeaders());
app.use(logger());
app.use(contextStorage());

app.use('*', async (c, next) => {
  return cors({
    origin: c.env.ALLOW_ORIGINS || '*',
    allowHeaders: ['Content-Type', 'Aloy-App-ID', 'Aloy-User-ID'],
    exposeHeaders: ['X-Total-Count'],
  })(c, next);
});

app.use('*', async (c, next) => {
  const appId = c.req.header('Aloy-App-ID');
  if (!appId) return c.json({ error: { code: 'MISSING_APP_ID' } }, 400);
  c.set('appId', appId);

  await next();
});

app.route('/v1', v1);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: 'INTERNAL_SERVER_ERROR' } }, 500);
});

export default app;
