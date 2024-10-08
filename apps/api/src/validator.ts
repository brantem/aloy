import type { Context } from 'hono';
import type { SafeParseResult, GenericSchema } from 'valibot';
import { vValidator } from '@hono/valibot-validator';

import type { Env } from './types';

const hook = <R extends SafeParseResult<GenericSchema>, C extends Context<Env>>(result: R, c: C) => {
  if (result.success) return;
  c.status(400);
  return c.json({
    error: result.issues.reduce(
      (m, v) => ({ ...m, [v.path![0].key as string]: v.received === 'undefined' ? 'REQUIRED' : 'INVALID' }),
      {},
    ),
  });
};

export const json = <S extends GenericSchema>(schema: S) => {
  return vValidator('json', schema, hook);
};
