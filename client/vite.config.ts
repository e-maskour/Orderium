import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    server: {
      host: '0.0.0.0',
      port: 3002,
      fs: {
        allow: [
          path.resolve(__dirname, '.'),
          path.resolve(__dirname, '../shared/ui'),
          path.resolve(__dirname, '../shared/logo'),
        ],
      },
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@orderium/ui": path.resolve(__dirname, "../shared/ui/src"),
        "@shared-logo": path.resolve(__dirname, "../shared/logo"),
      },
    },
  };
});
