import path from 'node:path';
import { getContext } from 'hono/context-storage';

export type UploadAttachmentResult = {
  url: string;
  data: Record<string, string>;
};

export const uploadAttachments = async (attachments: Record<string, File> = {}): Promise<UploadAttachmentResult[]> => {
  const c = getContext<Env>();
  const config = c.var.config;

  const keys = Object.keys(attachments);
  if (!keys.length) return [];
  if (keys.length > config.attachmentMaxCount) throw { attachments: 'TOO_MANY' };

  const _keys = [];
  const me: Record<string, string> = {};
  for (const key of keys) {
    const file = attachments[key];

    if (file.size > config.attachmentMaxSize) {
      me[`attachments.${key}`] = 'TOO_BIG';
      continue;
    }

    if (!config.attachmentSupportedTypes.includes(file.type)) {
      me[`attachments.${key}`] = 'UNSUPPORTED';
      continue;
    }

    _keys.push(key);
  }

  if (Object.keys(me).length) throw me;
  if (!_keys.length) return [];

  const result: UploadAttachmentResult[] = [];
  for await (const key of _keys) {
    try {
      const file = attachments[key];
      const _key = `attachments/${Date.now()}${path.extname(file.name)}`;
      await c.env.Bucket.put(_key, file);
      result.push({
        url: `${config.assetsBaseUrl}/${_key}`,
        data: { type: file.type },
      });
    } catch (err) {
      throw err;
    }
  }

  return result;
};
