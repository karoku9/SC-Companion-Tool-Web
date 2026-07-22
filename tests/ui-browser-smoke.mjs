import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1664, height: 936 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
}

async function openWorkspace(id) {
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

try {
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-preview-title').filter({ hasText: 'missions ready' }).waitFor({ state: 'visible' });
  await noHorizontalOverflow('Missions');
  await page.screenshot({ path: `${output}/missions-desktop.png`, fullPage: true });

  await openWorkspace('route');
  await page.locator('#current-stop-name').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Operations closed');
  await page.screenshot({ path: `${output}/operations-desktop.png`, fullPage: true });

  await page.locator('[data-ops-tool="cargo"]').click();
  const tool = page.locator('#ops-tool-panel');
  await tool.waitFor({ state: 'visible' });
  const box = await tool.boundingBox();
  assert.ok(box, 'Cargo tool has no bounding box');
  assert.ok(box.x >= 0 && box.x + box.width <= 1666, `Cargo tool escapes viewport: ${JSON.stringify(box)}`);
  assert.ok(box.width >= 700, `Cargo tool is squeezed: ${box.width}px`);
  await noHorizontalOverflow('Operations cargo open');
  await page.screenshot({ path: `${output}/operations-cargo-open.png`, fullPage: true });
  await page.locator('#ops-tool-close').click();
  await tool.waitFor({ state: 'hidden' });

  await openWorkspace('hangar');
  await page.locator('#ship-hologram svg').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#fleet-zone-form .zone-form-row').count() >= 2, 'Fleet cargo-zone editor did not render');
  await noHorizontalOverflow('Fleet');
  await page.screenshot({ path: `${output}/fleet-desktop.png`, fullPage: true });

  await openWorkspace('map');
  await page.locator('svg#starmap-canvas').waitFor({ state: 'visible' });
  assert.equal(await page.locator('canvas#starmap-canvas').count(), 0, 'Legacy canvas Starmap is still present');
  assert.ok(await page.locator('#starmap-canvas .map-node').count() > 0, 'Route-first Starmap rendered no nodes');
  await noHorizontalOverflow('Starmap');
  await page.screenshot({ path: `${output}/starmap-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace('route');
  await noHorizontalOverflow('Operations mobile');
  await page.locator('[data-ops-tool="moves"]').click();
  await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Operations mobile tool open');
  await page.screenshot({ path: `${output}/operations-mobile.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} finally {
  await browser.close();
}
