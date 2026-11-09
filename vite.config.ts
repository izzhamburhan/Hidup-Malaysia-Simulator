import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CONTENT_SECURITY_POLICY } from './csp';

// Adds the Content Security Policy as a meta tag in production builds only (see csp.ts).
const cspMeta = {
  name: 'csp-meta',
  apply: 'build' as const,
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' as const },
  ],
};

// Relative base so the build works on GitHub Pages or any static host.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  plugins: [react(), tailwindcss(), cspMeta],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});