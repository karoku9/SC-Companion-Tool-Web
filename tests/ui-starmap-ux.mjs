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

async function openWorkspace(id) {
  step = `open workspace ${id}`;
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
}

let failure = null;
try {
  step = 'generate focused interstellar route';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.locator('#mission-validation-panel').waitFor({ state: 'visible' });
  await page.locator('#mission-text').fill(missionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-validation-title').filter({ hasText: /^Ready$/ }).waitFor({ state: 'visible' });
  await page.locator('#mission-generate-validated').click();
  await page.locator('#mission-preview-title').filter({ hasText: '1 mission generated' }).waitFor({ state: 'visible' });

  step = 'inspect desktop itinerary orientation';
  await openWorkspace('map');
  await page.locator('#starmap-canvas .map-route-node').first().waitFor({ state: 'visible' });
  assert.notEqual((await page.locator('#starmap-hud-current').textContent())?.trim(), 'No active route');
  assert.notEqual((await page.locator('#starmap-hud-next').textContent())?.trim(), '—');
  assert.match((await page.locator('#starmap-route-status').textContent()) ?? '', /jump/);
  assert.doesNotMatch((await page.locator('#starmap-route-status').textContent()) ?? '', /jumps?.*jumps?/i);
  await noHorizontalOverflow('desktop itinerary');
  await page.screenshot({ path: `${output}/starmap-ux-itinerary-desktop.png` });

  step = 'verify selection does not change navigation layer';
  await page.locator('[data-map-mode="network"]').click();
  await page.locator('#starmap-canvas [data-map-key="pyro"]').waitFor({ state: 'visible' });
  await page.locator('#starmap-route-list button').nth(1).click();
  assert.equal(await page.locator('[data-map-mode="network"]').getAttribute('aria-selected'), 'true');
  assert.equal((await page.locator('#starmap-mode').textContent())?.trim(), 'System network');

  step = 'drill down from network to selected system';
  await page.locator('#starmap-canvas [data-map-key="pyro"]').click();
  assert.equal((await page.locator('#starmap-selection-title').textContent())?.trim(), 'Pyro');
  assert.equal(await page.locator('#starmap-open-system').isVisible(), true);
  await page.locator('#starmap-open-system').click();
  assert.equal(await page.locator('[data-map-mode="local"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#starmap-system-select').inputValue(), 'pyro');
  assert.equal(await page.locator('#starmap-open-system').isVisible(), false, 'System layer still offers redundant Open system action');
  assert.match((await page.locator('#starmap-selection-detail').textContent()) ?? '', /shown on this layer/i);
  await noHorizontalOverflow('desktop system');
  await page.screenshot({ path: `${output}/starmap-ux-system-desktop.png` });

  step = 'complete route';
  await openWorkspace('route');
  let safety = 10;
  while (!(await page.locator('#complete-stop').isDisabled()) && safety > 0) {
    await page.locator('#complete-stop').click();
    safety -= 1;
  }
  assert.ok(safety > 0, 'Route completion exceeded safety limit');
  assert.match((await page.locator('#global-route-status').textContent()) ?? '', /complete/i);

  step = 'verify completed-session orientation at tablet size';
  await page.setViewportSize({ width: 768, height: 1024 });
  await openWorkspace('map');
  await page.locator('[data-map-mode="route"]').click();
  assert.equal((await page.locator('#starmap-hud-current').textContent())?.trim(), 'Session complete');
  assert.equal((await page.locator('#starmap-hud-current-meta').textContent())?.trim(), 'All active stops completed');
  assert.equal((await page.locator('#starmap-hud-next').textContent())?.trim(), 'No further stops');
  assert.equal(await page.locator('[data-hud-stop="current"]').isDisabled(), true);
  await noHorizontalOverflow('tablet completed itinerary');
  await page.screenshot({ path: `${output}/starmap-ux-complete-tablet.png` });

  step = 'verify mobile details sheet inside the viewport';
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace('map');
  await page.locator('#starmap-context-toggle').click();
  const panel = page.locator('#starmap-context-panel');
  const box = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  assert.ok(box.width > 0 && box.height > 0, 'Mobile details panel has no visible rectangle');
  assert.ok(box.x >= 0 && box.y >= 0, `Mobile details start outside viewport: ${JSON.stringify(box)}`);
  assert.ok(box.x + box.width <= box.viewportWidth + 2, `Mobile details escape horizontally: ${JSON.stringify(box)}`);
  assert.ok(box.y + box.height <= box.viewportHeight + 2, `Mobile details escape vertically: ${JSON.stringify(box)}`);
  assert.equal(await page.locator('#starmap-context-toggle').getAttribute('aria-expanded'), 'true');
  await noHorizontalOverflow('mobile details');
  await page.screenshot({ path: `${output}/starmap-ux-mobile-details.png` });
  await page.locator('#starmap-context-close').click();
  assert.equal(await page.locator('#starmap-context-toggle').getAttribute('aria-expanded'), 'false');

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
