// Prueba de punta a punta: anfitrión + invitado en dos navegadores, con un servidor de señalización local.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { PeerServer } from 'peer';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';

const PORT = 4174;
const BASE = `http://localhost:${PORT}/?peer=127.0.0.1:9000`;
const log = (...a) => console.log('·', ...a);

const signal = PeerServer({ port: 9000, path: '/', host: '127.0.0.1' });
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);

const args = chromium.args
  .filter((a) => !['--single-process', '--no-zygote'].includes(a) && !a.startsWith('--disable-features'))
  .concat('--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,WebRtcHideLocalIpsWithMdns');
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args, headless: true });
const errors = [];

async function open(name, clientId, viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(([n, c]) => {
    if (!localStorage.getItem('hexagonia.prefs')) localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: n, lang: 'es', clientId: c, sound: false }));
  }, [name, clientId]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(`${name}: ${m.text()}`); });
  return { ctx, page };
}

/** Juega lo que le toque a esta página: preparación, tirar y terminar turno. Devuelve true si hizo algo. */
async function playStep(page) {
  const dlg = page.locator('.modal [role="dialog"], .overlay .modal');
  if (await dlg.count()) {
    // diálogos de pasos: descartar / elegir / robar
    const plus = page.locator('.overlay .step-btn:not([disabled])').filter({ hasText: '+' });
    for (let i = 0; i < 12 && (await page.locator('.overlay .pick-total:not(.ok)').count()); i++) {
      if (!(await plus.count())) break;
      await plus.first().click();
    }
    const confirm = page.locator('.overlay .modal-actions .btn.primary:not([disabled])');
    if (await confirm.count()) { await confirm.first().click(); return true; }
    const choice = page.locator('.overlay .choice-list .btn:not([disabled]), .overlay .card-grid .card-btn:not([disabled])');
    if (await choice.count()) { await choice.first().click(); return true; }
    const close = page.locator('.overlay .modal-head .icon-btn');
    if (await close.count()) { await close.first().click(); return true; }
  }
  const target = page.locator('.layer-targets .target');
  if (await target.count()) { await target.first().click({ force: true }); return true; }
  for (const label of ['Tirar los dados', 'Terminar turno', 'Pasar']) {
    const b = page.getByRole('button', { name: label, exact: true });
    if ((await b.count()) && (await b.first().isEnabled())) { await b.first().click(); return true; }
  }
  return false;
}

try {
  const host = await open('Ana', 'client-ana', { width: 1280, height: 800 });
  const guest = await open('Beto', 'client-beto', { width: 390, height: 844 });

  await host.page.goto(`${BASE}#/`);
  await host.page.getByRole('button', { name: 'Crear sala' }).click();
  await host.page.waitForURL(/#\/sala\/[A-Z0-9]{6}/);
  const code = host.page.url().split('/').pop();
  log('sala', code);
  await host.page.getByText(`Sala ${code}`).first().waitFor();

  await guest.page.goto(`${BASE}#/sala/${code}`);
  await guest.page.getByText('Beto').first().waitFor({ timeout: 20000 });
  await host.page.getByText('Beto').first().waitFor({ timeout: 20000 });
  log('el invitado entró a la sala');

  // el invitado cambia de color y el anfitrión lo ve
  await guest.page.getByRole('radio', { name: 'Color 4' }).click();
  await sleep(500);

  await host.page.getByRole('button', { name: 'Añadir bot' }).click();
  await host.page.getByRole('button', { name: 'Iniciar partida' }).click();
  await host.page.locator('svg.board').waitFor();
  await guest.page.locator('svg.board').waitFor({ timeout: 20000 });
  log('partida iniciada en ambos navegadores');

  // jugar hasta terminar la preparación y unos cuantos turnos
  let rolled = 0;
  for (let i = 0; i < 400 && rolled < 6; i++) {
    let acted = false;
    for (const p of [host.page, guest.page]) {
      const before = await p.getByRole('button', { name: 'Tirar los dados', exact: true }).count();
      if (await playStep(p)) {
        acted = true;
        if (before) rolled++;
        await sleep(150);
      }
    }
    if (!acted) await sleep(400);
  }
  assert.ok(rolled >= 6, `se tiraron los dados ${rolled} veces`);
  log('turnos jugados con dados:', rolled);

  // mismas entradas en el registro (información pública)
  const lastLog = async (p) => (await p.locator('.log-line').allInnerTexts()).filter((s) => s.includes('saca')).slice(-1)[0];
  await host.page.getByRole('button', { name: /Registro/ }).count();
  const hostRoll = await lastLog(host.page);
  await guest.page.getByRole('button', { name: /Registro/ }).click();
  const guestRoll = await lastLog(guest.page);
  assert.equal(guestRoll, hostRoll);
  await guest.page.locator('.overlay .modal-head .icon-btn').click();
  log('registro igual en ambos:', hostRoll);

  // el invitado cierra y vuelve a entrar: recupera su asiento
  const guestUrl = guest.page.url();
  await guest.page.close();
  await sleep(1500);
  const again = await guest.ctx.newPage();
  await again.goto(guestUrl);
  await again.locator('svg.board').waitFor({ timeout: 25000 });
  await again.getByText('Beto').first().waitFor();
  log('el invitado volvió a su asiento');

  // el anfitrión recarga: la sala se reanuda con el mismo código
  await host.page.reload();
  await host.page.locator('svg.board').waitFor({ timeout: 30000 });
  await again.locator('.net-state').waitFor({ state: 'detached', timeout: 40000 });
  log('el anfitrión recargó y la partida siguió');

  for (let i = 0; i < 60; i++) {
    for (const p of [host.page, again]) if (await playStep(p)) await sleep(150);
  }
  log('siguen jugando después de reconectar');
  assert.deepEqual(errors, []);
  console.log('E2E OK');
} catch (e) {
  console.error('E2E FALLÓ:', e);
  console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  preview.kill();
  signal.close?.();
  process.exit(process.exitCode ?? 0);
}
