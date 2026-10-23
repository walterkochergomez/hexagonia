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
async function check(name, hash, save, before, { width = 1280, height = 820, room } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
  await ctx.addInitScript(([s, r]) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'walter', lang: 'es', clientId: r ? 'cid-walter' : 'x', sound: false }));
    if (s) localStorage.setItem('hexagonia.local', s);
    if (r) localStorage.setItem('hexagonia.host', r);
  }, [save, room]);
  const page = await ctx.newPage();
  // en las salas, un servidor de señalización inexistente: se ve también el aviso de conexión
  await page.goto(base + (room ? '?peer=127.0.0.1:9&botDelay=60000' : '') + hash);
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
// sala en línea en un celular (npx tsx scripts/make-rooms.ts)
const phone = { width: 393, height: 760 };
await check('sala en celular', '#/sala/AHWXVK', null, null, { ...phone, room: save('room-base3-main.json') });
await check('sala en celular: registro', '#/sala/AHWXVK', null, async (p) => { await p.locator('[data-act="log"]').click(); }, { ...phone, room: save('room-base3-main.json') });
await check('sala en celular: gremios y mar', '#/sala/AHWXVK', null, null, { ...phone, room: save('room-combo6-main.json') });
await browser.close();
process.exit(failed ? 1 : 0);
