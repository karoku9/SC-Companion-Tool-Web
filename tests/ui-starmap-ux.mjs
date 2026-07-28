import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const missionText = `Mission — Navigation UX verification
collect area18 4scu etam
deliver checkmate station pyro 2scu etam
deliver levski nyx 2scu etam`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1664, height: 936 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
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

let failure = null;
try {
  step = 'generate focused interstellar route';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), false);
  await page.locator('#mission-text').fill(missionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  await selectCurrentLocation();
  await page.locator('#mission-route-mode').selectOption('fastest');
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  await page.locator('#focused-route-summary').filter({ hasText: 'Checkmate' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#focused-route-summary').textContent(), /Stanton Gateway/i);
  assert.match(await page.locator('#focused-route-summary').textContent(), /Pyro Gateway/i);

  step = 'inspect cargo-first desktop route workflow';
  await page.locator('#focused-route-open').click();
  await page.locator('.operations-page.ops40-page').waitFor({ state: 'visible' });
  await page.locator('.ops40-cargo-cell').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-view-target="map"]').count(), 0, 'Standalone Starmap must not remain in visible navigation');
  assert.equal(await page.locator('.ops-live-navigation, .ops-live-map').count(), 0, 'Operations route map must be removed');
  assert.equal(await page.locator('.ops40-cargo-panel').count(), 1);
  assert.ok(await page.locator('.ops40-stop').count() >= 3);
  assert.notEqual((await page.locator('#ops40-step-title').textContent())?.trim(), 'Generate a session first');
  assert.notEqual((await page.locator('#ops40-now').textContent())?.trim(), '—');

  const routeFlow = await page.evaluate(() => {
    const state = window.SCCompanionSession.getState();
    const route = window.SCCompanionRouteCorrections.deriveRoute(state.route, state.routeCorrections);
    const flow = window.SCCompanionOperationalSteps.derive(route, state);
    return {
      kinds: flow.steps.map((item) => item.kind),
      jumpTitles: flow.steps.filter((item) => item.kind === 'jump').map((item) => item.title),
      gatewayApproaches: flow.steps.filter((item) => item.kind === 'gateway-approach').map((item) => item.title)
    };
  });
  assert.equal(routeFlow.jumpTitles.length, 2, `Stanton → Pyro → Nyx should use exactly two jumps: ${JSON.stringify(routeFlow)}`);
  assert.equal(routeFlow.gatewayApproaches.length, 2);
  assert.ok(routeFlow.kinds.includes('travel'));
  assert.ok(routeFlow.kinds.includes('action'));
  await noHorizontalOverflow('cargo-first desktop route workflow');
  await page.screenshot({ path: `${output}/cargo-first-route-desktop.png`, fullPage: false });

  step = 'verify current instruction and cargo update with progress';
  const firstCurrentName = (await page.locator('#ops40-step-title').textContent())?.trim();
  const firstProgress = (await page.locator('#ops40-cargo-title').textContent())?.trim();
  await page.locator('#ops40-complete').click();
  await page.waitForFunction((previousName) => document.querySelector('#ops40-step-title')?.textContent?.trim() !== previousName, firstCurrentName);
  const secondCurrentName = (await page.locator('#ops40-step-title').textContent())?.trim();
  const secondProgress = (await page.locator('#ops40-cargo-title').textContent())?.trim();
  assert.notEqual(secondCurrentName, firstCurrentName, 'Completing a route step must advance the current instruction');
  assert.ok(secondProgress, 'Cargo projection heading must remain populated after progress');
  assert.equal(await page.locator('.ops-live-navigation, .ops-live-map').count(), 0);
  assert.equal(await page.locator('.ops40-stop.is-current, .ops40-stop.is-next').count() >= 1, true);
  assert.ok(firstProgress || secondProgress);
  await page.screenshot({ path: `${output}/cargo-first-route-progress-desktop.png`, fullPage: false });

  step = 'complete route and verify cargo-first completion';
  let safety = 30;
  while (!(await page.locator('#ops40-complete').isDisabled()) && safety > 0) {
    await page.locator('#ops40-complete').click();
    safety -= 1;
  }
  assert.ok(safety > 0, 'Route completion exceeded safety limit');
  await page.locator('#ops40-step-title').filter({ hasText: /Session complete/i }).waitFor({ state: 'visible' });
  assert.match((await page.locator('#global-route-status').textContent()) ?? '', /complete/i);
  assert.equal(await page.locator('.ops-live-navigation, .ops-live-map').count(), 0);
  assert.equal(await page.locator('.ops40-cargo-panel').count(), 1);

  step = 'verify completed cargo-first layout at tablet size';
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('.ops40-cargo-panel').waitFor({ state: 'visible' });
  assert.match(await page.locator('#ops40-step-title').textContent(), /complete/i);
  await noHorizontalOverflow('tablet completed cargo-first Operations');
  const tabletBox = await page.locator('.ops40-cargo-panel').boundingBox();
  assert.ok(tabletBox && tabletBox.width <= 768 + 2 && tabletBox.height > 250);
  await page.screenshot({ path: `${output}/cargo-first-route-complete-tablet.png`, fullPage: true });

  step = 'verify mobile cargo-first layout and controls';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.ops40-cargo-panel').waitFor({ state: 'visible' });
  await noHorizontalOverflow('mobile cargo-first Operations');
  const mobileBox = await page.locator('.ops40-cargo-panel').boundingBox();
  assert.ok(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 392, `Mobile cargo panel escapes viewport: ${JSON.stringify(mobileBox)}`);
  assert.equal(await page.locator('.ops-live-navigation, .ops-live-map').count(), 0);
  assert.equal(await page.locator('.ops40-dock [data-ops40-action]').count(), 5);
  await page.screenshot({ path: `${output}/cargo-first-route-mobile.png`, fullPage: true });

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/starmap-ux-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/starmap-ux-failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
console.log('Route navigation UX and Operations UI 0.40 integration passed.');
