import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-audio',
      closeBundle() {
        cpSync('audio', 'dist/audio', { recursive: true })
      }
    }
  ],
  base: '/LucidOS/',
})
