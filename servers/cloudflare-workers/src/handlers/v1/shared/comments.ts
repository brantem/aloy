import { getContext } from 'hono/context-storage';

import type { Comment } from '../../../types';

export const getComments = async (ids: number[]) => {
  type Row = Pick<Comment, 'id' | 'text' | 'created_at' | 'updated_at'>;

  const stmt = getContext<Env>().env.DB.prepare(`
    SELECT id, text, created_at, updated_at
    FROM comments
    WHERE id IN (${Array.from({ length: ids.length }).fill('?').join(',')})
  `);
  return (await stmt.bind(...ids).all<Row>()).results.reduce(
    (comments, comment) => ({ ...comments, [comment.id]: comment }),
    {} as { [id: number]: Row },
  );
};
