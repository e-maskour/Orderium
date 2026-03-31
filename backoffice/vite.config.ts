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
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
  preview: {
    port: 3001,
  },
});
