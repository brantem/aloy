import { env } from 'cloudflare:test';
import { Hono } from 'hono';

import pins from './pins';

const app = new Hono<Env>();
app.use(async (c, next) => {
  c.set('appId', 'test');
  c.set('userId', '1');
  await next();
});
app.route('/pins', pins);

describe('/pins', () => {
  beforeEach(async () => {
    await env.DB.exec("INSERT INTO users VALUES ('user-1', 1, '1', 'User 1');");
  });

  test('GET /', async () => {
    // empty
    const res = await app.request('/pins', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Total-Count')).toBe('0');
    expect(await res.json()).toEqual({ nodes: [], error: null });

    await env.DB.exec(`
      INSERT INTO pins VALUES (1, 'test', 1, '/', 'body', 1, 0, 0, 0, 0, CURRENT_TIME, NULL, NULL);
      INSERT INTO comments VALUES (1, 1, 1, 'a', CURRENT_TIME, CURRENT_TIME);
    `);

    const res2 = await app.request('/pins', {}, env);
    expect(res2.status).toBe(200);
    expect(res2.headers.get('X-Total-Count')).toBe('1');
    expect(await res2.json()).toEqual({
      nodes: [
        expect.objectContaining({
          id: 1,
          user: {
            id: 1,
            name: 'User 1',
          },
          comment: expect.objectContaining({
            id: 1,
            text: 'a',
          }),
          path: 'body',
          w: 1,
          _x: 0,
          x: 0,
          _y: 0,
          y: 0,
          completed_at: null,
          total_replies: 0,
        }),
      ],
      error: null,
    });
  });

  test('POST /', async () => {
    expect(await env.DB.prepare('SELECT * FROM pins').first()).toBeNull();
    const res = await app.request(
      '/pins',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _path: '/',
          path: 'body',
          w: 1,
          _x: 0,
          x: 0,
          _y: 0,
          y: 0,
          text: 'a',
        }),
      },
      env,
    );
    expect(await env.DB.prepare('SELECT * FROM pins').first()).toEqual(
      expect.objectContaining({
        id: 1,
        app_id: 'test',
        user_id: 1,
        _path: '/',
        path: 'body',
        w: 1,
        _x: 0,
        x: 0,
        _y: 0,
        y: 0,
        completed_at: null,
        completed_by_id: null,
      }),
    );
    expect(await env.DB.prepare('SELECT * FROM comments').first()).toEqual(
      expect.objectContaining({
        id: 1,
        pin_id: 1,
        user_id: 1,
        text: 'a',
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pin: { id: 1 }, error: null });
  });
});

describe('/pins/:id', () => {
  beforeEach(async () => {
    await env.DB.exec(`
      INSERT INTO users VALUES ('user-1', 1, '1', 'User 1');
      INSERT INTO pins VALUES (1, 'test', 1, '/', 'body', 1, 0, 0, 0, 0, CURRENT_TIME, NULL, NULL);
      INSERT INTO comments VALUES (1, 1, 1, 'a', CURRENT_TIME, CURRENT_TIME);
    `);
  });

  test('DELETE /complete', async () => {
    expect(await env.DB.prepare('SELECT completed_at, completed_by_id FROM pins').first()).toEqual({
      completed_at: null,
      completed_by_id: null,
    });

    // complete
    const res = await app.request('/pins/1/complete', { method: 'POST', body: '1' }, env);
    expect(await env.DB.prepare('SELECT completed_at, completed_by_id FROM pins').first()).toEqual(
      expect.objectContaining({
        completed_at: expect.any(String),
        completed_by_id: 1,
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null });

    // uncomplete
    const res2 = await app.request('/pins/1/complete', { method: 'POST', body: '0' }, env);
    expect(await env.DB.prepare('SELECT completed_at, completed_by_id FROM pins').first()).toEqual({
      completed_at: null,
      completed_by_id: null,
    });
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ success: true, error: null });
  });

  test('DELETE /', async () => {
    const res = await app.request('/pins/1', { method: 'DELETE' }, env);
    expect((await env.DB.prepare('SELECT EXISTS (SELECT id FROM pins)').raw())[0][0]).toBeFalsy();
    expect((await env.DB.prepare('SELECT EXISTS (SELECT id FROM comments)').raw())[0][0]).toBeFalsy();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null });
  });

  test('GET /comments', async () => {
    // empty
    const res = await app.request('/pins/1/comments', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Total-Count')).toBe('0');
    expect(await res.json()).toEqual({ nodes: [], error: null });

    await env.DB.exec("INSERT INTO comments VALUES (2, 1, 1, 'b', CURRENT_TIME, CURRENT_TIME);");

    const res2 = await app.request('/pins/1/comments', {}, env);
    expect(res2.status).toBe(200);
    expect(res2.headers.get('X-Total-Count')).toBe('1');
    expect(await res2.json()).toEqual({
      nodes: [
        expect.objectContaining({
          id: 2,
          user: {
            id: 1,
            name: 'User 1',
          },
          text: 'b',
        }),
      ],
      error: null,
    });
  });

  test('POST /comments', async () => {
    const comment = expect.objectContaining({ id: 1, pin_id: 1, user_id: 1, text: 'a' });

    expect((await env.DB.prepare('SELECT * FROM comments').all()).results).toEqual([comment]);
    const res = await app.request(
      '/pins/1/comments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'b' }),
      },
      env,
    );

    const comment2 = expect.objectContaining({ id: 2, pin_id: 1, user_id: 1, text: 'b' });
    expect((await env.DB.prepare('SELECT * FROM comments').all()).results).toEqual([comment, comment2]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ comment: { id: 2 }, error: null });
  });
});
