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

async function selectCurrentLocation(pattern = /grim hex/i) {
  const value = await page.locator('#mission-start-location-list option').evaluateAll((options, source) => {
    const regex = new RegExp(source, 'i');
    return options.find((option) => regex.test(option.value))?.value ?? '';
  }, pattern.source);
  assert.ok(value, `No current-location suggestion matches ${pattern}`);
  await page.locator('#mission-start-location').fill(value);
  await page.locator('#mission-start-location').dispatchEvent('change');
  await page.locator('#mission-start-location-status[data-state="ready"]').waitFor({ state: 'visible' });
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
    .slice(0, 12));
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

async function inspectActiveWorkspaces(label) {
  for (const id of ['route', 'missions']) {
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

  step = 'verify empty Operations cockpit';
  assert.match(await page.locator('#current-stop-name').textContent(), /Generate a session/i);
  assert.equal(await page.locator('#complete-stop').isDisabled(), true);
  assert.equal(await page.locator('.tool-keys:not([hidden])').count(), 0);
  assert.equal(await page.locator('.ops-action-bar [data-ops-action]').count(), 5);
  assert.equal(await page.locator('[data-view-target="route-planner"]').count(), 0);
  assert.equal(await page.locator('[data-view-target="map"]').count(), 0);
  assert.equal(await page.locator('[data-view-target="hangar"]').count(), 0);
  assert.equal(await page.locator('[data-view-target="roadmap"]').count(), 0);
  await noHorizontalOverflow('Empty Operations desktop');
  await readableTypography('Empty Operations desktop');
  await page.screenshot({ path: `${output}/hardening-no-route-1664.png`, fullPage: true });

  step = 'generate long mission through visual review';
  await openWorkspace('missions');
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('[data-stage="input"]').click();
  await selectCurrentLocation();
  await page.locator('#mission-text').fill(longMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('[data-review-mission] [data-field="title"]').inputValue(), /Long-range medical consolidation/);
  const reviewedCargo = await page.locator('[data-review-mission] [data-field="cargo"]').evaluateAll((controls) => controls.map((control) => control.value));
  assert.ok(reviewedCargo.some((value) => /extremely_long_medical_supplies/.test(value)));
  assert.ok(await page.locator('.cargo-chip').count() >= 3);
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await noHorizontalOverflow('Long mission Review desktop');
  await readableTypography('Long mission Review desktop');
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  const stored = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.match(stored.missions[0].title, /Long-range medical consolidation/);
  assert.equal(stored.missions[0].cargoLots[0].commodity, 'extremely_long_medical_supplies');
  assert.equal(stored.routePlan.sessions.length, 1, 'A single mission must never be split across play sessions');
  await page.screenshot({ path: `${output}/hardening-long-missions-1664.png`, fullPage: true });

  step = 'verify integrated Operations tools';
  await page.locator('#focused-route-open').click();
  await page.locator('#ops-live-map .ops-map-node').first().waitFor({ state: 'visible' });
  assert.match(await page.locator('#route-stop-list').textContent(), /Checkmate Station|Levski/);
  assert.ok(await page.locator('#ops-live-map .ops-map-leg').count() >= 1);
  assert.ok(await page.locator('#ops-live-map .ops-map-gateway').count() >= 2);
  await page.locator('[data-ops-action="missions"]').click();
  await page.locator('.ops-editor-drawer').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.ops-manager-mission').count(), 1);
  await page.locator('#ops-editor-close').click();
  await page.locator('.ops-editor-drawer').waitFor({ state: 'hidden' });
  await page.locator('[data-ops-action="order"]').click();
  await page.locator('.ops-order-row').first().waitFor({ state: 'visible' });
  await page.locator('#ops-editor-close').click();
  await page.locator('[data-ops-action="cargo"]').click();
  await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
  assert.match(await page.locator('#ops-tool-title').textContent(), /Cargo/i);
  await page.locator('#ops-tool-expand').click();
  assert.equal(await page.locator('#ops-tool-panel').evaluate((element) => element.classList.contains('is-expanded')), true);
  await page.keyboard.press('Escape');
  await page.locator('#ops-tool-panel').waitFor({ state: 'hidden' });
  await noHorizontalOverflow('Integrated Operations desktop');
  await readableTypography('Integrated Operations desktop');
  await page.screenshot({ path: `${output}/hardening-operations-long-1664.png`, fullPage: true });

  step = 'complete route in Operations';
  let guard = 20;
  while (!(await page.locator('#complete-stop').isDisabled()) && guard > 0) {
    await page.locator('#complete-stop').click();
    guard -= 1;
  }
  assert.ok(guard > 0, 'Route completion exceeded safety limit');
  assert.match(await page.locator('#current-stop-name').textContent(), /complete/i);
  assert.match(await page.locator('#ops-next-leg-title').textContent(), /complete/i);
  await page.screenshot({ path: `${output}/hardening-route-complete-1664.png`, fullPage: true });

  step = 'verify simplified ship selector';
  assert.equal(await page.locator('#quick-ship-select').isVisible(), true);
  assert.ok(await page.locator('#quick-ship-select option').count() >= 7);
  assert.equal(await page.locator('#fleet-loadout-editor:visible').count(), 0);

  step = 'verify responsive active layouts';
  await page.setViewportSize({ width: 1366, height: 768 });
  await inspectActiveWorkspaces('1366x768');
  await page.setViewportSize({ width: 390, height: 844 });
  await inspectActiveWorkspaces('390x844');
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