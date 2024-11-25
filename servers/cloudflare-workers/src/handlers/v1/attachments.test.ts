import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';

import { UploadAttachmentResult, uploadAttachments } from './attachments';

describe('uploadAttachments', () => {
  const app = new Hono<Env>();
  app.use(contextStorage());
  app.use('*', async (c, next) => {
    c.set('config', {
      assetsBaseUrl: '',

      attachmentMaxCount: 1,
      attachmentMaxSize: 1,
      attachmentSupportedTypes: ['text/plain'],
    });

    await next();
  });
  app.post('/', async (c) => {
    const body = await c.req.parseBody<{ dot: true }, { attachments: Record<string, File> }>({ dot: true });
    try {
      const result = await uploadAttachments(body.attachments || {});
      return c.json(result);
    } catch (err) {
      return c.json(err as any);
    }
  });

  test('empty', async () => {
    const formData = new FormData();

    const res = await app.request('/', { method: 'POST', body: formData }, env);
    expect(await res.json()).toEqual([]);
  });

  test('ignore', async () => {
    const formData = new FormData();
    formData.append('something', new File(['a'], 'a.txt', { type: 'text/plain' }));

    const res = await app.request('/', { method: 'POST', body: formData }, env);
    expect(await res.json()).toEqual([]);
  });

  test('TOO_MANY', async () => {
    const formData = new FormData();
    formData.append('attachments.1', new File(['a'], 'a.txt', { type: 'text/plain' }));
    formData.append('attachments.2', new File(['b'], 'b.txt', { type: 'text/plain' }));

    const res = await app.request('/', { method: 'POST', body: formData }, env);
    expect(await res.json()).toEqual({ attachments: 'TOO_MANY' });
  });

  test('TOO_BIG', async () => {
    const formData = new FormData();
    formData.append('attachments.1', new File(['ab'], 'a.txt', { type: 'text/plain' }));

    const res = await app.request('/', { method: 'POST', body: formData }, env);
    expect(await res.json()).toEqual({ 'attachments.1': 'TOO_BIG' });
  });

  test('UNSUPPORTED', async () => {
    const formData = new FormData();
    formData.append('attachments.1', new File(['a'], 'a.png', { type: 'image/png' }));

    const res = await app.request('/', { method: 'POST', body: formData }, env);
    expect(await res.json()).toEqual({ 'attachments.1': 'UNSUPPORTED' });
  });

  test('success', async () => {
    const formData = new FormData();
    formData.append('attachments.1', new File(['a'], 'a.txt', { type: 'text/plain' }));

    const res = await app.request('/', { method: 'POST', body: formData }, env);
    const result = ((await res.json()) as UploadAttachmentResult[])[0];
    expect(result.url).toMatch(/\/attachments\/\d+.txt/);
    expect(result.data).toEqual({ type: 'text/plain' });
  });
});
