// Escenarios especiales de Mar Abierto en la interfaz: pueblo isleño, aldeas tejedoras, bastiones y grandes obras.
// Requiere `npm run build` y `npx tsx scripts/make-scenes.ts`.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 4197;
const shots = process.argv[2] === 'capturas';
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const errors = [];
const log = (...a) => console.log('·', ...a);
const prefs = () => localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'w', sound: false }));

async function scene(name, viewport = { width: 1280, height: 860 }, extra = {}) {
  const c = await browser.newContext({ viewport, ...extra });
  const save = readFileSync(`e2e/out/scene-${name}.json`, 'utf8');
  await c.addInitScript((sv) => {
    localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: 'es', clientId: 'w', sound: false }));
    localStorage.setItem('hexagonia.local', sv);
  }, save);
  const pg = await c.newPage();
  pg.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  // los bots esperan mucho: así la escena queda quieta mientras se prueba
  await pg.goto(`http://localhost:${PORT}/?botDelay=60000#/local/juego`);
  await pg.locator('svg.board').waitFor();
  await pg.waitForTimeout(500);
  return { c, pg };
}
const saved = (pg) => pg.evaluate(() => JSON.parse(localStorage.getItem('hexagonia.local')).game);

try {
  // ---- ajustes: los cuatro escenarios aparecen aparte y no se combinan con Gremios ----
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await c.addInitScript(prefs);
    const pg = await c.newPage();
    pg.on('pageerror', (e) => errors.push(e.message));
    await pg.goto(`http://localhost:${PORT}/#/local`);
    await pg.getByRole('heading', { name: 'Partida en este dispositivo' }).waitFor();
    await pg.locator('.toggle', { hasText: 'Mar Abierto' }).first().click();
    await pg.locator('.scenarios-sub', { hasText: 'Con reglas especiales' }).waitFor();
    for (const name of ['Pueblo isleño', 'Aldeas tejedoras', 'Bastiones corsarios', 'Grandes obras']) {
      assert.equal(await pg.locator('.scenario', { hasText: name }).count(), 1, name);
    }
    await pg.locator('.toggle', { hasText: 'Gremios y Guardianes' }).first().click();
    await pg.locator('.scenario', { hasText: 'Bastiones corsarios' }).click();
    const guilds = pg.locator('.toggle', { hasText: 'Gremios y Guardianes' }).first().locator('input');
    assert.equal(await guilds.isDisabled(), true, 'Gremios deshabilitado');
    assert.equal(await guilds.isChecked(), false, 'Gremios apagado');
    // empezar una partida de bastiones: cada uno ya tiene su puerto y su primer barco
    await pg.getByRole('button', { name: 'Empezar partida' }).click();
    await pg.locator('svg.board').waitFor();
    await pg.waitForTimeout(600);
    assert.ok(await pg.locator('.layer-marks .fort').count() >= 3, 'bastiones en el tablero');
    assert.equal(await pg.locator('.layer-loop .fleet-loop').count(), 1, 'recorrido de la flota');
    assert.equal(await pg.locator('.layer-tokens .fleet').count(), 1, 'la flota');
    assert.ok(await pg.locator('.layer-buildings > g').count() >= 3, 'poblados de salida');
    const href = await pg.locator('a.icon-btn[href^="#/reglas"]').getAttribute('href');
    assert.equal(href, '#/reglas/sea');
    await c.close();
    log('ajustes: escenarios especiales aparte, sin Gremios; bastiones arranca con puertos y flota');
  }

  // ---- pueblo isleño: un barco en el lado del regalo da un punto ----
  {
    const { c, pg } = await scene('tribe');
    const g0 = await saved(pg);
    const gifts = g0.tribe.gifts.length;
    assert.equal(await pg.locator('.layer-marks .gift').count(), gifts, 'regalos dibujados');
    assert.equal(await pg.locator('.layer-tribe .huts').count(), g0.tribe.hexes.length, 'chozas en las islitas');
    const target = g0.tribe.gifts.find((x) => x.kind === 'vp').edge;
    await pg.locator('[data-act="build"]').click();
    await pg.getByRole('button', { name: /Barco/ }).first().click();
    await pg.locator(`.layer-targets [data-edge="${target}"]`).click({ force: true });
    await pg.waitForTimeout(400);
    const g1 = await saved(pg);
    assert.equal(g1.tribe.gifts.length, gifts - 1, 'un regalo menos');
    assert.equal(g1.tribe.vp[0], 1, 'un punto de regalo');
    assert.equal(await pg.locator('.rail .player.me .tag', { hasText: 'Regalos +1' }).count(), 1, 'insignia de regalos');
    if (shots) await pg.screenshot({ path: 'e2e/out/seas-tribe.png' });
    await c.close();
    log('pueblo isleño: regalo tomado con un barco');
  }

  // ---- aldeas tejedoras: llegar a una aldea da una tela ----
  {
    const { c, pg } = await scene('looms');
    const g0 = await saved(pg);
    assert.equal(await pg.locator('.layer-marks .village').count(), g0.looms.villages.length, 'aldeas dibujadas');
    // el lado que lleva a la aldea lo deja anotado la escena
    const hint = JSON.parse(readFileSync('e2e/out/scene-looms.json', 'utf8')).hint;
    await pg.locator('[data-act="build"]').click();
    await pg.getByRole('button', { name: /Barco/ }).first().click();
    await pg.locator(`.layer-targets [data-edge="${hint}"]`).click({ force: true });
    await pg.waitForTimeout(400);
    const g2 = await saved(pg);
    assert.equal(g2.looms.cloth[0], 1, 'una tela');
    assert.ok(await pg.locator('.rail .player.me .pstats', { hasText: '1 tela' }).count() === 1, 'telas en la lista');
    if (shots) await pg.screenshot({ path: 'e2e/out/seas-looms.png' });
    await c.close();
    log('aldeas: llegar a una aldea da una tela');
  }

  // ---- bastiones: armar un barco y atacar el bastión ----
  {
    const { c, pg } = await scene('bastions');
    assert.equal(await pg.locator('[data-act="ship"]').count(), 0, 'sin mover barcos');
    const g0 = await saved(pg);
    const war0 = Object.values(g0.ships).filter((x) => x.owner === 0 && x.war).length;
    await pg.locator('[data-act="cards"]').click();
    const cards = pg.locator('.modal', { hasText: 'Tus cartas' });
    await cards.locator('.dev-card.d-soldier').getByRole('button', { name: 'Jugar' }).click();
    await pg.waitForTimeout(400);
    const g1 = await saved(pg);
    assert.equal(Object.values(g1.ships).filter((x) => x.owner === 0 && x.war).length, war0 + 1, 'un barco de guerra más');
    assert.ok(await pg.locator('.layer-routes .warship').count() >= war0 + 1, 'barcos de guerra dibujados');
    await pg.locator('[data-act="assault"]').click();
    const sheet = pg.locator('.modal', { hasText: 'Tiras un dado' });
    await sheet.waitFor();
    if (shots) await pg.screenshot({ path: 'e2e/out/seas-assault.png' });
    await sheet.getByRole('button', { name: 'Atacar el bastión' }).click();
    await pg.waitForTimeout(500);
    const g2 = await saved(pg);
    const fort = g2.bastions.forts.find((f) => f.seat === 0);
    const ships0 = Object.values(g1.ships).filter((x) => x.owner === 0).length;
    const ships2 = Object.values(g2.ships).filter((x) => x.owner === 0).length;
    assert.ok(fort.chips < 2 || ships2 < ships0, 'el ataque tuvo efecto');
    assert.notEqual(g2.turn.current, 0, 'el ataque terminó el turno');
    await c.close();
    log('bastiones: soldado arma un barco y el ataque cierra el turno');
  }

  // ---- grandes obras: empezar el observatorio con dos ciudades ----
  {
    const { c, pg } = await scene('works');
    assert.ok(await pg.locator('.layer-sites .site-disc').count() >= 4, 'estrecho y páramo marcados');
    await pg.locator('[data-act="works"]').click();
    const sheet = pg.locator('.modal', { hasText: 'Grandes obras' });
    await sheet.waitFor();
    assert.equal(await sheet.locator('.wonder-item').count(), 5);
    const lib = sheet.locator('.wonder-item[data-wonder="library"]');
    assert.equal(await lib.getByRole('button').count(), 0, 'la de otro no se toca');
    if (shots) await pg.screenshot({ path: 'e2e/out/seas-works.png' });
    await sheet.locator('.wonder-item[data-wonder="observatory"]').getByRole('button', { name: 'Empezar' }).click();
    await pg.waitForTimeout(400);
    const g1 = await saved(pg);
    const obs = g1.works.wonders.find((w) => w.id === 'observatory');
    assert.equal(obs.owner, 0);
    assert.equal(obs.level, 1);
    await sheet.locator('.wonder-item[data-wonder="observatory"]').getByRole('button', { name: 'Construir nivel 2' }).waitFor();
    await sheet.getByRole('button', { name: 'Cerrar' }).click();
    assert.equal(await pg.locator('.rail .player.me .tag', { hasText: 'Observatorio: nivel 1' }).count(), 1);
    await c.close();
    log('obras: empezar el observatorio y ver el nivel');
  }

  // ---- celular: entra en pantalla ----
  for (const name of ['tribe', 'bastions']) {
    const { c, pg } = await scene(name, { width: 360, height: 740 }, { isMobile: true, hasTouch: true });
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(wide <= 0, `${name}: se sale ${wide}px`);
    await c.close();
  }
  log('en el celular entra en pantalla');

  assert.deepEqual(errors, []);
  console.log('MAR ESPECIAL OK');
} catch (e) {
  console.error('MAR ESPECIAL FALLÓ:', e);
  console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  preview.kill();
  process.exit(process.exitCode ?? 0);
}
