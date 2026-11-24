import { defineConfig } from 'vitest/config';
import os from 'os';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 25000,
    // Las pruebas no deben escribir imágenes dentro del proyecto
    env: { MEDIA_DIR: path.join(os.tmpdir(), 'marchante-test-media') },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
