import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Manual MV3 Rollup config — @crxjs/vite-plugin does not support Vite 6+/8+.
// We produce a flat dist/ that Chrome can load as an unpacked extension.

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Disable code splitting / chunking — extension pages must be self-contained.
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'app.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        // Keep service worker at a predictable, unhashed filename (matches manifest.json).
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') return 'background.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  // Tell Vite to copy public/ -> dist/ (includes manifest.json and icons/).
  publicDir: 'public',
});
