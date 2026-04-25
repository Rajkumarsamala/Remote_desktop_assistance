import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/ws': {
        target: 'wss://remote-view-signaling.onrender.com',
        ws: true,
      },
      '/create-session': {
        target: 'https://remote-view-signaling.onrender.com',
        changeOrigin: true,
      },
      '/health': {
        target: 'https://remote-view-signaling.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
