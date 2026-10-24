// Prueba de las animaciones: dados, casillas que producen, cartas que viajan, piezas que caen, aviso de turno
// y que con «reducir movimiento» no aparezca nada de eso. Requiere `npm run build` y `npx tsx scripts/make-rooms.ts`.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';

const PORT = 4186;
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const room = JSON.parse(readFileSync('e2e/out/room-base3-preroll.json', 'utf8'));
room.game.players[0].hand = { lumber: 4, brick: 4, wool: 2, grain: 2, ore: 3, paper: 0, cloth: 0, coin: 0 };
const local = JSON.stringify({ seats: room.lobby.seats.map((s) => ({ name: s.name, color: s.color, bot: !!s.bot })), game: room.game });
const log = (...a) => console.log('·', ...a);
const errors = [];

async function open(reduced) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 760 }, isMobile: true, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((s) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'walter', lang: 'es', clientId: 'a', sound: false }));
    localStorage.setItem('hexagonia.local', s);
  }, local);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${PORT}/?botDelay=700#/local/juego`);
  await page.locator('svg.board').waitFor();
  await page.waitForTimeout(900);
  return { ctx, page };
}
async function openScene(file, view = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const save = readFileSync(`e2e/out/${file}`, 'utf8');
  await ctx.addInitScript(([s, v]) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'x', sound: false, ...v }));
    localStorage.setItem('hexagonia.local', s);
  }, [save, view]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/?botDelay=600000#/local/juego`);
  await page.locator('svg.board').waitFor();
  await page.waitForTimeout(700);
  return { ctx, page };
}
/** Empieza a anotar las animaciones que aparecen (antes de la acción) y luego espera la que se busca. */
const recordAnims = (page) => page.evaluate(() => {
  window.__seen = new Set();
  clearInterval(window.__rec);
  window.__rec = setInterval(() => { for (const a of document.getAnimations()) window.__seen.add(a.animationName || (a.effect?.target?.closest?.('.layer-tokens') ? 'hop' : 'waapi')); }, 20);
});
async function sawAnims(page, names, timeout = 8000) {
  const t0 = Date.now();
  for (;;) {
    const seen = await page.evaluate(() => [...window.__seen]);
    if (names.every((n) => seen.includes(n)) || Date.now() - t0 > timeout) return seen;
    await page.waitForTimeout(100);
  }
}
const animNames = (page) => page.evaluate(() => [...new Set(document.getAnimations().map((a) => a.animationName ?? (a.effect?.target?.className?.baseVal ?? a.effect?.target?.className ?? 'waapi')))]);

try {
  // ---- movimiento normal ----
  const { ctx, page } = await open(false);
  await page.locator('[data-act="roll"]').click();
  await page.locator('.dice-roll').waitFor({ timeout: 1500 });
  const early = await animNames(page);
  assert.ok(early.includes('tumble-a') && early.includes('tumble-b'), `dados rodando: ${early}`);
  await page.locator('.roll-sum').waitFor({ timeout: 2000 });
  const sum = Number(await page.locator('.roll-sum').innerText());
  log('dados ruedan y muestran la suma', sum);
  const produced = await page.evaluate(() => document.querySelectorAll('.log-line').length);
  if (sum !== 7) {
    await page.waitForTimeout(500);
    const lit = await page.locator('.hex.lit').count();
    assert.ok(lit > 0, 'se encienden las casillas del número');
    log('casillas encendidas:', lit);
  }
  // cartas en vuelo (si alguien cobró)
  const flights = await page.evaluate(() => new Promise((ok) => {
    let max = 0;
    const id = setInterval(() => { max = Math.max(max, document.querySelectorAll('.fx-card').length); }, 40);
    setTimeout(() => { clearInterval(id); ok(max); }, 1600);
  }));
  log('cartas en vuelo (máximo a la vez):', flights, produced >= 0 ? '' : '');
  await page.locator('.dice-roll').waitFor({ state: 'detached', timeout: 4000 });
  log('el overlay de dados se va solo');

  // camino nuevo: se dibuja
  await page.locator('[data-act="build"]').click();
  await page.getByRole('button', { name: /Camino/ }).first().click();
  await page.locator('.layer-targets .target-edge').first().click();
  await page.locator('.fresh-road').waitFor({ timeout: 1500 });
  const roadAnims = await animNames(page);
  assert.ok(roadAnims.includes('road-draw'), `camino animado: ${roadAnims}`);
  log('el camino se dibuja');
  await page.locator('.fresh-road').waitFor({ state: 'detached', timeout: 3000 });

  // terminar turno: aviso grande con el nombre del siguiente
  await page.locator('[data-act="end"]').click();
  await page.locator('.turn-banner').waitFor({ timeout: 2500 });
  const bannerText = await page.locator('.turn-banner').innerText();
  assert.match(bannerText, /Lenga|Coihue/);
  log('aviso de turno:', bannerText.trim());
  // los bots tiran: vuelven a aparecer los dados
  await page.locator('.dice-roll').waitFor({ timeout: 6000 });
  log('el bot tira y se ven sus dados');
  // poblado de un bot o nuestro: esperar alguna pieza que caiga en los próximos turnos (opcional)
  await ctx.close();

  // poblado en la preparación: cae en su lugar con polvo
  const setup = await openScene('scene-setup.json');
  await recordAnims(setup.page);
  await setup.page.locator('.layer-targets .target-vertex').first().click({ force: true });
  const dropAnims = await sawAnims(setup.page, ['piece-drop', 'dust']);
  assert.ok(dropAnims.includes('piece-drop') && dropAnims.includes('dust'), `poblado animado: ${dropAnims}`);
  log('el poblado cae con polvo');
  await setup.ctx.close();

  // ladrón: salta a su nueva casilla
  const rob = await openScene('scene-robber.json');
  const robberAt = () => rob.page.evaluate(() => document.querySelector('.layer-tokens > g')?.getAttribute('transform'));
  const before = await robberAt();
  await recordAnims(rob.page);
  await rob.page.locator('.layer-targets .target-hex').first().click({ force: true });
  const robAnims = await sawAnims(rob.page, ['hop']);
  log('ladrón', before, '→', await robberAt());
  assert.ok(robAnims.includes('hop'), `el ladrón salta: ${robAnims}`);
  log('el ladrón salta a su casilla');
  await rob.ctx.close();

  // tablero girado e inclinado: se sigue pudiendo elegir dónde construir
  const tilted = await openScene('scene-setup.json', { boardRot: 2, boardTilt: true });
  const builtBefore = await tilted.page.locator('.layer-buildings > g').count();
  await tilted.page.locator('.layer-targets .target-vertex').nth(3).click();
  await tilted.page.locator('.layer-targets .target-edge').first().waitFor({ state: 'attached', timeout: 3000 });
  assert.equal(await tilted.page.locator('.layer-buildings > g').count(), builtBefore + 1, 'poblado puesto con la vista inclinada');
  await tilted.page.locator('[aria-label="Girar tablero"]').click();
  await tilted.page.locator('[aria-label="Ver desde arriba"]').click();
  await tilted.page.locator('.layer-targets .target-edge').first().click();
  await tilted.page.waitForTimeout(400);
  assert.equal(await tilted.page.locator('.layer-routes .road').count() > 0, true, 'camino puesto tras girar y aplanar');
  log('con el tablero girado e inclinado se puede construir');
  await tilted.ctx.close();

  // ---- movimiento reducido ----
  const r = await open(true);
  await r.page.locator('[data-act="roll"]').click();
  await r.page.waitForTimeout(700);
  assert.equal(await r.page.locator('.dice-roll').count(), 0, 'sin dados en el centro');
  assert.equal(await r.page.locator('.fx-card').count(), 0, 'sin cartas en vuelo');
  assert.ok(await r.page.locator('.status-bar .dice').count(), 'los dados se ven en la barra');
  log('con «reducir movimiento» no hay animaciones y los dados quedan en la barra');
  await r.ctx.close();

  assert.deepEqual(errors, []);
  console.log('FX OK');
} catch (e) {
  console.error('FX FALLÓ:', e);
  console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  preview.kill();
  process.exit(process.exitCode ?? 0);
}
