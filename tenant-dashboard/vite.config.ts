import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyConfig = {
    '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
    },
}

export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    server: {
        port: 4000,
        proxy: proxyConfig,
    },
    preview: {
        port: 4000,
        proxy: proxyConfig,
    },
})
