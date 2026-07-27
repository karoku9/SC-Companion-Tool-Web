import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const missionText = `Mission Cargo Grid
collect teasa spaceport 6scu etam
deliver grim hex 6scu etam`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
let failure = null;
let step = 'initialization';

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function selectCurrentLocation(pattern) {
  const value = await page.locator('#mission-start-location-list option').evaluateAll((options, source) => {
    const regex = new RegExp(source, 'i');
    return options.find((option) => regex.test(option.value))?.value ?? '';
  }, pattern.source);
  assert.ok(value, `No current-location suggestion matches ${pattern}`);
  await page.locator('#mission-start-location').fill(value);
  await page.locator('#mission-start-location').dispatchEvent('change');
  await page.locator('#mission-start-location-status[data-state="ready"]').waitFor({ state: 'visible' });
}

async function findCellId(kind, excluded = [], preferredRow = null) {
  return page.locator('[data-v030-cell]').evaluateAll((cells, { kind, excluded, preferredRow }) => {
    const blocked = new Set(excluded);
    const candidates = [...cells].filter((cell) => {
      const id = cell.dataset.v030Cell;
      if (!id || blocked.has(id)) return false;
      const label = cell.querySelector('strong')?.textContent?.trim() ?? '';
      if (kind === 'occupied') return !['Empty', 'Reserved', 'Keep empty'].includes(label);
      if (kind === 'empty') return label === 'Empty';
      return false;
    });
    const match = candidates.find((cell) => preferredRow !== null && cell.dataset.v030Cell?.startsWith(`${preferredRow}:`)) ?? candidates[0];
    return match?.dataset.v030Cell ?? '';
  }, { kind, excluded, preferredRow });
}

try {
  step = 'build one Corsair cargo route';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#mission-text').fill(missionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  await selectCurrentLocation(/teasa/i);
  await page.locator('#focused-review-generate').click();
  await page.locator('.mission-session-card').first().getByRole('button', { name: 'Select session' }).click();
  await page.locator('#focused-route-open').click();
  await page.locator('.operations-page.operations-v028').waitFor({ state: 'visible' });
  await page.locator('.ops-v030-edit-grid').waitFor({ state: 'visible' });

  step = 'open exact ship grid';
  await page.locator('.ops-v030-edit-grid').click();
  await page.locator('#ops-v030-cargo-editor').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-v030-cell]').count(), 24);
  assert.match(await page.locator('.ops-v030-editor-footer').textContent(), /6 × 4 floor cells · 3 SCU vertical capacity per cell/i);
  assert.match(await page.locator('.ops-v030-editor-title').textContent(), /Drake Corsair · 72 SCU official grid/i);

  step = 'drag cargo laterally to an exact coordinate';
  const sourceId = await findCellId('occupied');
  const sourceRow = Number(sourceId.split(':')[0]);
  const targetId = await findCellId('empty', [sourceId], sourceRow);
  assert.ok(sourceId && targetId && sourceId !== targetId);
  const source = page.locator(`[data-v030-cell="${sourceId}"]`);
  const target = page.locator(`[data-v030-cell="${targetId}"]`);
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  await source.dragTo(target);
  await page.waitForFunction(({ sourceId, targetId }) => {
    const state = window.SCCompanionSession.getState();
    const record = state.cargoManualLayouts?.[state.selectedShipId];
    return record?.enabled && record?.emptyCells?.includes(sourceId) && Boolean(record?.placements?.[targetId]);
  }, { sourceId, targetId });
  await page.locator(`[data-v030-cell="${targetId}"].is-manual`).waitFor({ state: 'visible' });

  step = 'assign the same cargo group by coordinate click';
  const selectedGroup = page.locator('[data-v030-group]').first();
  await selectedGroup.click();
  const clickTargetId = await findCellId('empty', [sourceId, targetId], sourceRow);
  assert.ok(clickTargetId);
  await page.locator(`[data-v030-cell="${clickTargetId}"]`).click();
  await page.waitForFunction((cellId) => {
    const state = window.SCCompanionSession.getState();
    return Boolean(state.cargoManualLayouts?.[state.selectedShipId]?.placements?.[cellId]);
  }, clickTargetId);

  step = 'reserve unrelated occupied space';
  await page.locator('[data-v030-mode="reserve"]').click();
  const reserveId = await findCellId('empty', [sourceId, targetId, clickTargetId]);
  assert.ok(reserveId);
  await page.locator(`[data-v030-cell="${reserveId}"]`).click();
  await page.waitForFunction((cellId) => {
    const state = window.SCCompanionSession.getState();
    return state.cargoManualLayouts?.[state.selectedShipId]?.reservedCells?.includes(cellId);
  }, reserveId);
  await page.locator(`[data-v030-cell="${reserveId}"].is-reserved`).waitFor({ state: 'visible' });
  assert.match(await page.locator('.ops-v030-editor-stats').textContent(), /Reserved\s*3 SCU/i);
  await page.screenshot({ path: `${output}/cargo-manual-grid-desktop.png`, fullPage: true });

  step = 'close and verify compact Operations preview';
  await page.locator('[data-v030-close]').click();
  await page.locator('#ops-v030-cargo-editor').waitFor({ state: 'hidden' });
  assert.match(await page.locator('.ops-v030-edit-grid').textContent(), /MANUAL/i);
  assert.ok(await page.locator('.ops-v028-cargo-cell.is-reserved').count() >= 1);
  assert.ok(await page.locator('.ops-v028-cargo-cell.is-manual').count() >= 1);

  step = 'persist manual grid after reload';
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.operations-page.operations-v028').waitFor({ state: 'visible' });
  await page.locator('.ops-v030-edit-grid').click();
  await page.locator('#ops-v030-cargo-editor').waitFor({ state: 'visible' });
  await page.locator(`[data-v030-cell="${clickTargetId}"].is-manual`).waitFor({ state: 'visible' });
  await page.locator(`[data-v030-cell="${reserveId}"].is-reserved`).waitFor({ state: 'visible' });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/cargo-manual-grid-failure.txt`, `Step: ${step}\n\n${error.stack ?? error}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/cargo-manual-grid-failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
console.log('Manual cargo grid browser test passed.');
