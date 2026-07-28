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
let failure = null;

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

async function assertDesktopCockpit(label) {
  const metrics = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    };
    return {
      viewportHeight: innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
      topbar: box('.ops40-topbar'),
      sessions: box('.ops40-session-strip'),
      main: box('.ops40-main'),
      cargo: box('.ops40-cargo-panel'),
      current: box('.ops40-step-panel'),
      timeline: box('.ops40-timeline-panel'),
      dock: box('.ops40-dock'),
      cargoGrid: box('.ops40-cargo-grid'),
      stop: box('.ops40-stop')
    };
  });
  Object.entries(metrics).filter(([key]) => !key.endsWith('Height')).forEach(([key, value]) => assert.ok(value, `${label}: missing ${key}`));
  assert.ok(metrics.documentHeight <= metrics.viewportHeight + 2, `${label}: document exceeds viewport ${JSON.stringify(metrics)}`);
  assert.ok(metrics.bodyHeight <= metrics.viewportHeight + 2, `${label}: body exceeds viewport ${JSON.stringify(metrics)}`);
  assert.ok(metrics.topbar.bottom <= metrics.sessions.top + 10, `${label}: topbar/session order is wrong`);
  assert.ok(metrics.sessions.bottom <= metrics.main.top + 10, `${label}: sessions/main order is wrong`);
  assert.ok(metrics.cargo.width > metrics.current.width, `${label}: cargo is not dominant`);
  assert.ok(metrics.cargo.height >= 430 && metrics.current.height >= 430, `${label}: main instruments are too short`);
  assert.ok(metrics.cargoGrid.height >= 300, `${label}: cargo grid is clipped`);
  assert.ok(metrics.main.bottom <= metrics.timeline.top + 10, `${label}: timeline order is wrong`);
  assert.ok(metrics.timeline.bottom <= metrics.dock.top + 10, `${label}: dock order is wrong`);
  assert.ok(metrics.stop.width >= 210, `${label}: timeline card is too narrow`);
}

async function visibleTextFloor(label, minimum = 10.5) {
  const small = await page.evaluate((floor) => [...document.querySelectorAll('.app-frame *')]
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const directText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return directText && style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    })
    .map((element) => ({ text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), size: Number.parseFloat(getComputedStyle(element).fontSize) }))
    .filter((item) => item.size < floor), minimum);
  assert.deepEqual(small, [], `${label}: text below ${minimum}px ${JSON.stringify(small)}`);
}

try {
  step = 'load empty Operations 0.40';
  await page.goto(`${baseUrl}/#route`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.operations-page.ops40-page').waitFor({ state: 'visible' });
  await page.locator('link[data-operations-v040-style="0.40.0"]').waitFor({ state: 'attached' });
  assert.match(await page.locator('#ops40-step-title').textContent(), /Generate a session/i);
  assert.equal(await page.locator('#ops40-complete').isDisabled(), true);
  assert.equal(await page.locator('.ops40-dock [data-ops40-action]').count(), 5);
  assert.equal(await page.locator('.ops-live-navigation, .ops-live-map').count(), 0);
  assert.equal(await page.locator('[data-view-target="route-planner"], [data-view-target="map"], [data-view-target="hangar"], [data-view-target="roadmap"]').count(), 0);
  await noHorizontalOverflow('Empty Operations desktop');
  await visibleTextFloor('Empty Operations desktop');
  await page.screenshot({ path: `${output}/operations-v040-empty-1664.png`, fullPage: false });

  step = 'generate long mission through visual review';
  await openWorkspace('missions');
  await page.locator('[data-stage="input"]').click();
  await page.locator('#mission-text').fill(longMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  await selectCurrentLocation();
  assert.match(await page.locator('[data-review-mission] .mission-card-identity strong').textContent(), /Long-range medical consolidation/);
  assert.ok((await page.locator('[data-review-mission] .mission-cargo-chips').allTextContents()).some((value) => /extremely_long_medical_supplies/.test(value)));
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  const stored = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.match(stored.missions[0].title, /Long-range medical consolidation/);
  assert.equal(stored.missions[0].cargoLots[0].commodity, 'extremely_long_medical_supplies');
  assert.equal(stored.routePlan.sessions.length, 1, 'A single mission must never be split across sessions');

  step = 'verify rebuilt Operations controls';
  await page.locator('#focused-route-open').click();
  await page.locator('.ops40-cargo-cell').first().waitFor({ state: 'visible' });
  assert.match(await page.locator('.ops40-timeline').textContent(), /Checkmate Station|Levski/);
  const routeKinds = await page.evaluate(() => {
    const state = window.SCCompanionSession.getState();
    const route = window.SCCompanionRouteCorrections.deriveRoute(state.route, state.routeCorrections);
    return window.SCCompanionOperationalSteps.derive(route, state).steps.map((item) => item.kind);
  });
  assert.ok(routeKinds.includes('gateway-approach'));
  assert.ok(routeKinds.includes('jump'));
  assert.ok(routeKinds.includes('travel'));
  assert.ok(routeKinds.includes('action'));

  await page.locator('[data-ops40-action="missions"]').click();
  await page.locator('#ops40-drawer').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#ops40-drawer-body .ops40-drawer-row').count(), 1);
  await page.locator('#ops40-drawer-close').click();
  await page.locator('#ops40-drawer').waitFor({ state: 'hidden' });

  await page.locator('[data-ops40-action="order"]').click();
  await page.locator('#ops40-drawer-body .ops40-drawer-row').first().waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#ops40-drawer').waitFor({ state: 'hidden' });

  step = 'verify one-viewport desktop sizes';
  await page.setViewportSize({ width: 1700, height: 900 });
  await assertDesktopCockpit('1700x900 Operations');
  await noHorizontalOverflow('1700x900 Operations');
  await visibleTextFloor('1700x900 Operations');
  await page.screenshot({ path: `${output}/operations-v040-1700x900.png`, fullPage: false });

  await page.setViewportSize({ width: 1366, height: 768 });
  await assertDesktopCockpit('1366x768 Operations');
  await noHorizontalOverflow('1366x768 Operations');
  await visibleTextFloor('1366x768 Operations');
  await page.screenshot({ path: `${output}/operations-v040-1366x768.png`, fullPage: false });

  step = 'complete route in Operations';
  let guard = 50;
  while (!(await page.locator('#ops40-complete').isDisabled()) && guard > 0) {
    await page.locator('#ops40-complete').click();
    guard -= 1;
  }
  assert.ok(guard > 0, 'Route completion exceeded safety limit');
  assert.match(await page.locator('#ops40-step-title').textContent(), /complete/i);
  assert.match(await page.locator('#ops40-next').textContent(), /remaining|complete/i);

  step = 'verify ship selector and mobile flow';
  assert.ok(await page.locator('#ops40-ship-select option').count() >= 7);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.ops40-cargo-panel').waitFor({ state: 'visible' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight));
  await noHorizontalOverflow('390x844 Operations');
  await page.screenshot({ path: `${output}/operations-v040-390.png`, fullPage: true });

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
console.log('Operations UI 0.40 hardening passed.');
