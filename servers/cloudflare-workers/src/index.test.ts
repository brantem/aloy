import { env } from 'cloudflare:test';
import { Hono } from 'hono';

import _app from './';

const app = new Hono<Env>();
app.route('/', _app);
app.get('/ping', (c) => c.text('pong'));

describe('/', () => {
  test('Aloy-App-ID', async () => {
    const res = await app.request('/ping', {}, env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'MISSING_APP_ID' } });

    const res2 = await app.request('/ping', { headers: { 'Aloy-App-ID': '1' } }, env);
    expect(res2.status).toBe(200);
  });
});
