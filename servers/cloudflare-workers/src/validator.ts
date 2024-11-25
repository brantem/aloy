import type { Context } from 'hono';
import type { BaseIssue, SafeParseResult, GenericSchema } from 'valibot';
import { vValidator } from '@hono/valibot-validator';

export const issuesToError = (issues: [BaseIssue<unknown>, ...BaseIssue<unknown>[]]) => {
  return issues.reduce((m, v) => {
    const code = v.received === 'undefined' ? 'REQUIRED' : 'INVALID';
    return { ...m, [v.path![0].key as string]: code };
  }, {});
};

const hook = <R extends SafeParseResult<GenericSchema>, C extends Context<Env>>(result: R, c: C) => {
  if (result.success) return;
  return c.json({ error: issuesToError(result.issues) }, 400);
};

export const json = <S extends GenericSchema>(schema: S) => {
  return vValidator('json', schema, hook);
};
