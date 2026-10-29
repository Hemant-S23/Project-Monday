import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        engines: resolve(import.meta.dirname, 'pages/engines.html'),
        markets: resolve(import.meta.dirname, 'pages/markets.html'),
        pricing: resolve(import.meta.dirname, 'pages/pricing.html'),
        learn: resolve(import.meta.dirname, 'pages/learn.html'),
        about: resolve(import.meta.dirname, 'pages/about.html'),
        legal: resolve(import.meta.dirname, 'pages/legal.html'),
        auth: resolve(import.meta.dirname, 'pages/auth.html'),
        terminal: resolve(import.meta.dirname, 'terminal.html'),
        gallery: resolve(import.meta.dirname, 'components-gallery.html'),
        styleguide: resolve(import.meta.dirname, 'style-guide.html')
      }
    }
  }
});
