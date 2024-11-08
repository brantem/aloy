import { env } from 'cloudflare:test';
import { Hono } from 'hono';

import v1 from './';

const app = new Hono<Env>();
app.use(async (c, next) => {
  c.set('appId', 'test');
  await next();
});
app.route('/v1', v1);
app.get('/v1/ping', (c) => c.text('pong'));

describe('/v1', () => {
  test('Aloy-User-ID', async () => {
    const res = await app.request('/v1/ping', {}, env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'MISSING_USER_ID' } });

    const res2 = await app.request('/v1/ping', { headers: { 'Aloy-User-ID': '1' } }, env);
    expect(res2.status).toBe(200);
  });
});
