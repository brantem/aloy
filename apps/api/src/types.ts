export interface Env {
  Bindings: Bindings & {
    ALLOW_ORIGINS: string;
  };
  Variables: {
    appId: string;
    userId: string;
  };
}

export type User = {
  _id: string;
  id: number;
  name: string;
};

export type Pin = {
  id: number;
  app_id: string;
  user_id: string;
  _path: string;
  path: string;
  _x: number;
  x: number;
  _y: number;
  y: number;
  created_at: number;
  completed_at: number | null;
  completed_by_id: string | null;
};

export type Comment = {
  id: number;
  pin_id: number;
  user_id: string;
  text: string;
  created_at: number;
  updated_at: number;
};
