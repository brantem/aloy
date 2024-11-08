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

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Bindings {
    MIGRATIONS: D1Migration[];
  }
}
