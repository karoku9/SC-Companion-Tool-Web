import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const recognizedText = `CONTRACT: Covalex clipboard transfer
COLLECT CARGO
Location: ARC-L2 Lively Pathway Station
Quantity: 3 SCU
Commodity: Titanium

DELIVER CARGO
Destination: Teasa Spaceport
3 SCU Titanium`;

const mockModule = `
export const PSM = { SPARSE_TEXT: '11' };
export async function createWorker(language, oem, options) {
  if (language !== 'eng') throw new Error('Expected English OCR worker');
  return {
    async setParameters() {},
    async recognize() {
      options?.logger?.({ status: 'recognizing text', progress: 0.65 });
      options?.logger?.({ status: 'recognizing text', progress: 1 });
      return { data: { text: ${JSON.stringify(recognizedText)}, confidence: 94, blocks: [] } };
    },
    async terminate() {}
  };
}`;

const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKUlEQVR4nO3NMQEAAAjDMMC/52ECvlRA00nqs3m9AwAAAAAAAAAAgMMWx/EDPS4YA2MAAAAASUVORK5CYII=',
  'base64'
);

const gameLog = `<2026-07-26T12:00:00.000Z> [Notice] <UpdateNotificationItem> Notification "Contract accepted: Protected Folder Relay." [40], Action: Add
<2026-07-26T12:00:02.000Z> [Notice] <UpdateNotificationItem> Notification "Pick up 5 SCU of Medical Supplies from Checkmate Station." [41], Action: Add
<2026-07-26T12:00:04.000Z> [Notice] <UpdateNotificationItem> Notification "Drop off 5 SCU of Medical Supplies at Ruin Station." [42], Action: Add
`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
let failure = null;

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

await page.addInitScript(() => {
  window.__powerPickerCalls = 0;
  Object.defineProperty(window, 'showOpenFilePicker', {
    configurable: true,
    value: async () => {
      window.__powerPickerCalls += 1;
      throw new DOMException('Protected system folder', 'SecurityError');
    }
  });
});

await page.route('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: mockModule
  });
});

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
}

async function assertTargets(selectors) {
  for (const selector of selectors) {
    assert.ok(await page.locator(selector).evaluate((element) => element.getBoundingClientRect().height >= 44), `${selector} is below 44px`);
  }
}

try {
  step = 'load focused assisted-intake controls';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.mission-experimental').evaluate((element) => element.open), false);
  await page.locator('.mission-experimental > summary').click();
  await page.locator('#game-log-intake[data-access-enhanced="true"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#game-log-choose').textContent(), 'Import Game.log');

  step = 'import Game.log without invoking protected file-system access';
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('#game-log-choose').click();
  const chooser = await fileChooserPromise;
  await chooser.setFiles({ name: 'Game.log', mimeType: 'text/plain', buffer: Buffer.from(gameLog) });
  assert.match((await page.locator('#game-log-file-state').textContent()) ?? '', /Game\.log/);
  await page.locator('#game-log-summary article').nth(1).locator('strong').filter({ hasText: '2' }).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.__powerPickerCalls), 0);
  assert.equal(await page.locator('#game-log-refresh').textContent(), 'Reselect and read new lines');

  step = 'open screenshot input';
  await page.locator('[data-input="screenshot"]').click();
  await page.locator('#ocr-intake[data-access-enhanced="true"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#ocr-paste').textContent(), 'Paste screenshot');

  step = 'paste Win Shift S image into OCR intake';
  await page.locator('#ocr-paste-zone').focus();
  await page.evaluate((pngBase64) => {
    const bytes = Uint8Array.from(atob(pngBase64), (character) => character.charCodeAt(0));
    const file = new File([bytes], 'image.png', { type: 'image/png', lastModified: Date.now() });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: transfer });
    document.querySelector('#ocr-paste-zone').dispatchEvent(event);
  }, validPng.toString('base64'));
  await page.locator('.ocr-report').waitFor({ state: 'visible' });
  await page.locator('#ocr-progress-label').filter({ hasText: 'OCR complete' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('.ocr-report header strong').first().textContent(), /^clipboard-/);
  assert.equal(await page.locator('.ocr-objective.is-complete').count(), 2);
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().route), null);
  await noHorizontalOverflow('Assisted intake desktop');
  await page.screenshot({ path: `${output}/assisted-intake-access-desktop.png`, fullPage: true });

  step = 'verify mobile OCR controls';
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow('Assisted intake mobile OCR');
  await assertTargets(['#ocr-paste', '#ocr-choose']);

  step = 'verify mobile experimental Game.log controls';
  await page.locator('[data-input="text"]').click();
  await page.locator('#game-log-intake').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Assisted intake mobile Game.log');
  await assertTargets(['#game-log-choose', '#game-log-live']);
  await page.screenshot({ path: `${output}/assisted-intake-access-mobile.png`, fullPage: true });

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/assisted-intake-access-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/assisted-intake-access-failure.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
