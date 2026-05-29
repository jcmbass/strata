/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const usePolling =
  process.env.CHOKIDAR_USEPOLLING === '1' || process.env.VITE_USE_POLLING === '1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: usePolling
      ? {
          usePolling: true,
          interval: 150,
        }
      : undefined,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    globals: true,
    css: false,
  },
})
