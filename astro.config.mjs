// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Páginas públicas: HTML estático (SEO + vista previa en WhatsApp).
// Panel del profesional (/panel): isla React, PWA.
export default defineConfig({
  site: 'https://lohagoyo.cl',
  output: 'static',
  build: { format: 'directory' },
  integrations: [react()],
});
