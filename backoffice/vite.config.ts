import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@orderium/ui': path.resolve(__dirname, '../shared/ui/src'),
      '@shared-logo': path.resolve(__dirname, '../shared/logo'),
      '@shared-print': path.resolve(__dirname, '../shared/components'),
    },
  },
  // @ts-expect-error - vitest config lives alongside vite config
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.ts'],
      exclude: ['src/modules/**/index.ts'],
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Extract tenant slug from subdomain and forward as X-Tenant-ID header.
            // e.g. acme-admin.localhost:3001  →  X-Tenant-ID: acme
            const host = (req.headers['host'] as string) ?? '';
            const match = host.match(/^([a-z0-9-]+)\.(localhost|.+\..+?)(:\d+)?$/i);
            if (match) {
              const slug = match[1].replace(/-(admin|app|delivery)$/i, '');
              proxyReq.setHeader('X-Tenant-ID', slug);
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — loaded first, very small
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Router
          if (
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/react-router/')
          ) {
            return 'vendor-router';
          }
          // Data fetching
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query';
          }
          // PrimeReact UI library (large — split out so it's cached independently)
          if (
            id.includes('node_modules/primereact/') ||
            id.includes('node_modules/primeflex/') ||
            id.includes('node_modules/primeicons/')
          ) {
            return 'vendor-prime';
          }
          // Firebase SDK (large — only needed for push notifications)
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase';
          }
          // Excel export/import (large — only needed on a few pages)
          if (id.includes('node_modules/xlsx/')) {
            return 'vendor-xlsx';
          }
          // Charts (large — only needed on dashboard)
          if (
            id.includes('node_modules/apexcharts/') ||
            id.includes('node_modules/react-apexcharts/')
          ) {
            return 'vendor-charts';
          }
          // Icons
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  preview: {
    port: 3001,
  },
});
