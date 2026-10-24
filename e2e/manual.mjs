// Manuales: cada uno abre en los tres idiomas, sus figuras se dibujan, no se sale de la pantalla en el celular
// y pasa la revisión de accesibilidad. Uso: node e2e/manual.mjs [capturas]  (necesita `npm run build`)
import chromium from '@sparticuz/chromium';
import { chromium as pw } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const shots = process.argv[2] === 'capturas';
const PORT = 4191;
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
await sleep(2500);
const browser = await pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => !['--single-process', '--no-zygote'].includes(a)), headless: true });
const errors = [];
const IDS = (process.env.MANUALS ?? 'base,big,sea,guilds,combo,shires').split(',');
const log = (...a) => console.log('·', ...a);

async function open(hash, { lang = 'es', width = 1280, height = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700, deviceScaleFactor: 1 });
  await ctx.addInitScript((l) => localStorage.setItem('hexagonia.prefs', JSON.stringify({ name: 'Walter', lang: l, clientId: 'm', sound: false })), lang);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${hash} ${lang}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${hash} ${lang}: ${m.text()}`); });
  await page.goto(`http://localhost:${PORT}/${hash}`);
  await page.locator('main h1').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(300);
  return { ctx, page };
}

async function axe(page, name) {
  await page.addScriptTag({ path: axePath });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
  });
  const bad = res.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  assert.deepEqual(bad, [], `${name}: ${JSON.stringify(bad)}`);
}

try {
  // índice
  for (const lang of ['es', 'de', 'en']) {
    const { ctx, page } = await open('#/reglas', { lang });
    const books = await page.locator('.m-book').count();
    assert.equal(books, IDS.length, `${lang}: manuales en el estante`);
    if (lang === 'es') {
      await axe(page, 'índice');
      if (shots) await page.screenshot({ path: 'e2e/out/manual-indice.png', fullPage: true });
    }
    await ctx.close();
  }
  log('índice con', IDS.length, 'manuales en 3 idiomas');

  for (const id of IDS) {
    for (const lang of ['es', 'de', 'en']) {
      const { ctx, page } = await open(`#/reglas/${id}`, { lang });
      const sections = await page.locator('.m-section').count();
      const figs = await page.locator('.fig').count();
      const boards = await page.locator('.fig svg.board.still, .fig .fig-tiles, .fig .fig-track').count();
      assert.ok(sections > 0, `${id} ${lang}: secciones`);
      assert.equal(boards, figs, `${id} ${lang}: cada figura dibujada`);
      // las fichas de las figuras usan las definiciones de la página
      const missing = await page.evaluate(() => [...document.querySelectorAll('use')].filter((u) => !document.querySelector(u.getAttribute('href'))).length);
      assert.equal(missing, 0, `${id} ${lang}: dibujos sin definición`);
      if (lang === 'es') await axe(page, id);
      if (shots && lang === 'es') await page.screenshot({ path: `e2e/out/manual-${id}.png`, fullPage: true });
      await ctx.close();
    }
    // celular: nada más ancho que la pantalla
    const { ctx, page } = await open(`#/reglas/${id}`, { width: 360, height: 760 });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(wide <= 0, `${id}: se sale ${wide}px en el celular`);
    if (shots) await page.screenshot({ path: `e2e/out/manual-${id}-cel.png`, fullPage: true });
    // el índice de contenido lleva a la sección
    const links = await page.locator('.m-toc a').count();
    if (links > 1) {
      const last = page.locator('.m-toc a').nth(Math.floor(links / 2));
      const target = await last.innerText();
      await last.click();
      let top;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(150);
        top = await page.evaluate((txt) => [...document.querySelectorAll('.m-section h2')].find((h) => h.textContent === txt)?.getBoundingClientRect().top, target);
        if (top !== undefined && top < 300) break;
      }
      assert.ok(top !== undefined && top < 300, `${id}: el índice lleva a «${target}» (${top})`);
      assert.match(page.url(), new RegExp(`#/reglas/${id}$`));
    }
    await ctx.close();
    log(id, 'ok');
  }

  // desde una partida, el botón ? abre el manual de esa versión
  const { ctx, page } = await open('#/local');
  await page.getByText('Mar Abierto').first().click();
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await page.locator('svg.board').waitFor();
  const href = await page.locator('a.icon-btn[href^="#/reglas"]').getAttribute('href');
  assert.equal(href, '#/reglas/sea');
  await ctx.close();
  log('la partida enlaza su manual:', href);

  // impresión: sin barra ni índice
  const pr = await open('#/reglas/base');
  await pr.page.emulateMedia({ media: 'print' });
  const hidden = await pr.page.evaluate(() => ['.topbar', '.m-toc', '.m-actions'].map((s) => getComputedStyle(document.querySelector(s)).display));
  assert.deepEqual(hidden, ['none', 'none', 'none']);
  if (shots) await pr.page.pdf({ path: 'e2e/out/manual-base.pdf', format: 'A4', printBackground: true });
  await pr.ctx.close();
  log('impresión limpia');

  assert.deepEqual(errors, []);
  console.log('MANUALES OK');
} catch (e) {
  console.error('MANUALES FALLÓ:', e);
  console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  preview.kill();
  process.exit(process.exitCode ?? 0);
}

