import { Hono } from 'hono';
import * as v from 'valibot';

import _app from './';
import * as validator from './validator';

describe('json', () => {
  const app = new Hono();
  const testSchema = v.object({ text: v.pipe(v.string(), v.trim(), v.nonEmpty()) });
  app.post('/', validator.json(testSchema), async (c) => c.json(await c.req.valid('json'), 200));

  async function send(body: Record<string, any>) {
    return app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  test('required', async () => {
    const res = await send({});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { text: 'REQUIRED' } });
  });

  test('invalid', async () => {
    const res = await send({ text: ' ' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { text: 'INVALID' } });
  });

  test('success', async () => {
    const res = await send({ text: ' a ' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'a' });
  });
});
