// Capturas de pantalla con Chromium headless (para revisar el diseño).
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { readFileSync } from 'node:fs';

const base = process.env.BASE ?? 'http://localhost:4173/';
const out = 'e2e/out';
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const errors = [];

async function shot(name, { width, height, hash = '', save = null, prefs = { name: 'Walter', lang: 'es', clientId: 'shot-client', sound: false }, before = null }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([p, s]) => {
    localStorage.setItem('hexagonia.prefs', p);
    if (s) localStorage.setItem('hexagonia.local', s);
  }, [JSON.stringify(prefs), save]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await page.goto(base + hash);
  await page.waitForTimeout(900);
  if (before) await before(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  await ctx.close();
}

const save = (f) => readFileSync(`${out}/${f}`, 'utf8');
await shot('home-desktop', { width: 1440, height: 900 });
await shot('home-mobile', { width: 390, height: 844 });
await shot('local-setup', { width: 1280, height: 900, hash: '#/local' });
await shot('game-base-desktop', { width: 1440, height: 900, hash: '#/local/juego', save: save('save-base.json') });
await shot('game-base-mobile', { width: 390, height: 844, hash: '#/local/juego', save: save('save-base.json') });
await shot('game-combo-desktop', { width: 1440, height: 900, hash: '#/local/juego', save: save('save-combo.json') });
await shot('game-sea-desktop', { width: 1440, height: 900, hash: '#/local/juego', save: save('save-sea.json') });
await shot('game-build-menu', { width: 1440, height: 900, hash: '#/local/juego', save: save('save-base.json'), before: async (p) => { await p.getByRole('button', { name: 'Construir' }).click(); await p.waitForTimeout(300); } });
await shot('rules', { width: 1280, height: 900, hash: '#/reglas' });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'sin errores de consola');
