import { env } from 'cloudflare:test';
import { Hono } from 'hono';

import users from './users';

const app = new Hono<Env>();
app.use(async (c, next) => {
  c.set('appId', 'test');
  await next();
});
app.route('/users', users);

describe('/users', () => {
  test('POST /', async () => {
    expect(await env.DB.prepare('SELECT id FROM users').first()).toBeNull();
    const res = await app.request(
      '/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'user-1', name: 'User 1' }),
      },
      env,
    );
    expect(await env.DB.prepare('SELECT * FROM users').first()).toEqual({
      _id: 'user-1',
      id: 1,
      app_id: 'test',
      name: 'User 1',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: 1 }, error: null });

    // upsert
    await app.request(
      '/users',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'user-1', name: 'User 1' }),
      },
      env,
    );
    expect((await env.DB.prepare('SELECT COUNT(id) FROM users').raw())[0][0]).toEqual(1);
  });
});
