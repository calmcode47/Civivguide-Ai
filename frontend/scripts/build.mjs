import fs from 'node:fs/promises';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { build } from 'vite';

const MAX_JS_CHUNK_BYTES = 260 * 1024;
const MAX_TOTAL_JS_BYTES = 800 * 1024;

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('/firebase/')) {
    return 'firebase';
  }
  if (id.includes('react-router')) {
    return 'router';
  }
  if (id.includes('framer-motion')) {
    return 'motion';
  }
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
    return 'react-core';
  }
  return 'vendor';
}

async function enforceBundleBudget() {
  const assetsDir = path.resolve(process.cwd(), './dist/assets');
  const files = await fs.readdir(assetsDir);
  const jsFiles = files.filter((file) => file.endsWith('.js'));

  const sizes = await Promise.all(
    jsFiles.map(async (file) => {
      const filePath = path.join(assetsDir, file);
      const stats = await fs.stat(filePath);
      return { file, size: stats.size };
    })
  );

  const totalBytes = sizes.reduce((sum, file) => sum + file.size, 0);
  const largestChunk = sizes.reduce(
    (largest, file) => (file.size > largest.size ? file : largest),
    { file: '', size: 0 }
  );

  console.log(
    `Bundle budget check: ${jsFiles.length} JS files, ${(totalBytes / 1024).toFixed(1)} KB total, largest chunk ${largestChunk.file} (${(largestChunk.size / 1024).toFixed(1)} KB).`
  );

  if (largestChunk.size > MAX_JS_CHUNK_BYTES) {
    throw new Error(
      `Largest JS chunk exceeds budget: ${largestChunk.file} is ${(largestChunk.size / 1024).toFixed(1)} KB, limit is ${(MAX_JS_CHUNK_BYTES / 1024).toFixed(0)} KB.`
    );
  }

  if (totalBytes > MAX_TOTAL_JS_BYTES) {
    throw new Error(
      `Total JS bundle exceeds budget: ${(totalBytes / 1024).toFixed(1)} KB, limit is ${(MAX_TOTAL_JS_BYTES / 1024).toFixed(0)} KB.`
    );
  }
}

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
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  });
  await enforceBundleBudget();
  console.log('Vite build finished.');
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
