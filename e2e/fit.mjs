// Revisa que nada se salga del ancho de la pantalla en celulares, en los tres idiomas.
// Requiere `npm run build` y `npx tsx scripts/make-rooms.ts`. Uso: node e2e/fit.mjs [--shots]
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { PeerServer } from 'peer';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4176;
const SHOTS = process.argv.includes('--shots');
const WIDTHS = (process.env.FIT_WIDTHS ?? '320,360,375,393,430,768').split(',').map(Number);
const LANGS = ['es', 'de', 'en'];
const CODE = 'AHWXVK';
const HOST_ID = 'cid-walter';

const signal = PeerServer({ port: 9000, path: '/', host: '127.0.0.1' });
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });

const rooms = Object.fromEntries(['base3-main', 'base3-preroll', 'guilds4-main', 'combo6-main'].map((n) => [n, JSON.parse(readFileSync(`e2e/out/room-${n}.json`, 'utf8'))]));
const lobbyRoom = {
  ...rooms['combo6-main'],
  game: null,
  lobby: { ...rooms['combo6-main'].lobby, status: 'lobby', settings: { ...rooms['combo6-main'].lobby.settings } },
};
const localSave = (r) => JSON.stringify({ seats: r.lobby.seats.map((s) => ({ name: s.name, color: s.color, bot: !!s.bot })), game: r.game });

const problems = [];
const pageErrors = [];

/** Mide desbordes: página más ancha que la pantalla, controles fuera de la vista y textos cortados. */
async function measure(page) {
  return page.evaluate(() => {
    const out = [];
    const W = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    if (sw > W + 1) out.push(`página ${sw}px > ${W}px`);
    const scrollsX = (el) => {
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && a.scrollWidth > a.clientWidth) return true;
      }
      return false;
    };
    const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 28);
    for (const el of document.querySelectorAll('button, a[href], select, input, [role="radio"]')) {
      if (el.closest('svg') || !el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.position === 'absolute' && el.classList.contains('sr')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.left < -1 || r.right > W + 1) && !scrollsX(el)) out.push(`fuera: «${label(el)}» ${Math.round(r.left)}–${Math.round(r.right)}`);
      if (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1) out.push(`texto cortado: «${label(el)}» ${el.scrollWidth}>${el.clientWidth}`);
    }
    return out;
  });
}

async function visit(name, { width, lang, url, init, after }) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(([l, inits]) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'walter', lang: l, clientId: 'cid-walter', sound: true }));
    for (const [k, v] of inits) localStorage.setItem(k, v);
  }, [lang, Object.entries(init ?? {})]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${name}: ${e.message}`));
  await page.goto(`http://localhost:${PORT}/?peer=127.0.0.1:9000&botDelay=60000${url}`);
  await page.waitForTimeout(900);
  const views = [['', page]];
  const found = await measure(page);
  for (const f of found) problems.push(`${name} ${lang} ${width}: ${f}`);
  if (SHOTS && (width === 393 || width === 360)) await page.screenshot({ path: `e2e/out/fit-${name}-${lang}-${width}.png` });
  if (after) {
    for (const [sub, act] of after) {
      try {
        if ((await act(page)) === 'skip') continue;
        await page.waitForTimeout(350);
        for (const f of await measure(page)) problems.push(`${name}/${sub} ${lang} ${width}: ${f}`);
        if (SHOTS && width === 360) await page.screenshot({ path: `e2e/out/fit-${name}-${sub}-${lang}-${width}.png` });
        await page.keyboard.press('Escape');
        const close = page.locator('.modal-head .icon-btn');
        if (await close.count()) await close.first().click();
        await page.waitForTimeout(150);
      } catch (e) {
        problems.push(`${name}/${sub} ${lang} ${width}: no se pudo abrir (${String(e.message).split('\n')[0]})`);
      }
    }
  }
  void views;
  await ctx.close();
}

const sheets = [
  ['construir', (p) => p.locator('[data-act="build"]').click({ timeout: 2000 })],
  ['comerciar', (p) => p.locator('[data-act="trade"]').click({ timeout: 2000 })],
  ['cartas', (p) => p.locator('[data-act="cards"]').click({ timeout: 2000 })],
  // en pantallas anchas el registro está en la columna derecha, sin botón
  ['registro', async (p) => ((await p.locator('[data-act="log"]').isVisible()) ? p.locator('[data-act="log"]').click({ timeout: 2000 }) : 'skip')],
];

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    for (const [n, r] of Object.entries(rooms)) {
      await visit(`sala-${n}`, { width, lang, url: `#/sala/${CODE}`, init: { 'hexagonia.host': JSON.stringify(r) }, after: n === 'base3-main' ? sheets : n === 'guilds4-main' ? [['mejoras', (p) => p.locator('[data-act="guild"]').click({ timeout: 2000 })]] : undefined });
    }
    await visit('local', { width, lang, url: '#/local/juego', init: { 'hexagonia.local': localSave(rooms['base3-main']) } });
    await visit('portada', { width, lang, url: '#/' });
    await visit('espera', { width, lang, url: `#/sala/${CODE}`, init: { 'hexagonia.host': JSON.stringify(lobbyRoom) } });
    await visit('reglas', { width, lang, url: '#/reglas' });
  }
}
// sin servidor de señalización: aparece el aviso de conexión en la barra superior
for (const lang of LANGS) {
  for (const width of [320, 393]) {
    const ctxUrl = `#/sala/${CODE}`;
    const ctx = await browser.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(([l, room]) => {
      localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'walter', lang: l, clientId: 'cid-walter', sound: true }));
      localStorage.setItem('hexagonia.host', room);
    }, [lang, JSON.stringify(rooms['base3-main'])]);
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/?peer=127.0.0.1:9&botDelay=60000${ctxUrl}`);
    await page.waitForTimeout(2500);
    const hasChip = await page.locator('.net-state').count();
    for (const f of await measure(page)) problems.push(`sin-red ${lang} ${width}: ${f}`);
    if (!hasChip) problems.push(`sin-red ${lang} ${width}: no apareció el aviso de conexión (no se probó)`);
    if (SHOTS) await page.screenshot({ path: `e2e/out/fit-sin-red-${lang}-${width}.png` });
    await ctx.close();
  }
}

await browser.close();
preview.kill();
signal.close?.();
console.log(problems.length ? `${problems.length} problemas:\n` + problems.join('\n') : 'todo cabe en pantalla');
if (pageErrors.length) console.log('errores de página:\n' + pageErrors.join('\n'));
process.exit(problems.length || pageErrors.length ? 1 : 0);
