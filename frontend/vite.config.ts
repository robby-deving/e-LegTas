import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    // Additional production optimizations
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV !== 'production', // Source maps only in development
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    headers: {
      // Security Analysis:
      // 1. script-src: Kept strict ('self') to prevent XSS.
      // 2. style-src: Needs 'unsafe-inline' for React/Tailwind runtime styles.
      // 3. connect-src: Whitelisted your specific backends.
      // 4. img-src: Whitelisted map tiles.
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' https://qgnwwombtmslvxyhnvuh.supabase.co https://api.e-legtas.tech; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; font-src 'self' https://fonts.gstatic.com; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(self), microphone=()'
    },
    proxy: {
      // Bypass proxy for user management data endpoints to reach localhost server
      '^/api/v1/users/data/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // All other API requests go to production
      '/api': {
          target: 'https://api.e-legtas.tech',
          changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const clientIp = req.socket.remoteAddress;
            if (clientIp) {
              proxyReq.setHeader('X-Forwarded-For', clientIp);
            }
          });
        },
      }
    }
  }
})