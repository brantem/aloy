export type User = {
  _id: string;
  id: number;
  name: string;
};

export type Pin = {
  id: number;
  app_id: string;
  user_id: number;
  _path: string;
  path: string;
  _x: number;
  x: number;
  _y: number;
  y: number;
  created_at: number;
  completed_at: number | null;
  completed_by_id: number | null;
};

export type Comment = {
  id: number;
  pin_id: number;
  user_id: number;
  text: string;
  created_at: number;
  updated_at: number;
};

export type Attachment = {
  id: number;
  url: string;
  data: any;
};
