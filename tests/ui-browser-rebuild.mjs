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

let navigationSequence = 0;

async function ready(route = 'live', clear = false) {
  const navigate = () => page.goto(
    `${baseUrl}/?smoke=${navigationSequence += 1}#${route}`,
    { waitUntil: 'domcontentloaded' }
  );
  await navigate();
  if (clear) {
    await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
    await navigate();
  }
  await page.waitForFunction(() => window.SCCompanionUI && window.SCCompanionSession);
  if (clear && route !== 'live') await page.locator(`.primary-nav [data-nav="${route}"]`).click();
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

async function assertCargoSquaresAndUnits(expectedOccupancies = []) {
  const gridSelector = await page.locator('.cargo-editor-grid:visible').count()
    ? '.cargo-editor-grid:visible'
    : '.cargo-panel .cargo-grid:visible';
  const cells = page.locator(`${gridSelector} .cargo-cell`);
  assert.equal(await cells.count(), 24, 'Corsair cargo grid must expose 24 floor coordinates');
  const ratios = await cells.evaluateAll((items) => items.map((item) => {
    const bounds = item.getBoundingClientRect();
    return bounds.width / bounds.height;
  }));
  assert.ok(ratios.every((ratio) => Math.abs(1 - ratio) < 0.04), 'every cargo coordinate must be square');
  for (const occupancy of expectedOccupancies) {
    const occupied = page.locator(`${gridSelector} .cargo-cell[data-occupancy="${occupancy}"]`).first();
    assert.ok(await occupied.count(), `${occupancy} SCU coordinate is missing`);
    assert.equal(
      await occupied.locator('.scu-unit.is-used').count(),
      occupancy,
      `${occupancy} SCU must render ${occupancy} distinct units`
    );
  }
  const overflow = await page.locator(gridSelector).evaluate((grid) => {
    const bounds = grid.getBoundingClientRect();
    return bounds.right > document.documentElement.clientWidth + 1 || grid.scrollWidth > grid.clientWidth + 1;
  });
  assert.equal(overflow, false, 'cargo grid must not overflow horizontally');
}

async function assertLocationStrip() {
  const strip = page.locator('.command-panel .location-status-strip');
  assert.equal(await strip.count(), 1, 'active step must expose one location status strip');
  for (const service of ['risk', 'hangars', 'refuel', 'repair', 'food', 'medical', 'cargo-services', 'security']) {
    const item = strip.locator(`[data-service="${service}"]`);
    assert.equal(await item.count(), 1, `${service} status is missing`);
    assert.ok(await item.getAttribute('aria-label'), `${service} needs an aria-label`);
    assert.ok(await item.getAttribute('data-tooltip'), `${service} needs a keyboard tooltip`);
  }
  return strip;
}

async function acquire(text) {
  await page.locator('.primary-nav [data-nav="contracts"]').click();
  await page.locator('#contract-text').fill(text);
  await page.locator('[data-action="review-contracts"]').click();
}

async function buildFromText(text, targetMinutes = 60) {
  await acquire(text);
  await page.locator('[data-action="configure-route"]').click();
  await page.locator('[data-play-mode="sessions"]').click();
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
assert.equal(await page.locator('.location-status-strip').count(), 0);
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

const occupancySample = `One SCU
collect teasa 1scu laranite
deliver area18 1scu laranite

Two SCU
collect teasa 2scu etam
deliver baijini 2scu etam

Three SCU
collect teasa 3scu titanium
deliver port tressler 3scu titanium`;
await ready('contracts', true);
await buildFromText(occupancySample, 180);
assert.ok(await page.locator('.candidate-card').count() >= 2, 'multi-stop plan must expose distinct route candidates');
await page.locator('.candidate-card').nth(1).click();
assert.equal(await page.locator('.candidate-card').nth(1).getAttribute('aria-pressed'), 'true');
await capture('plan-distinct-candidates-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-start-session="0"]').click();
await assertCargoSquaresAndUnits([1, 2, 3]);
assert.ok(await page.locator('.cargo-cell.is-current').count() > 0, 'pickup cells must be highlighted');
assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().cargoLayoutGroupingMode ?? 'destination'), 'destination');
await page.locator('[data-action="toggle-grouping"]').click();
assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().cargoLayoutGroupingMode), 'mission');
assert.ok(await page.locator('.cargo-cell.is-current').count() > 0, 'mission grouping must preserve pickup highlight');
await page.locator('[data-action="toggle-grouping"]').click();
await capture('live-cargo-units-1-2-3-1700x900', { viewport: { width: 1700, height: 900 } });

await page.locator('[data-open-drawer="cargo"]').click();
await page.locator('[data-editor-mode="reserve"]').click();
await page.locator('.cargo-editor-grid .cargo-cell:not(.is-filled):not(.is-reserved):not(.is-keep-empty)').first().click();
await page.locator('[data-editor-mode="empty"]').click();
await page.locator('.cargo-editor-grid .cargo-cell:not(.is-filled):not(.is-reserved):not(.is-keep-empty)').first().click();
assert.equal(await page.locator('.cargo-editor-grid .cargo-cell.is-reserved').count(), 1);
assert.equal(await page.locator('.cargo-editor-grid .cargo-cell.is-keep-empty').count(), 1);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.SCCompanionUI && window.SCCompanionSession);
await page.locator('[data-open-drawer="cargo"]').click();
assert.equal(await page.locator('.cargo-editor-grid .cargo-cell.is-reserved').count(), 1, 'reserved cell must persist after reload');
assert.equal(await page.locator('.cargo-editor-grid .cargo-cell.is-keep-empty').count(), 1, 'keep-empty cell must persist after reload');
await assertCargoSquaresAndUnits([1, 2, 3]);
await capture('cargo-editor-overrides-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-close-drawer]').last().click();

await ready('contracts', true);
await acquire(sample);
assert.match(await page.locator('main').innerText(), /All mission objectives are valid/i);
await capture('contracts-review-valid-1600x900');
await page.locator('[data-action="configure-route"]').click();
await page.locator('[data-play-mode="sessions"]').click();
assert.equal(await page.locator('[data-play-mode="sessions"]').getAttribute('aria-pressed'), 'true');
assert.equal(await page.locator('[data-route-strategy="balanced"]').getAttribute('aria-pressed'), 'true');
await capture('plan-balanced-config-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-route-strategy="complete-missions"]').click();
assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().routeStrategy), 'complete-missions');
await capture('plan-complete-missions-config-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-route-strategy="fewest-jumps"]').click();
await capture('plan-fewest-jumps-config-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-action="toggle-more-strategies"]').click();
assert.ok(await page.locator('[data-route-strategy="low-traffic"]').count());
assert.match(await page.locator('[data-route-strategy="low-traffic"]').innerText(), /Experimental/i);
await page.locator('[data-route-strategy="low-traffic"]').scrollIntoViewIfNeeded();
await capture('plan-low-traffic-config-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-route-strategy="custom"]').click();
assert.ok(await page.locator('.custom-strategy').count());
await page.locator('[data-strategy-weight="travelTime"]').fill('85');
assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().routeStrategyWeights.travelTime), 85);
await page.locator('.custom-strategy').scrollIntoViewIfNeeded();
await capture('plan-custom-weights-1664x800', { viewport: { width: 1664, height: 800 } });
await page.locator('[data-route-strategy="balanced"]').click();
await page.locator('#route-duration').fill('5');
await page.locator('[data-action="build-plan"]').click();
await page.waitForSelector('[data-start-session]');
assert.ok(await page.locator('[data-session-row]').count() >= 2);
assert.ok(await page.locator('.route-scorecard').count());
const candidateCardCount = await page.locator('.candidate-card').count();
if (!candidateCardCount) assert.match(await page.locator('.candidate-comparison').innerText(), /Only one valid route/i);
if (candidateCardCount > 1) {
  await page.locator('.candidate-card').nth(1).click();
  assert.equal(await page.locator('.candidate-card').nth(1).getAttribute('aria-pressed'), 'true');
}
await capture('plan-multiple-sessions-1600x900');
await capture('plan-candidate-comparison-1664x800', { viewport: { width: 1664, height: 800 } });

await page.locator('[data-start-session="0"]').click();
assert.match(await page.locator('.command-panel').innerText(), /Pick up/i);
assert.match(await page.locator('.command-panel').innerText(), /Operation manifest/i);
assert.ok(await page.locator('.cargo-cell.is-current').count() > 0);
await assertCargoSquaresAndUnits([2]);
const pickupStrip = await assertLocationStrip();
assert.ok(await pickupStrip.locator('[data-service="risk"]').getAttribute('data-status'));
const pickupLocationId = await pickupStrip.getAttribute('data-location-id');
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
assert.match(await page.locator('.command-panel').innerText(), /Travel context/i);
const travelStrip = await assertLocationStrip();
assert.notEqual(await travelStrip.getAttribute('data-location-id'), pickupLocationId, 'travel must show destination context');
await capture('live-travel-1366x768', { viewport: { width: 1366, height: 768 } });
const shortMetrics = await page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  viewport: document.documentElement.clientHeight,
  offenders: [...document.querySelectorAll('body *')]
    .filter((element) => element.offsetParent !== null)
    .map((element) => ({ tag: element.tagName, className: element.className?.baseVal ?? element.className, bottom: element.getBoundingClientRect().bottom }))
    .sort((left, right) => right.bottom - left.bottom)
    .slice(0, 4),
  boxes: Object.fromEntries(['.mission-bar', '.live-grid', '.route-rail', '.workspace'].map((selector) => {
    const bounds = document.querySelector(selector).getBoundingClientRect();
    return [selector, { top: bounds.top, height: bounds.height, bottom: bounds.bottom }];
  }))
}));
assert.ok(
  shortMetrics.height <= shortMetrics.viewport + 1,
  `common travel state must fit 1366×768 (${shortMetrics.height}px document / ${shortMetrics.viewport}px viewport; ${JSON.stringify(shortMetrics.boxes)}; ${JSON.stringify(shortMetrics.offenders)})`
);

await page.locator('[data-action="complete-step"]').click();
assert.match(await page.locator('.command-panel').innerText(), /cargo operation/i);
assert.ok(await page.locator('.cargo-grid.is-delivery .cargo-cell.is-current').count() > 0, 'delivery cells must be highlighted');
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
await page.setViewportSize({ width: 1600, height: 900 });
await page.locator('[data-action="complete-step"]').click();
assert.match(await page.locator('main').innerText(), /Operation summary/i);
await capture('live-route-complete-1600x900');

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
  const expectedLocationId = await page.evaluate(() => {
    const state = window.SCCompanionSession.getState();
    return window.SCCompanionOperationalSteps.derive(state.route, state).currentStep?.to?.id;
  });
  assert.equal(await page.locator('.command-panel .location-status-strip').getAttribute('data-location-id'), expectedLocationId);
  assert.match(await page.locator('.command-panel').innerText(), kind === 'jump' ? /Jump transit/i : /Gateway context/i);
  await capture(screenshotName, { viewport: { width: 1600, height: 900 } });
}

await showOperationalKind('gateway-approach', 'live-gateway-approach-1600x900');
await showOperationalKind('jump', 'live-jump-1600x900');

await page.evaluate(() => {
  const state = window.SCCompanionSession.getState();
  const progress = window.SCCompanionOperationalSteps.derive(state.route, state);
  const index = progress.steps.findIndex((step) => step.kind === 'action' && step.location?.id.includes('checkmate'));
  const prior = progress.steps.slice(0, index);
  const actions = prior.filter((step) => step.kind === 'action');
  window.SCCompanionSession.patch({
    operationalRouteKey: progress.routeKey,
    completedOperationalStepIds: prior.map((step) => step.id),
    completedStopIds: actions.map((step) => step.stopId),
    currentStopIndex: actions.length
  });
});
await page.waitForFunction(() => document.querySelector('.location-status-item.is-danger'));
assert.match(await page.locator('[data-service="risk"]').innerText(), /HIGH|EXTREME/i);
await capture('live-high-risk-services-1600x900', { viewport: { width: 1600, height: 900 } });

await page.evaluate(() => {
  const state = window.SCCompanionSession.getState();
  const route = structuredClone(state.route);
  route.stops[0].locationId = 'custom-unknown-facility';
  route.stops[0].locationLabel = 'Unknown facility';
  window.SCCompanionSession.patch({
    route,
    operationalRouteKey: null,
    completedOperationalStepIds: [],
    completedStopIds: [],
    currentStopIndex: 0
  });
});
await page.waitForFunction(() => document.querySelector('.location-status-strip')?.dataset.locationId === 'custom-unknown-facility');
const unknownItems = page.locator('.command-panel .location-status-item:not([data-service="risk"])');
assert.ok(await unknownItems.count() > 0);
assert.equal(await unknownItems.evaluateAll((items) => items.every((item) => item.dataset.status === 'unknown')), true);
assert.equal(await page.locator('.command-panel .location-status-item.is-unavailable').count(), 0, 'unknown must not be classified as unavailable');
await capture('live-unknown-services-1600x900', { viewport: { width: 1600, height: 900 } });

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
