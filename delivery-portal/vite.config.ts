import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@orderium/ui': path.resolve(__dirname, '../shared/ui/src'),
    },
  },
  server: {
    port: 3003,
    host: '0.0.0.0',
    fs: {
      allow: [
        path.resolve(__dirname, '.'),
        path.resolve(__dirname, '../shared/ui'),
      ],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
