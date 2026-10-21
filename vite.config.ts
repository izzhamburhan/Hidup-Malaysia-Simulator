import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base so the build works on GitHub Pages or any static host.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
