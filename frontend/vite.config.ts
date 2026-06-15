import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'react-vendor'
          }

          if (id.includes('react-router-dom') || id.includes('@remix-run')) {
            return 'router-vendor'
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor'
          }

          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('cmdk') ||
            id.includes('vaul') ||
            id.includes('sonner') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('clsx')
          ) {
            return 'ui-vendor'
          }

          if (
            id.includes('recharts') ||
            id.includes('framer-motion') ||
            id.includes('embla-carousel') ||
            id.includes('date-fns')
          ) {
            return 'feature-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
