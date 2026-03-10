import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    sourcemap: false,
    // Split heavy vendors into separate chunks so the main bundle stays small
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-is', 'react-router-dom'],
          'charts':        ['recharts'],
          'emoji':         ['emoji-mart', '@emoji-mart/react', '@emoji-mart/data'],
          'db':            ['@instantdb/react'],
          'dates':         ['date-fns'],
        },
      },
    },
  },
  plugins: [react()],
})
