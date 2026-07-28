import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = path.resolve('ui-smoke-artifacts');
fs.mkdirSync(output, { recursive: true });

const systemChrome = process.platform === 'win32' && fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : undefined;
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? systemChrome });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(error.message));

async function ready(route = 'live', clear = false) {
  await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.SCCompanionUI && window.SCCompanionSession);
  if (clear) {
    await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SCCompanionUI && window.SCCompanionSession);
    if (route !== 'live') await page.locator(`.primary-nav [data-nav="${route}"]`).click();
  }
}

async function capture(name, options = {}) {
  if (options.viewport) await page.setViewportSize(options.viewport);
  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    minVisibleButtonHeight: Math.min(...[...document.querySelectorAll('button')]
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.getBoundingClientRect().height))
  }));
  assert.ok(metrics.documentWidth <= metrics.viewportWidth + 1, `${name} has horizontal document overflow`);
  if ((options.viewport?.width ?? page.viewportSize().width) <= 820) {
    assert.ok(metrics.minVisibleButtonHeight >= 42, `${name} has an undersized touch target`);
  }
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: options.fullPage ?? false });
}

async function acquire(text) {
  await page.locator('.primary-nav [data-nav="contracts"]').click();
  await page.locator('#contract-text').fill(text);
  await page.locator('[data-action="review-contracts"]').click();
}

async function buildFromText(text, targetMinutes = 60) {
  await acquire(text);
  await page.locator('[data-action="configure-route"]').click();
  await page.locator('[data-route-mode="sessions"]').click();
  await page.locator('#route-duration').fill(String(targetMinutes));
  await page.locator('[data-action="build-plan"]').click();
  await page.waitForSelector('[data-start-session]');
}

const sample = `Mission X
collect teasa 2scu etam
deliver area18 2scu etam

Mission Y
collect area18 1scu neon
collect teasa 2scu etam
deliver baijini 2scu etam 1scu neon`;

await ready('live', true);
assert.match(await page.locator('main').innerText(), /No active session/i);
await capture('live-empty-1600x900');

await page.locator('.primary-nav [data-nav="contracts"]').click();
await capture('contracts-input-1600x900');
await page.locator('[data-contract-source="ocr"]').click();
assert.match(await page.locator('main').innerText(), /Add contract screenshots/i);
await capture('contracts-ocr-1600x900');

await page.locator('[data-contract-source="text"]').click();
await page.locator('#contract-text').fill(`Broken freight
collect unknown nowhere 8scu etam
deliver area18 8scu etam`);
await page.locator('[data-action="review-contracts"]').click();
assert.match(await page.locator('main').innerText(), /Need attention/i);
assert.ok(await page.locator('.issue-list').count());
await capture('contracts-review-errors-1600x900');

await ready('contracts', true);
await acquire(sample);
assert.match(await page.locator('main').innerText(), /All mission objectives are valid/i);
await capture('contracts-review-valid-1600x900');
await page.locator('[data-action="configure-route"]').click();
await page.locator('[data-route-mode="sessions"]').click();
await page.locator('#route-duration').fill('5');
await page.locator('[data-action="build-plan"]').click();
await page.waitForSelector('[data-start-session]');
assert.ok(await page.locator('[data-session-row]').count() >= 2);
await capture('plan-multiple-sessions-1600x900');

await page.locator('[data-start-session="0"]').click();
assert.match(await page.locator('.command-panel').innerText(), /Pick up/i);
assert.ok(await page.locator('.cargo-cell.is-current').count() > 0);
await capture('live-pickup-1600x900');
await capture('live-cargo-partial-1700x900', { viewport: { width: 1700, height: 900 } });

await page.locator('[data-open-drawer="cargo"]').click();
assert.equal(await page.locator('.cargo-editor-grid .cargo-cell').count(), 24);
assert.match(await page.locator('.drawer').innerText(), /6 × 4 floor cells · 3 SCU per cell · 24 cells/i);
await capture('cargo-editor-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-close-drawer]').last().click();

await page.getByRole('button', { name: 'Full route' }).click();
assert.match(await page.locator('.drawer').innerText(), /Route & missions/i);
await capture('route-full-1600x900', { viewport: { width: 1600, height: 900 } });
await page.locator('[data-close-drawer]').last().click();

await page.locator('[data-action="complete-step"]').click();
assert.match(await page.locator('.command-panel').innerText(), /Travel/i);
await capture('live-travel-1366x768', { viewport: { width: 1366, height: 768 } });
const shortMetrics = await page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  viewport: document.documentElement.clientHeight
}));
assert.ok(shortMetrics.height <= shortMetrics.viewport + 1, 'common travel state must fit 1366×768');

await page.locator('[data-action="complete-step"]').click();
assert.match(await page.locator('.command-panel').innerText(), /cargo operation/i);
await capture('live-delivery-mixed-1664x800', { viewport: { width: 1664, height: 800 } });

await capture('live-tablet-768x1024', { viewport: { width: 768, height: 1024 } });
await capture('live-mobile-390x844', { viewport: { width: 390, height: 844 } });
const mobileOrder = await page.evaluate(() => ({
  action: document.querySelector('.command-panel').getBoundingClientRect().top,
  cargo: document.querySelector('.cargo-panel').getBoundingClientRect().top,
  fullGridVisible: document.querySelector('.cargo-panel .cargo-hold')?.offsetParent !== null
}));
assert.ok(mobileOrder.action < mobileOrder.cargo);
assert.equal(mobileOrder.fullGridVisible, false);

const nearlyFull = `Capacity run
collect teasa 69scu titanium
deliver area18 69scu titanium`;
await page.setViewportSize({ width: 1600, height: 900 });
await ready('contracts', true);
await buildFromText(nearlyFull, 120);
await page.locator('[data-start-session="0"]').click();
await page.locator('[data-action="complete-step"]').click();
assert.match(await page.locator('.mission-bar').innerText(), /69 SCU \/ 72/i);
await capture('live-cargo-nearly-full-1600x900', { viewport: { width: 1600, height: 900 } });

const interstellar = `Gateway relay
collect teasa 6scu titanium
deliver checkmate 6scu titanium`;
await ready('contracts', true);
await buildFromText(interstellar, 180);
await page.locator('[data-start-session="0"]').click();
const stepKinds = await page.evaluate(() => {
  const state = window.SCCompanionSession.getState();
  const route = window.SCCompanionOperationalSteps.derive(state.route, state);
  return route.steps.map((step) => step.kind);
});
assert.ok(stepKinds.includes('gateway-approach'));
assert.ok(stepKinds.includes('jump'));

async function showOperationalKind(kind, screenshotName) {
  await page.evaluate((requestedKind) => {
    const state = window.SCCompanionSession.getState();
    const progress = window.SCCompanionOperationalSteps.derive(state.route, state);
    const index = progress.steps.findIndex((step) => step.kind === requestedKind);
    const prior = progress.steps.slice(0, index);
    const actionSteps = prior.filter((step) => step.kind === 'action');
    window.SCCompanionSession.patch({
      operationalRouteKey: progress.routeKey,
      completedOperationalStepIds: prior.map((step) => step.id),
      completedStopIds: actionSteps.map((step) => step.stopId),
      currentStopIndex: actionSteps.length
    });
  }, kind);
  await page.waitForFunction((requestedKind) => {
    const state = window.SCCompanionSession.getState();
    return window.SCCompanionOperationalSteps.derive(state.route, state).currentStep?.kind === requestedKind;
  }, kind);
  await capture(screenshotName, { viewport: { width: 1600, height: 900 } });
}

await showOperationalKind('gateway-approach', 'live-gateway-approach-1600x900');
await showOperationalKind('jump', 'live-jump-1600x900');

await page.locator('.primary-nav [data-nav="fleet"]').click();
assert.match(await page.locator('main').innerText(), /Active configuration/i);
await capture('fleet-1600x900');

await page.locator('.primary-nav [data-nav="intel"]').click();
assert.match(await page.locator('main').innerText(), /Location registry/i);
await capture('intel-location-1600x900');
await page.locator('[data-intel-tab="map"]').click();
assert.ok(await page.locator('.starmap').count());
await capture('intel-starmap-1600x900');

await page.evaluate(() => window.SCCompanionUI.setIntelLocation('stanton-microtech-covalex-distribution-centre-s4dc05'));
await capture('intel-long-location-mobile-390x844', { viewport: { width: 390, height: 844 }, fullPage: true });

const many = Array.from({ length: 8 }, (_, index) => `Freight ${index + 1}
collect teasa ${index + 2}scu titanium
deliver area18 ${index + 2}scu titanium`).join('\n\n');
await ready('contracts', true);
await buildFromText(many, 5);
await capture('plan-many-missions-1700x900', { viewport: { width: 1700, height: 900 } });

assert.deepEqual(consoleErrors, [], `Browser console errors:\n${consoleErrors.join('\n')}`);
await browser.close();
console.log(`UI rebuild browser matrix passed. Screenshots: ${output}`);
