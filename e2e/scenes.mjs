import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { readFileSync } from 'node:fs';

const base = 'http://localhost:4173/';
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const errors = [];
async function scene(name, { width = 1280, height = 820, lang = 'es', before } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const save = readFileSync(`e2e/out/scene-${name}.json`, 'utf8');
  await ctx.addInitScript(([s, l]) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: l, clientId: 'x', sound: false }));
    localStorage.setItem('hexagonia.local', s);
  }, [save, lang]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await page.goto(base + '#/local/juego');
  await page.waitForTimeout(700);
  if (before) await before(page);
  await page.screenshot({ path: `e2e/out/s-${name}${lang !== 'es' ? '-' + lang : ''}.png` });
  await ctx.close();
}
await scene('discard', { before: async (p) => { for (let i = 0; i < 4; i++) await p.locator('.overlay .step-btn:not([disabled])').filter({ hasText: '+' }).first().click(); } });
await scene('robber');
await scene('setup', { width: 390, height: 844 });
await scene('cards', { before: async (p) => { await p.getByRole('button', { name: 'Cartas', exact: true }).click(); } });
await scene('cards', { lang: 'de', before: async (p) => { await p.getByRole('button', { name: 'Karten', exact: true }).click(); } });
await scene('guilds', { before: async (p) => { await p.getByRole('button', { name: 'Mejoras', exact: true }).click(); } });
await scene('guilds', { lang: 'en', before: async (p) => { await p.getByRole('button', { name: 'Trade', exact: true }).click(); await p.getByRole('radio', { name: 'With the bank' }).click(); } });
await scene('over');
await scene('pass', { width: 390, height: 844 });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'sin errores');
