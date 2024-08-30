import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tsconfigPaths()],
    build:
      env.MODE === 'app'
        ? {}
        : {
            lib: {
              entry: resolve(__dirname, 'src/Aloy.tsx'),
              name: 'Aloy',
              formats: ['es', 'umd'],
              fileName: 'index',
            },
            rollupOptions: {
              external: ['react', 'react-dom', 'react/jsx-runtime'],
              output: {
                globals: {
                  react: 'React',
                  'react-dom': 'React-dom',
                  'react/jsx-runtime': 'react/jsx-runtime',
                },
              },
            },
          },
  };
});
