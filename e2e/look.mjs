// Capturas para revisar el aspecto del tablero. Uso: node e2e/look.mjs <sufijo>  (necesita `npm run build`)
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const tag = process.argv[2] ?? 'now';
const PORT = 4179;
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const errors = [];
const save = (f) => readFileSync(`e2e/out/${f}`, 'utf8');

async function shot(name, { width, height, hash = '#/local/juego', local = null, board = false, dpr = 2, before }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: width < 700, hasTouch: width < 700 });
  await ctx.addInitScript(([s]) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'look', sound: false }));
    if (s) localStorage.setItem('hexagonia.local', s);
  }, [local]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/?botDelay=600000${hash}`);
  await page.waitForTimeout(1300);
  if (before) await before(page);
  if (board) await page.locator('svg.board').screenshot({ path: `e2e/out/look-${name}-${tag}.png` });
  else await page.screenshot({ path: `e2e/out/look-${name}-${tag}.png` });
  await ctx.close();
}

await shot('base', { width: 1280, height: 820, local: save('save-base.json') });
await shot('base-board', { width: 1100, height: 900, local: save('save-base.json'), board: true });
await shot('phone', { width: 393, height: 760, local: save('save-base.json'), dpr: 3 });
await shot('combo', { width: 1280, height: 820, local: save('save-combo.json') });
await shot('sea', { width: 1280, height: 820, local: save('save-sea.json') });
await shot('home', { width: 1280, height: 820, hash: '#/' });
await shot('build', { width: 393, height: 760, local: save('save-base.json'), dpr: 2, before: async (p) => { await p.locator('[data-act="build"]').click(); await p.waitForTimeout(400); } });
await shot('over', { width: 1280, height: 820, local: save('scene-over.json') });
await browser.close();
preview.kill();
console.log(errors.length ? errors.join('\n') : 'sin errores');
process.exit(0);
