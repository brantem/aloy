import { env } from 'cloudflare:test';
import { Hono } from 'hono';

import comments from './comments';

const app = new Hono<Env>();
app.use(async (c, next) => {
  c.set('userId', '1');
  await next();
});
app.route('/comments', comments);

describe('/comments', () => {
  beforeEach(async () => {
    await env.DB.exec(`
      INSERT INTO users VALUES ('user-1', 1, '1', 'User 1');
      INSERT INTO pins VALUES (1, 'test', 1, '/', 'body', 1, 0, 0, 0, 0, CURRENT_TIME, NULL, NULL);
      INSERT INTO comments VALUES (1, 1, 1, 'a', CURRENT_TIME, CURRENT_TIME);
    `);
  });

  test('PATCH /:id', async () => {
    expect(await env.DB.prepare('SELECT text FROM comments').first()).toEqual({ text: 'a' });
    const res = await app.request(
      '/comments/1',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ' ab ' }),
      },
      env,
    );
    expect(await env.DB.prepare('SELECT text FROM comments').first()).toEqual({ text: 'ab' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null });
  });

  test('DELETE /:id', async () => {
    expect((await env.DB.prepare('SELECT EXISTS (SELECT id FROM comments)').raw())[0][0]).toBeTruthy();
    const res = await app.request('/comments/1', { method: 'DELETE' }, env);
    expect((await env.DB.prepare('SELECT EXISTS (SELECT id FROM comments)').raw())[0][0]).toBeFalsy();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null });
  });
});
