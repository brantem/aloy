export {};

declare global {
  interface Env {
    Bindings: Bindings;
    Variables: {
      config: {
        assetsBaseUrl: string;

        attachmentMaxCount: number;
        attachmentMaxSize: number;
        attachmentSupportedTypes: string[];
      };

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
