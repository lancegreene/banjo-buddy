import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/banjo-buddy/',
  build: { chunkSizeWarningLimit: 2000 },
})
