export {};

declare global {
  interface Env {
    Bindings: Bindings & {
      ALLOW_ORIGINS: string;
    };
    Variables: {
      appId: string;
      userId: string;
    };
  }
}
