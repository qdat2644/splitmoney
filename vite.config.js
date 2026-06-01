import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
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
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/react-dom/') || normalized.includes('/react/')) return 'vendor-react';
          if (normalized.includes('/react-router') || normalized.includes('/react-router-dom')) return 'vendor-router';
          if (normalized.includes('/xlsx/')) return 'vendor-xlsx';
          if (normalized.includes('/recharts/') || normalized.includes('/d3-')) return 'vendor-charts';
          if (normalized.includes('/framer-motion/')) return 'vendor-motion';
          if (normalized.includes('/lucide-react/')) return 'vendor-icons';
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
