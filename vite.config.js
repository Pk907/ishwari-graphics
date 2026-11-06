import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:8000', '/media': 'http://localhost:8000' } },
  build: {
    // libraries change rarely, so ship them in their own long-cached chunks
    rollupOptions: {
      output: {
        manualChunks: (id) => id.includes('node_modules') && (/gsap|motion|lenis/.test(id) ? 'motion' : 'vendor'),
      },
    },
  },
})
