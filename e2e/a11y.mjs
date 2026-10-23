// Revisión de accesibilidad con axe-core en las pantallas principales.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const base = 'http://localhost:4173/';
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
let failed = 0;
async function check(name, hash, save, before) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(([s]) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'x', sound: false }));
    if (s) localStorage.setItem('hexagonia.local', s);
  }, [save]);
  const page = await ctx.newPage();
  await page.goto(base + hash);
  await page.waitForTimeout(1200);
  if (before) await before(page);
  await page.addScriptTag({ path: axePath });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
  });
  const bad = res.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  failed += bad.length;
  console.log(name, bad.length ? JSON.stringify(bad, null, 1) : 'ok', res.length - bad.length ? `(${res.length - bad.length} menores: ${res.filter((v) => !bad.includes(v)).map((v) => v.id).join(', ')})` : '');
  await ctx.close();
}
const save = (f) => readFileSync(`e2e/out/${f}`, 'utf8');
await check('inicio', '#/');
await check('reglas', '#/reglas');
await check('partida local (ajustes)', '#/local');
await check('partida', '#/local/juego', save('save-base.json'));
await check('partida gremios', '#/local/juego', save('save-combo.json'));
await check('construir', '#/local/juego', save('save-base.json'), async (p) => { await p.getByRole('button', { name: 'Construir' }).click(); });
await check('descartar', '#/local/juego', save('scene-discard.json'));
await browser.close();
process.exit(failed ? 1 : 0);
