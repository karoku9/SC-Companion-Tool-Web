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

try {
  await page.goto(`${baseUrl}/#hangar`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-view-target="hangar"]').click();
  await page.locator('#fleet-loadout-editor').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.SCCompanionFleetLoadouts?.activePerformance(window.SCCompanionSession.getState()));

  assert.equal(await page.locator('.fleet-loadout-card').count(), 1);
  assert.match(await page.locator('.fleet-loadout-card').first().textContent(), /Imported configuration/i);

  await page.locator('#fleet-loadout-new').click();
  await page.locator('#fleet-loadout-name').fill('Fast Stanton');
  await page.locator('#fleet-loadout-quantum-factor').fill('0.82');
  await page.locator('#fleet-loadout-handling-factor').fill('0.75');
  await page.locator('#fleet-loadout-fuel-factor').fill('0.9');
  await page.locator('#fleet-loadout-spool').fill('6');
  await page.locator('#fleet-loadout-cargo-delta').fill('-4');
  await page.locator('[data-component-field="name"]').first().fill('VK-00 test profile');
  await page.locator('[data-component-field="source-authority"]').first().fill('Manual test record');
  await page.locator('#fleet-loadout-form button[type="submit"]').click();

  await page.locator('.fleet-loadout-card.is-active').filter({ hasText: 'Fast Stanton' }).waitFor({ state: 'visible' });
  const state = await page.evaluate(() => {
    const current = window.SCCompanionSession.getState();
    const performance = window.SCCompanionFleetLoadouts.activePerformance(current);
    return {
      selectedShipId: current.selectedShipId,
      activeLoadoutId: current.activeLoadoutByShip[current.selectedShipId],
      shadowShip: current.hangarShips.find((ship) => ship.id === current.selectedShipId),
      performance
    };
  });
  assert.equal(state.selectedShipId, 'corsair-main');
  assert.match(state.activeLoadoutId, /loadout/);
  assert.equal(state.shadowShip.quantumTimeFactor, 0.82);
  assert.equal(state.performance.operationalCargoCapacityScu, 68);
  assert.equal(state.performance.handlingTimeFactor, 0.75);
  assert.equal(state.performance.quantumDriveName, 'VK-00 test profile');
  assert.match(await page.locator('#fleet-quantum-factor').textContent(), /0\.82/);
  assert.match(await page.locator('#fleet-grid-capacity').textContent(), /68 SCU/);

  const migrated = await page.evaluate(() => {
    const current = window.SCCompanionSession.getState();
    return {
      loadouts: current.fleetLoadouts[current.selectedShipId].length,
      shipId: current.hangarShips.find((ship) => ship.id === current.selectedShipId).id
    };
  });
  assert.equal(migrated.loadouts, 2);
  assert.equal(migrated.shipId, 'corsair-main');

  const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(metrics.document <= metrics.viewport + 2, `Fleet desktop overflow: ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: `${output}/fleet-loadouts-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#fleet-loadout-editor').scrollIntoViewIfNeeded();
  const mobile = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(mobile.document <= mobile.viewport + 2, `Fleet mobile overflow: ${JSON.stringify(mobile)}`);
  const undersized = await page.evaluate(() => [...document.querySelectorAll('#fleet-loadout-editor button, #fleet-loadout-editor input, #fleet-loadout-editor select')]
    .filter((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && !element.disabled && box.height < 43;
    }).map((element) => ({ text: element.textContent || element.getAttribute('aria-label') || element.id, height: element.getBoundingClientRect().height })));
  assert.deepEqual(undersized, []);
  await page.screenshot({ path: `${output}/fleet-loadouts-mobile.png`, fullPage: true });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
