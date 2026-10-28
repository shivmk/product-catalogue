/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The main chunk is ~160 kB gzipped (React, React Router, Motion). Acceptable for the PoC;
    // see DECISIONS.md for the follow-ups (LazyMotion, route-level splitting).
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    // In development the browser talks to Vite, and Vite forwards /api to the backend,
    // so the client only ever knows one origin. nginx does the same in docker compose.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts'],
    // Node's fetch needs absolute URLs; MSW intercepts this origin.
    env: { VITE_API_BASE_URL: 'http://localhost/api' },
  },
});
