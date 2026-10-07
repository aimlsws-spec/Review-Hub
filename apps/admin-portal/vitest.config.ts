import { defineConfig } from 'vitest/config'
import path from 'path'

// Vitest 4 runs on Vite 8, which transforms TS/JSX with oxc. @vitejs/plugin-react v4
// still injects the deprecated esbuild options, so tests configure the JSX runtime
// directly instead of loading the plugin (Fast Refresh is irrelevant under test).
export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
