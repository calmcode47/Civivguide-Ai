import path from 'node:path';

import react from '@vitejs/plugin-react';
import { build } from 'vite';

try {
  console.log('Starting Vite build...');
  await build({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
  });
  console.log('Vite build finished.');
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
