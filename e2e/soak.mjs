// Partidas completas por la interfaz: una persona (este script) contra bots, en cada modo.
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { setTimeout as sleep } from 'node:timers/promises';

const base = 'http://localhost:4173/?botDelay=15';
const modes = (process.env.MODES ?? 'base,sea,guilds,combo').split(',');
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
let failures = 0;

async function agent(page) {
  // diálogos
  if (await page.locator('.overlay').count()) {
    const plus = page.locator('.overlay .step-btn:not([disabled])').filter({ hasText: '+' });
    for (let i = 0; i < 20 && (await page.locator('.overlay .pick-total:not(.ok)').count()) && (await plus.count()); i++) await plus.first().click();
    for (const sel of ['.overlay .modal-actions .btn.primary:not([disabled])', '.overlay .choice-list .btn:not([disabled])', '.overlay .card-grid .card-btn:not([disabled])', '.overlay .build-item:not([disabled])', '.overlay .card-list .btn.primary:not([disabled])']) {
      const b = page.locator(sel);
      if (await b.count()) { await b.first().click(); return 'dialog'; }
    }
    const sel = page.locator('.overlay select');
    if (await sel.count()) { await page.locator('.overlay .modal-actions .btn').first().click().catch(() => {}); }
    await page.locator('.overlay .modal-head .icon-btn').first().click().catch(() => {});
    return 'close';
  }
  const target = page.locator('.layer-targets .target');
  if (await target.count()) {
    const n = await target.count();
    await target.nth(Math.floor(Math.random() * n)).click({ force: true });
    return 'target';
  }
  const skip = page.getByRole('button', { name: 'Saltar', exact: true });
  if (await skip.count()) { await skip.first().click(); return 'skip'; }
  const cancel = page.getByRole('button', { name: 'Cancelar', exact: true });
  if (await cancel.count()) { await cancel.first().click(); return 'cancel'; }
  const incoming = page.locator('.incoming');
  if (await incoming.count()) {
    const btn = incoming.locator('.btn:not([disabled])');
    await btn.nth(Math.floor(Math.random() * Math.min(2, await btn.count()))).click();
    return 'reply';
  }
  const roll = page.getByRole('button', { name: 'Tirar los dados', exact: true });
  if (await roll.count()) { await roll.click(); return 'roll'; }
  const r = Math.random();
  if (r < 0.35 && (await page.getByRole('button', { name: 'Construir', exact: true }).count())) { await page.getByRole('button', { name: 'Construir', exact: true }).click(); return 'build'; }
  if (r < 0.45 && (await page.getByRole('button', { name: 'Cartas', exact: true }).count())) { await page.getByRole('button', { name: 'Cartas', exact: true }).click(); return 'cards'; }
  if (r < 0.5 && (await page.getByRole('button', { name: 'Mejoras', exact: true }).count())) { await page.getByRole('button', { name: 'Mejoras', exact: true }).click(); return 'guild'; }
  for (const label of ['Terminar turno', 'Pasar']) {
    const b = page.getByRole('button', { name: label, exact: true });
    if ((await b.count()) && (await b.isEnabled())) { await b.click(); return 'end'; }
  }
  return null;
}

for (const mode of modes) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Yo', lang: 'es', clientId: 'soak', sound: false })));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.goto(base + '#/local');
  if (mode === 'sea' || mode === 'combo') await page.getByText('Mar Abierto', { exact: true }).click();
  if (mode === 'guilds' || mode === 'combo') await page.getByText('Gremios y Guardianes', { exact: true }).click();
  if (mode === 'sea') await page.getByText('Mar de niebla', { exact: true }).click();
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await page.locator('svg.board').waitFor();
  const t0 = Date.now();
  let idle = 0;
  let over = false;
  const counts = {};
  while (Date.now() - t0 < Number(process.env.SOAK_MS ?? 240000)) {
    if (await page.getByText(/¡Ganaste!|gana!/).count()) { over = true; break; }
    const what = await agent(page).catch((e) => `err:${e.message.slice(0, 60)}`);
    counts[what] = (counts[what] ?? 0) + 1;
    if (!what) { idle++; await sleep(120); } else { idle = 0; await sleep(40); }
    if (idle > 400) { errors.push('sin progreso durante mucho tiempo'); break; }
  }
  const turn = await page.locator('.log-line').count();
  console.log(mode, over ? 'TERMINÓ' : 'en curso', 'acciones', JSON.stringify(counts), 'líneas', turn, errors.length ? `ERRORES: ${errors.slice(0, 3).join(' | ')}` : '');
  if (errors.length) failures++;
  await page.screenshot({ path: `e2e/out/soak-${mode}.png` });
  await ctx.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
