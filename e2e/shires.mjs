// Comarcas en la interfaz: variantes (muelles, sucesos, duelo) en una partida local contra un bot.
// Requiere `npm run build` y `npx tsx scripts/make-scenes.ts`.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 4195;
const shots = process.argv[2] === 'capturas';
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const errors = [];
const log = (...a) => console.log('·', ...a);

async function newGame(page, toggles, players = 2) {
  await page.goto(`http://localhost:${PORT}/?botDelay=150#/local`);
  await page.getByRole('heading', { name: 'Partida en este dispositivo' }).waitFor();
  while ((await page.locator('.seat').count()) > players) await page.locator('.seat').last().getByRole('button', { name: 'Quitar' }).click();
  for (const label of toggles) await page.locator('.toggle', { hasText: label }).first().click();
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await page.locator('svg.board').waitFor();
}

/** Resuelve lo que pida el turno propio con clics simples hasta que se pueda terminar o tirar. */
async function settle(page) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(250);
    const dlg = page.locator('.modal[role="dialog"]');
    if (await dlg.count()) {
      const confirm = dlg.getByRole('button', { name: 'Confirmar' });
      if (await confirm.count()) {
        // elegir lo necesario: tocar «+» hasta que se habilite confirmar
        for (let k = 0; k < 12 && (await confirm.isDisabled()); k++) {
          const plus = dlg.locator('.step-btn:not([disabled])', { hasText: '+' }).first();
          if (await plus.count()) await plus.click();
          const radio = dlg.locator('[role="radio"]').first();
          if (await radio.count() && (await confirm.isDisabled())) await radio.click();
        }
        await confirm.click();
        continue;
      }
      await dlg.locator('.choice-list button, .card-grid button').first().click();
      continue;
    }
    const target = page.locator('.layer-targets .target-vertex, .layer-targets .target-edge, .layer-targets .target-hex').first();
    if (await target.count()) {
      await target.click({ force: true });
      continue;
    }
    return;
  }
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'w', sound: false })));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await newGame(page, ['Señor de los muelles', 'Mazo de sucesos', 'Duelo']);
  assert.equal(await page.locator('.rail .player.neutral').count(), 2, 'dos neutrales en la lista');
  assert.equal(await page.locator('.layer-buildings > g').count() >= 4, true, 'los neutrales ya tienen poblados');
  log('duelo: dos neutrales con sus poblados');
  const href = await page.locator('a.icon-btn[href^="#/reglas"]').getAttribute('href');
  assert.equal(href, '#/reglas/shires');

  // preparación: dos poblados con camino (el bot hace lo suyo)
  for (let r = 0; r < 2; r++) {
    await page.locator('.layer-targets .target-vertex').first().waitFor({ timeout: 8000 });
    await page.locator('.layer-targets .target-vertex').first().click({ force: true });
    await page.locator('.layer-targets .target-edge').first().waitFor({ timeout: 5000 });
    await page.locator('.layer-targets .target-edge').first().click({ force: true });
  }
  await page.locator('[data-act="roll"]').waitFor({ timeout: 10000 });
  log('preparación hecha');

  // tirar: salen cartas en vez de dados, dos por turno
  await page.locator('[data-act="roll"]').click();
  await page.locator('.dice-roll.cards').waitFor({ timeout: 3000 });
  if (shots) await page.screenshot({ path: 'e2e/out/shires-cards.png' });
  await settle(page);
  await page.locator('[data-act="end"]').waitFor({ timeout: 8000 });
  await page.waitForTimeout(2600);
  const cards = await page.locator('.status-bar .chron-card').count();
  assert.equal(cards, 2, `dos cartas en la barra (${cards})`);
  log('sucesos: dos cartas por turno en el duelo');

  // fichas de comercio
  await page.locator('[data-act="tokens"]').click();
  const sheet = page.locator('.modal', { hasText: 'Fichas de comercio' });
  await sheet.waitFor();
  assert.equal(await sheet.locator('.build-item').count(), 3);
  if (shots) await page.screenshot({ path: 'e2e/out/shires-tokens.png' });
  await sheet.getByRole('button', { name: 'Cerrar' }).click();
  log('fichas: hoja con las tres acciones');

  // construir un camino: después hay que construir otro para un neutral
  // (con la partida cerrada, para que no vuelva a guardar encima)
  await page.goto(`http://localhost:${PORT}/#/`);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('hexagonia.local'));
    const g = saved.game;
    g.players[0].hand = { lumber: 3, brick: 3, wool: 1, grain: 1, ore: 0, paper: 0, cloth: 0, coin: 0 };
    for (const r of Object.values(g.roads)) delete r.broken;
    g.steps = [];
    g.turn.phase = 'main';
    g.turn.current = 0;
    localStorage.setItem('hexagonia.local', JSON.stringify(saved));
  });
  await page.goto(`http://localhost:${PORT}/?botDelay=150#/local/juego`);
  await page.locator('[data-act="build"]').click();
  await page.getByRole('button', { name: /Camino/ }).first().click();
  await page.locator('.layer-targets .target-edge').first().click({ force: true });
  await page.locator('.status-text', { hasText: 'para un neutral' }).waitFor({ timeout: 3000 });
  const before = await page.locator('.layer-routes .road').count();
  await page.locator('.layer-targets .target-edge').first().click({ force: true });
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.layer-routes .road').count(), before + 1, 'camino neutral puesto');
  log('al construir un camino se construye otro para un neutral');
  if (shots) await page.screenshot({ path: 'e2e/out/shires-duel.png' });
  await ctx.close();

  // ---- escenarios (escenas armadas con el motor: npx tsx scripts/make-scenes.ts) ----
  const scene = async (name) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const save = readFileSync(`e2e/out/scene-${name}.json`, 'utf8');
    await c.addInitScript((sv) => {
      localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'w', sound: false }));
      localStorage.setItem('hexagonia.local', sv);
    }, save);
    const pg = await c.newPage();
    pg.on('pageerror', (e) => errors.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await pg.goto(`http://localhost:${PORT}/?botDelay=150#/local/juego`);
    await pg.locator('svg.board').waitFor();
    await pg.waitForTimeout(500);
    return { c, pg };
  };
  const handCount = (pg) => pg.evaluate(() => [...document.querySelectorAll('.dock .hand-cards .n, .dock .card-count')].length);
  void handCount;

  // pesca: gastar 4 peces en un recurso del banco
  {
    const { c, pg } = await scene('fishers');
    assert.equal(await pg.locator('.layer-fish .ground').count(), 6, 'seis caladeros');
    assert.equal(await pg.locator('.layer-fish .lake-numbers').count(), 1, 'el lago');
    const before = await pg.evaluate(() => JSON.parse(localStorage.getItem('hexagonia.local')).game.players[0].hand);
    await pg.locator('[data-act="fish"]').click();
    const sheet = pg.locator('.modal', { hasText: 'Fichas de pescado' });
    await sheet.getByRole('button', { name: /Recurso del banco/ }).click();
    const dlg = pg.locator('.modal', { hasText: 'Pesca: elige un recurso.' });
    await dlg.locator('.step-btn', { hasText: '+' }).first().click();
    await dlg.getByRole('button', { name: 'Confirmar' }).click();
    await pg.waitForTimeout(400);
    const after = await pg.evaluate(() => JSON.parse(localStorage.getItem('hexagonia.local')).game.players[0]);
    const sum = (h) => Object.values(h).reduce((a, b) => a + b, 0);
    assert.equal(sum(after.hand), sum(before) + 1, 'un recurso más');
    assert.equal(after.fish.reduce((a, b) => a + b, 0), 3, 'quedan 3 peces');
    if (shots) await pg.screenshot({ path: 'e2e/out/shires-fishers.png' });
    await c.close();
    log('pesca: caladeros, lago y gasto de fichas');
  }

  // ríos: construir un puente da 3 monedas
  {
    const { c, pg } = await scene('rivers');
    assert.equal(await pg.locator('.layer-rivers .river').count(), 2, 'dos ríos');
    await pg.locator('[data-act="build"]').click();
    await pg.getByRole('button', { name: /Puente/ }).click();
    await pg.locator('.layer-targets .target-edge').first().click({ force: true });
    await pg.locator('.layer-routes .bridge').first().waitFor({ timeout: 3000 });
    const coins = await pg.evaluate(() => JSON.parse(localStorage.getItem('hexagonia.local')).game.river.coins[0]);
    assert.ok(coins >= 3, `monedas ${coins}`);
    await pg.locator('[data-act="coins"]').click();
    await pg.locator('.modal', { hasText: 'Monedas' }).waitFor();
    if (shots) await pg.screenshot({ path: 'e2e/out/shires-rivers.png' });
    await c.close();
    log('ríos: puente y monedas');
  }

  // camellos: votación al empezar el turno y camello nuevo
  {
    const { c, pg } = await scene('caravans');
    const camelsBefore = await pg.locator('.layer-routes .camel').count();
    const dlg = pg.locator('.modal', { hasText: 'Votación de camellos' });
    await dlg.waitFor({ timeout: 3000 });
    await dlg.locator('.step-btn', { hasText: '+' }).first().click();
    await dlg.getByRole('button', { name: 'Pujar 1' }).click();
    // si ganamos, toca elegir dónde va; si no, lo pone un bot
    for (let i = 0; i < 40 && (await pg.locator('.layer-routes .camel').count()) === camelsBefore; i++) {
      const t = pg.locator('.layer-targets .target-edge').first();
      if (await t.count()) await t.click({ force: true });
      await pg.waitForTimeout(200);
    }
    assert.equal(await pg.locator('.layer-routes .camel').count(), camelsBefore + 1, 'un camello más');
    const left = await pg.evaluate(() => JSON.parse(localStorage.getItem('hexagonia.local')).game.steps.length);
    assert.equal(left, 0, 'la votación terminó');
    if (shots) await pg.screenshot({ path: 'e2e/out/shires-caravans.png' });
    await c.close();
    log('camellos: votación y camello nuevo');
  }

  // celular: la partida de duelo entra en pantalla
  const phone = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  await phone.addInitScript(() => localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'w', sound: false })));
  const p2 = await phone.newPage();
  await newGame(p2, ['Mazo de sucesos', 'Duelo']);
  const wide = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(wide <= 0, `se sale ${wide}px`);
  await phone.close();
  log('en el celular entra en pantalla');

  assert.deepEqual(errors, []);
  console.log('COMARCAS OK');
} catch (e) {
  console.error('COMARCAS FALLÓ:', e);
  console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  preview.kill();
  process.exit(process.exitCode ?? 0);
}
