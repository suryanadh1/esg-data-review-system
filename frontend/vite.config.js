import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js
// WHY: Tells Vite to use React plugin (JSX support).
// The proxy forwards /api requests from the dev server to Django,
// so we don't get CORS errors during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
