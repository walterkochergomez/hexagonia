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
// teléfono en horizontal: el tablero a lo ancho, sin la columna del registro, la acción principal a la vista,
// la tarjeta de costos y la mano en la hoja de comercio
for (const lang of LANGS) {
  for (const [width, height] of [[844, 390], [740, 360], [667, 375]]) {
    for (const n of ['base3-main', 'guilds4-main', 'combo6-main']) {
      const name = `horizontal-${n}`;
      const where = `${name} ${lang} ${width}x${height}`;
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await ctx.addInitScript(([l, room]) => {
        localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'walter', lang: l, clientId: 'cid-walter', sound: true }));
        localStorage.setItem('hexagonia.host', room);
      }, [lang, JSON.stringify(rooms[n])]);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => pageErrors.push(`${where}: ${e.message}`));
      await page.goto(`http://localhost:${PORT}/?peer=127.0.0.1:9000&botDelay=60000#/sala/${CODE}`);
      await page.waitForTimeout(900);
      for (const f of await measure(page)) problems.push(`${where}: ${f}`);
      const geo = await page.evaluate(() => {
        const board = document.querySelector('.board-wrap')?.getBoundingClientRect();
        const rail = document.querySelector('.rail');
        const prim = document.querySelector('.actions .btn.primary')?.getBoundingClientRect();
        const chips = document.querySelectorAll('.players.compact .pcards').length;
        const bar = document.querySelector('.game > .topbar');
        const strip = document.querySelector('.strip')?.getBoundingClientRect();
        return {
          W: innerWidth, H: innerHeight, bw: board?.width ?? 0, bh: board?.height ?? 0, btop: board?.top ?? 0, rail: rail ? getComputedStyle(rail).display : 'none', prim: prim ? prim.bottom : null, chips,
          tb: bar?.getBoundingClientRect().height ?? 0, sh: strip?.height ?? 0, tbOver: bar ? bar.scrollWidth > bar.clientWidth + 1 : false,
        };
      });
      if (geo.rail !== 'none') problems.push(`${where}: el registro sigue en una columna`);
      if (geo.bw < geo.W * 0.6) problems.push(`${where}: tablero angosto (${Math.round(geo.bw)}px)`);
      // la barra de arriba comparte renglón con la tira de jugadores: el tablero empieza justo debajo y usa casi todo el alto
      if (geo.bh < geo.H * 0.82) problems.push(`${where}: tablero bajo (${Math.round(geo.bh)}px)`);
      if (geo.btop > geo.sh + 1) problems.push(`${where}: el tablero empieza en ${Math.round(geo.btop)}px, no bajo la tira`);
      if (Math.abs(geo.tb - geo.sh) > 1 || geo.tbOver) problems.push(`${where}: la barra de arriba no cabe junto a la tira (${Math.round(geo.tb)} vs ${Math.round(geo.sh)}px)`);
      if (geo.prim !== null && geo.prim > geo.H + 1) problems.push(`${where}: la acción principal queda fuera de la vista`);
      if (!geo.chips) problems.push(`${where}: no se ven las cartas de cada jugador`);
      if (SHOTS && lang === 'es') await page.screenshot({ path: `e2e/out/fit-${name}-${width}x${height}.png` });
      try {
        await page.locator('.cost-fab').click({ timeout: 2000 });
        await page.waitForTimeout(250);
        if (!(await page.locator('.cost-card').isVisible())) problems.push(`${where}: no se abrió la tarjeta de costos`);
        for (const f of await measure(page)) problems.push(`${where}/costos: ${f}`);
        await page.locator('.cost-head .icon-btn').click();
        await page.locator('[data-act="trade"]').click({ timeout: 2000 });
        await page.waitForTimeout(300);
        if ((await page.locator('.trade-hand .hand-card').count()) < 5) problems.push(`${where}: la hoja de comercio no muestra la mano`);
        for (const f of await measure(page)) problems.push(`${where}/comerciar: ${f}`);
      } catch (e) {
        problems.push(`${where}: no se pudo abrir (${String(e.message).split('\n')[0]})`);
      }
      await ctx.close();
    }
  }
}
// celular vertical: la tira de jugadores muestra cuántas cartas tiene cada uno
for (const width of [320, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((room) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'walter', lang: 'es', clientId: 'cid-walter', sound: true }));
    localStorage.setItem('hexagonia.host', room);
  }, JSON.stringify(rooms['guilds4-main']));
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/?peer=127.0.0.1:9000&botDelay=60000#/sala/${CODE}`);
  await page.waitForTimeout(900);
  const n = await page.locator('.players.compact .pcards').count();
  if (n !== rooms['guilds4-main'].lobby.seats.length) problems.push(`tira vertical ${width}: ${n} contadores de cartas`);
  await ctx.close();
}
// sin servidor de señalización: aparece el aviso de conexión en la barra superior
for (const lang of LANGS) {
  // también en horizontal, donde la barra va angosta en la columna derecha
  for (const [width, height] of [[320, 760], [393, 760], [740, 360]]) {
    const ctxUrl = `#/sala/${CODE}`;
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
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
