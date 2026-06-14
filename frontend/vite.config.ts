import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // In dev the FastAPI backend runs on :8000 — proxying avoids CORS entirely.
    // `/ws` is the live-trade WebSocket (ws: true upgrades the connection).
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
  build: {
    // Split heavy vendors so the charting lib doesn't bloat the main bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['lightweight-charts'],
          grid: ['react-grid-layout'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
