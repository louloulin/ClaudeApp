import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/tests/setup.js'],
    include: ['server/tests/**/*.test.js', 'src/tests/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.js'],
      exclude: [
        'server/tests/**',
        'server/database/auth.db',
        'node_modules/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './server')
    }
  }
});
