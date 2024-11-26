import path from 'node:path';
import { getContext } from 'hono/context-storage';

export type UploadAttachmentResult = {
  url: string;
  data: Record<string, string>;
};

export const uploadAttachments = async (files: File | File[] = []): Promise<UploadAttachmentResult[]> => {
  if (!Array.isArray(files)) files = [files];

  const c = getContext<Env>();
  const config = c.var.config;

  if (!files.length) return [];
  if (files.length > config.attachmentMaxCount) throw { attachments: 'TOO_MANY' };

  const selected = [];
  const me: Record<string, string> = {};
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > config.attachmentMaxSize) {
      me[`attachments.${i}`] = 'TOO_BIG';
      continue;
    }

    if (!config.attachmentSupportedTypes.includes(file.type)) {
      me[`attachments.${i}`] = 'UNSUPPORTED';
      continue;
    }

    selected.push(i);
  }

  if (Object.keys(me).length) throw me;
  if (!selected.length) return [];

  const result: UploadAttachmentResult[] = [];
  for await (const i of selected) {
    try {
      const file = files[i];
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
