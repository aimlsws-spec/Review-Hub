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
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Uploaded files (campaign covers, avatars) are served by the backend beside the API.
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
