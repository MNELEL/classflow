import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'base44/**/*.test.{js,ts}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // vite-plugin-pwa's virtual module only exists inside Vite's real
      // build/dev pipeline (see vite.config.js) — it isn't a real file, so
      // Vitest can't resolve the bare specifier on its own. Point it at a
      // tiny local stub; UpdatePrompt.test.jsx then overrides that stub's
      // export with vi.mock() per-test to control needRefresh/offlineReady.
      'virtual:pwa-register/react': path.resolve(__dirname, './src/test/pwa-register-stub.js'),
    },
  },
});
