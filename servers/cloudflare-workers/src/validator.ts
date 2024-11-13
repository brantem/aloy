import type { Context } from 'hono';
import type { SafeParseResult, GenericSchema } from 'valibot';
import { vValidator } from '@hono/valibot-validator';

const hook = <R extends SafeParseResult<GenericSchema>, C extends Context<Env>>(result: R, c: C) => {
  if (result.success) return;
  return c.json(
    {
      error: result.issues.reduce(
        (m, v) => ({ ...m, [v.path![0].key as string]: v.received === 'undefined' ? 'REQUIRED' : 'INVALID' }),
        {},
      ),
    },
    400,
  );
};

export const json = <S extends GenericSchema>(schema: S) => {
  return vValidator('json', schema, hook);
};
