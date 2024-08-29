export enum State {
  Nothing = 0,
  AddComment,
  ShowInbox,
}

export type User = {
  id: number;
  name: string;
};

export type PinPosition = {
  path: string;
  w: number;
  _x: number;
  x: number;
  _y: number;
  y: number;
};

export type Comment = {
  id: number;
  user: User;
  text: string;
  created_at: number;
  updated_at: number;
};

export type Pin = PinPosition & {
  id: number;
  user: User;
  total_replies: number;
  completed_at: number | null;
  comment: Pick<Comment, 'id' | 'text' | 'created_at' | 'updated_at'>;
};
