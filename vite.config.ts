import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Etiquetas para que el link se vea bien al compartirlo (WhatsApp, Telegram...). */
function shareTags(): Plugin {
  const site = process.env.SITE_URL;
  const image = site ? new URL('og.png', site.endsWith('/') ? site : `${site}/`).toString() : 'og.png';
  const desc = 'Juego de colonización y comercio en hexágonos para jugar en línea con amigos, sin cuentas ni servidor.';
  return {
    name: 'share-tags',
    transformIndexHtml(html) {
      const tags = [
        '<meta property="og:type" content="website" />',
        '<meta property="og:title" content="Hexagonia" />',
        `<meta property="og:description" content="${desc}" />`,
        `<meta property="og:image" content="${image}" />`,
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        '<meta name="twitter:card" content="summary_large_image" />',
      ];
      if (site) tags.push(`<meta property="og:url" content="${site}" />`);
      return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
    },
  };
}

// base relativo: funciona en https://<usuario>.github.io/<repo>/ sin importar el nombre del repo
export default defineConfig({
  base: './',
  plugins: [react(), shareTags()],
  build: { chunkSizeWarningLimit: 800 },
  define: {
    __BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
