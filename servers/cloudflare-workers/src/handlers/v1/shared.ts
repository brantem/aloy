import { getContext } from 'hono/context-storage';

import type { User, Comment, Attachment } from '../../types';

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

export const getAttachments = async (ids: number[]) => {
  type Row = Attachment & { comment_id: number };

  const stmt = getContext<Env>().env.DB.prepare(`
    SELECT id, comment_id, url, data
    FROM attachments
    WHERE comment_id IN (${Array.from({ length: ids.length }).fill('?').join(',')})
  `);
  return (await stmt.bind(...ids).all<Row>()).results.reduce(
    (attachments, { comment_id, ...attachment }) => ({
      ...attachments,
      [comment_id]: [...(attachments[comment_id] || []), { ...attachment, data: JSON.parse(attachment.data) }],
    }),
    {} as { [id: number]: Attachment[] },
  );
};
