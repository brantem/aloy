import { getContext } from 'hono/context-storage';

import type { User } from '../../../types';

export const getUsers = async (ids: number[]) => {
  const stmt = getContext<Env>().env.DB.prepare(`
    SELECT id, name
    FROM users
    WHERE id IN (${Array.from({ length: ids.length }).fill('?').join(',')})
  `);
  return (await stmt.bind(...ids).all<User>()).results.reduce(
    (users, user) => ({ ...users, [user.id]: user }),
    {} as { [id: number]: User },
  );
};
