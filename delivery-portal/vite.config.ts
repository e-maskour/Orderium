import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@orderium/ui': path.resolve(__dirname, '../shared/ui/src'),
      '@shared-logo': path.resolve(__dirname, '../shared/logo'),
      '@shared-print': path.resolve(__dirname, '../shared/components'),
    },
  },
  server: {
    port: 3003,
    host: '0.0.0.0',
    fs: {
      allow: [
        path.resolve(__dirname, '.'),
        path.resolve(__dirname, '../shared/ui'),
        path.resolve(__dirname, '../shared/logo'),
        path.resolve(__dirname, '../shared/components'),
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
