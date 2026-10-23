import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo: funciona en https://<usuario>.github.io/<repo>/ sin importar el nombre del repo
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 800 },
  define: {
    __BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
