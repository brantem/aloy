import { env } from 'cloudflare:test';
import { Hono } from 'hono';

import _app from './';

const app = new Hono<Env>();
app.route('/', _app);
app.get('/config', (c) => c.json(c.var.config));
app.get('/ping', (c) => c.text('pong'));

describe('config', () => {
  test('default', async () => {
    const res = await app.request('/config', { headers: { 'Aloy-App-ID': '1' } }, {});
    expect(await res.json()).toEqual({
      assetsBaseUrl: '',

      attachmentMaxCount: 3,
      attachmentMaxSize: 100 * 1000,
      attachmentSupportedTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
    });
  });

  test('custom', async () => {
    const res = await app.request(
      '/config',
      { headers: { 'Aloy-App-ID': '1' } },
      {
        ASSETS_BASE_URL: 'https://assets.aloy.com',
        ATTACHMENT_MAX_COUNT: '1',
        ATTACHMENT_MAX_SIZE: '1b',
        ATTACHMENT_SUPPORTED_TYPES: 'text/plain',
      },
    );
    expect(await res.json()).toEqual({
      assetsBaseUrl: 'https://assets.aloy.com',

      attachmentMaxCount: 1,
      attachmentMaxSize: 1,
      attachmentSupportedTypes: ['text/plain'],
    });
  });
});

describe('/', () => {
  test('Aloy-App-ID', async () => {
    const res = await app.request('/ping', {}, env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'MISSING_APP_ID' } });

    const res2 = await app.request('/ping', { headers: { 'Aloy-App-ID': '1' } }, env);
    expect(res2.status).toBe(200);
  });
});
