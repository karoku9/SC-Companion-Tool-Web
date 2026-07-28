import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const missionText = `Ship capacity test
collect grim hex 20scu titanium
deliver area18 20scu titanium`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1664, height: 936 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
let failure = null;
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
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

try {
  step = 'load mission input before ship controls';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-ship-select').isVisible(), false);

  step = 'parse mission and expose model-only menu';
  await page.locator('#mission-text').fill(missionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  await page.locator('#mission-ship-select').waitFor({ state: 'visible' });
  const options = await page.locator('#mission-ship-select option').allTextContents();
  assert.ok(options.length >= 7);
  assert.ok(options.some((label) => /Drake Corsair · 72 SCU/i.test(label)));
  assert.ok(options.some((label) => /RSI Constellation Taurus · 168 SCU/i.test(label)));
  assert.ok(options.some((label) => /Crusader C2 Hercules · 696 SCU/i.test(label)));
  assert.ok(options.every((label) => !/skin|paint|livery/i.test(label)));
  assert.equal(await page.locator('[data-view-target="hangar"]').count(), 0, 'Fleet workspace must not remain in visible navigation');
  assert.equal(await page.locator('#fleet-loadout-editor:visible').count(), 0, 'Advanced loadout editor must stay out of the active workflow');

  step = 'build a route with Corsair';
  await selectCurrentLocation();
  await page.locator('#mission-ship-select').selectOption('drake-corsair');
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  await page.locator('#focused-route-open').click();
  await page.locator('#ops40-ship-select').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#ops40-ship-select').inputValue(), 'drake-corsair');
  let state = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.equal(state.selectedShipModelId, 'drake-corsair');
  assert.equal(state.hangarShips.find((ship) => ship.id === state.selectedShipId)?.cargoCapacityScu, 72);
  const previousRoutePlan = JSON.stringify(state.routePlan);

  step = 'switch model and rebuild the active sessions';
  await page.locator('#ops40-ship-select').selectOption('rsi-constellation-taurus');
  await page.waitForFunction(() => window.SCCompanionSession.getState().selectedShipModelId === 'rsi-constellation-taurus');
  state = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.equal(state.selectedShipModelId, 'rsi-constellation-taurus');
  assert.equal(state.hangarShips.find((ship) => ship.id === state.selectedShipId)?.cargoCapacityScu, 168);
  assert.notEqual(JSON.stringify(state.routePlan), previousRoutePlan, 'Changing ship must rebuild the session plan');
  assert.equal(await page.locator('#ops40-ship-select').inputValue(), 'rsi-constellation-taurus');
  assert.match(await page.locator('#ops40-onboard').textContent(), /168 SCU/);
  await noHorizontalOverflow('Operations 0.40 ship selector desktop');
  await page.screenshot({ path: `${output}/ship-selector-desktop.png`, fullPage: false });

  step = 'verify mobile keeps ship selection inside the review run sheet';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-view-target="missions"]').click();
  await page.locator('[data-stage="review"]').click();
  await page.locator('#mission-ship-select').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-ship-select').inputValue(), 'rsi-constellation-taurus');
  const box = await page.locator('#mission-ship-select').boundingBox();
  assert.ok(box && box.height >= 42, `Mobile ship target is too small: ${JSON.stringify(box)}`);
  await noHorizontalOverflow('Simplified ship selector mobile');
  await page.screenshot({ path: `${output}/ship-selector-mobile.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/ship-selector-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/ship-selector-failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
console.log('Fleet selection and Operations UI 0.40 integration passed.');
