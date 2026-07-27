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

  step = 'inspect integrated desktop route map';
  await page.locator('#focused-route-open').click();
  await page.locator('#ops-live-map .ops-map-node').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-view-target="map"]').count(), 0, 'Standalone Starmap must not remain in visible navigation');
  const nodeCount = await page.locator('#ops-live-map .ops-map-node').count();
  const legCount = await page.locator('#ops-live-map .ops-map-leg').count();
  assert.ok(nodeCount >= 3, `Expected at least three route nodes, found ${nodeCount}`);
  assert.equal(legCount, nodeCount - 1);
  assert.ok(await page.locator('#ops-live-map .ops-map-gateway').count() >= 4, 'Stanton → Pyro → Nyx must expose both gateway pairs');
  assert.equal(await page.locator('#ops-live-map .ops-map-node.is-current').count(), 1);
  assert.ok(await page.locator('#ops-live-map .ops-map-leg.is-active').count() >= 1);
  assert.match(await page.locator('#ops-next-leg-strip').textContent(), /Gateway|Area18|Riker Memorial Spaceport/i);
  assert.notEqual((await page.locator('#ops-next-leg-title').textContent())?.trim(), 'No active route');
  await noHorizontalOverflow('integrated desktop map');
  await page.screenshot({ path: `${output}/integrated-route-map-desktop.png`, fullPage: true });

  step = 'verify map updates with route progress';
  const firstCurrentId = await page.locator('#ops-live-map .ops-map-node.is-current').getAttribute('data-stop-id');
  const firstCurrentName = (await page.locator('#current-stop-name').textContent())?.trim();
  await page.locator('#complete-stop').click();
  await page.waitForFunction(({ previousId, previousName }) => {
    const currentNode = document.querySelector('#ops-live-map .ops-map-node.is-current');
    const currentName = document.querySelector('#current-stop-name')?.textContent?.trim();
    return currentNode?.getAttribute('data-stop-id') !== previousId && currentName !== previousName;
  }, { previousId: firstCurrentId, previousName: firstCurrentName });
  assert.equal(await page.locator('#ops-live-map .ops-map-node.is-complete').count(), 1);
  assert.equal(await page.locator('#ops-live-map .ops-map-node.is-current').count(), 1);
  assert.notEqual(await page.locator('#ops-live-map .ops-map-node.is-current').getAttribute('data-stop-id'), firstCurrentId);
  await page.screenshot({ path: `${output}/integrated-route-map-progress-desktop.png`, fullPage: true });

  step = 'complete route and verify map orientation';
  let safety = 10;
  while (!(await page.locator('#complete-stop').isDisabled()) && safety > 0) {
    await page.locator('#complete-stop').click();
    safety -= 1;
  }
  assert.ok(safety > 0, 'Route completion exceeded safety limit');
  await page.locator('#ops-next-leg-title').filter({ hasText: /Session complete/i }).waitFor({ state: 'visible' });
  assert.match((await page.locator('#global-route-status').textContent()) ?? '', /complete/i);
  assert.equal(await page.locator('#ops-live-map .ops-map-node.is-complete').count(), nodeCount);
  assert.equal(await page.locator('#ops-live-map .ops-map-node.is-current').count(), 0);

  step = 'verify completed map at tablet size';
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('#ops-live-map').waitFor({ state: 'visible' });
  assert.match(await page.locator('#ops-next-leg-title').textContent(), /complete/i);
  await noHorizontalOverflow('tablet completed integrated map');
  const tabletBox = await page.locator('#ops-live-map').boundingBox();
  assert.ok(tabletBox && tabletBox.width <= 768 + 2 && tabletBox.height > 300);
  await page.screenshot({ path: `${output}/integrated-route-map-complete-tablet.png`, fullPage: true });

  step = 'verify mobile integrated map and controls';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#ops-live-map').waitFor({ state: 'visible' });
  await noHorizontalOverflow('mobile integrated map');
  const mobileBox = await page.locator('#ops-live-map').boundingBox();
  assert.ok(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 392, `Mobile map escapes viewport: ${JSON.stringify(mobileBox)}`);
  assert.equal(await page.locator('.ops-action-bar [data-ops-action]').count(), 5);
  await page.screenshot({ path: `${output}/integrated-route-map-mobile.png`, fullPage: true });

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
