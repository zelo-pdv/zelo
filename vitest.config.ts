import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    exclude: ['tests-e2e/**', 'node_modules/**', 'dist/**', '.idea/**', '.git/**', '.cache/**'],
  },
});
