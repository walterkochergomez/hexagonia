// Imagen para compartir el link (1200x630), a partir de la portada.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';

const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.addInitScript(() => localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: '', lang: 'es', clientId: 'og', sound: false })));
await page.goto('http://localhost:4173/#/');
await page.addStyleTag({ content: `
  .topbar, .home-panel { display: none !important; }
  .home-main { grid-template-columns: 1fr 1fr !important; height: 630px; max-width: none !important; padding: 40px 70px !important; gap: 30px !important; align-items: center; }
  .hero { display: contents; }
  .wordmark { font-size: 104px !important; align-self: end; grid-column: 1; }
  .tagline { grid-column: 1; align-self: start; font-size: 24px !important; max-width: 22ch !important; }
  .island-preview { grid-column: 2; grid-row: 1 / span 2; max-width: 520px !important; margin: 0 !important; }
  .rise { animation: none !important; }
` });
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
