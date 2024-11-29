import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
  const migrationsPath = path.join(__dirname, '..', 'migrations');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
      globals: true,
      include: ['**.test.ts'],
      poolOptions: {
        workers: {
          isolatedStorage: true,
          singleWorker: true,
          miniflare: {
            bindings: { MIGRATIONS: migrations },
          },
          wrangler: {
            configPath: './wrangler.toml',
          },
        },
      },
      coverage: {
        provider: 'istanbul',
        enabled: true,
        reporter: ['text', 'html'],
      },
    },
  };
});
