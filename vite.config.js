import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('/react-router') || id.includes('/react-router-dom')) return 'vendor-router';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-recharts';
          if (id.includes('/framer-motion/')) return 'vendor-framer';
          if (id.includes('/lucide-react/')) return 'vendor-lucide';
          return 'vendor-misc';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
