import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const longMissionText = `Mission: Long-range medical consolidation for a deliberately verbose operational contract
collect teasa 8scu extremely_long_medical_supplies
collect checkmate station pyro 5scu extremely_long_medical_supplies
deliver levski nyx 13scu extremely_long_medical_supplies`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1664, height: 936 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function openWorkspace(id) {
  step = `open workspace ${id}`;
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert.ok(metrics.documentWidth <= metrics.viewport + 2, `${label}: document overflow ${JSON.stringify(metrics)}`);
  assert.ok(metrics.bodyWidth <= metrics.viewport + 2, `${label}: body overflow ${JSON.stringify(metrics)}`);
}

async function readableTypography(label) {
  const result = await page.evaluate(() => [...document.querySelectorAll('.app-frame *')]
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const directText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return directText && style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0 && !element.classList.contains('sr-only');
    })
    .map((element) => ({ text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), size: Number.parseFloat(getComputedStyle(element).fontSize) }))
    .sort((left, right) => left.size - right.size)
    .slice(0, 10));
  assert.ok(result.every((item) => item.size >= 11.5), `${label}: text below 11.5px ${JSON.stringify(result)}`);
}

async function minimumTouchTargets(label) {
  const undersized = await page.evaluate(() => [...document.querySelectorAll('button, select, input:not([type="hidden"])')]
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0 && !element.disabled;
    })
    .map((element) => ({ text: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 40), height: element.getBoundingClientRect().height }))
    .filter((item) => item.height < 43));
  assert.deepEqual(undersized, [], `${label}: undersized controls ${JSON.stringify(undersized)}`);
}

async function exerciseTool(toolId) {
  step = `exercise ${toolId} tool`;
  const trigger = page.locator(`[data-ops-tool="${toolId}"]`);
  await trigger.click();
  const panel = page.locator('#ops-tool-panel');
  await panel.waitFor({ state: 'visible' });
  await noHorizontalOverflow(`${toolId} open`);
  await page.locator('#ops-tool-expand').click();
  assert.equal(await panel.evaluate((element) => element.classList.contains('is-expanded')), true);
  assert.equal(await panel.getAttribute('role'), 'dialog');
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2, `${toolId}: expanded panel escapes viewport`);
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
}

async function inspectWorkspaces(label) {
  for (const id of ['route', 'missions', 'route-planner', 'map', 'hangar', 'roadmap']) {
    await openWorkspace(id);
    await noHorizontalOverflow(`${label} ${id}`);
    await readableTypography(`${label} ${id}`);
  }
}

let failure = null;
try {
  step = 'load application';
  await page.goto(`${baseUrl}/#route`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('sc-companion-session-v1');
    localStorage.removeItem('sc-companion-nav-collapsed');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#sidebar-toggle').waitFor({ state: 'visible' });

  step = 'verify empty Operations';
  assert.match(await page.locator('#current-stop-name').textContent(), /Generate a session/i);
  assert.equal(await page.locator('#complete-stop').isDisabled(), true);
  await noHorizontalOverflow('Empty Operations desktop');
  await readableTypography('Empty Operations desktop');
  await page.screenshot({ path: `${output}/hardening-no-route-1664.png`, fullPage: true });

  step = 'verify keyboard tool opening';
  await page.keyboard.press('F1');
  await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#ops-tool-panel').waitFor({ state: 'hidden' });

  step = 'generate long mission through focused flow';
  await openWorkspace('missions');
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('[data-stage="input"]').click();
  await page.locator('#mission-text').fill(longMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 / 1' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#focused-review-single').textContent(), /Long-range medical consolidation/);
  assert.match(await page.locator('#focused-review-single').textContent(), /extremely_long_medical_supplies/);
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await noHorizontalOverflow('Long mission Review desktop');
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  const stored = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.match(stored.missions[0].title, /Long-range medical consolidation/);
  assert.equal(stored.missions[0].cargoLots[0].commodity, 'extremely_long_medical_supplies');
  await page.screenshot({ path: `${output}/hardening-long-missions-1664.png`, fullPage: true });

  step = 'verify Operations tools';
  await openWorkspace('route');
  assert.match(await page.locator('#route-stop-list').textContent(), /Checkmate Station|Levski/);
  for (const toolId of ['moves', 'cargo', 'adjust', 'route']) await exerciseTool(toolId);
  await page.screenshot({ path: `${output}/hardening-operations-long-1664.png`, fullPage: true });

  step = 'verify Starmap interaction';
  await openWorkspace('map');
  await page.locator('#starmap-canvas .map-node').first().waitFor({ state: 'visible' });
  const initialViewBox = await page.locator('#starmap-canvas').getAttribute('viewBox');
  await page.locator('[data-map-action="zoom-in"]').click();
  assert.notEqual(await page.locator('#starmap-canvas').getAttribute('viewBox'), initialViewBox);
  await page.locator('[data-map-mode="network"]').click();
  await page.locator('#starmap-canvas [data-map-key="pyro"]').click();
  await page.locator('#starmap-open-system').click();
  assert.equal(await page.locator('#starmap-system-select').inputValue(), 'pyro');
  await noHorizontalOverflow('Starmap desktop');
  await page.screenshot({ path: `${output}/hardening-starmap-v2-active-1664.png`, fullPage: true });

  step = 'complete route in Operations';
  await openWorkspace('route');
  let guard = 20;
  while (!(await page.locator('#complete-stop').isDisabled()) && guard > 0) {
    await page.locator('#complete-stop').click();
    guard -= 1;
  }
  assert.ok(guard > 0, 'Route completion exceeded safety limit');
  assert.match(await page.locator('#current-stop-name').textContent(), /complete/i);
  await page.screenshot({ path: `${output}/hardening-route-complete-1664.png`, fullPage: true });

  step = 'verify Fleet editing';
  await openWorkspace('hangar');
  await page.locator('#hangar-model').selectOption('drake-cutlass-black');
  await page.locator('#hangar-nickname').fill('Cutlass Black — Long-range recovery and hauling configuration');
  await page.locator('#hangar-quantum').fill('XL-1 test configuration');
  await page.locator('#hangar-factor').fill('0.82');
  await page.locator('#hangar-form button[type="submit"]').click();
  await page.locator('#fleet-count').filter({ hasText: '2' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#fleet-selected-name').textContent(), /Cutlass Black/);
  await noHorizontalOverflow('Fleet desktop');
  await page.screenshot({ path: `${output}/hardening-fleet-multiple-1664.png`, fullPage: true });

  step = 'verify responsive layouts';
  await page.setViewportSize({ width: 1366, height: 768 });
  await inspectWorkspaces('1366x768');
  await page.setViewportSize({ width: 390, height: 844 });
  await inspectWorkspaces('390x844');
  await openWorkspace('missions');
  await page.locator('[data-stage="input"]').click();
  await minimumTouchTargets('390x844 Missions');
  await page.screenshot({ path: `${output}/hardening-missions-390.png`, fullPage: true });
  await openWorkspace('route');
  await minimumTouchTargets('390x844 Operations');
  await page.screenshot({ path: `${output}/hardening-operations-390.png`, fullPage: true });

  step = 'verify reduced motion';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page.locator('#sidebar-toggle').evaluate((element) => getComputedStyle(element).transitionDuration);
  assert.ok(['0s', '0.00001s'].includes(duration), `Reduced motion transition remains active: ${duration}`);

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/hardening-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/hardening-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;