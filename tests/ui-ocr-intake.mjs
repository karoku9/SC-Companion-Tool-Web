import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const recognizedText = `CONTRACT: Covalex local transfer
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
      options?.logger?.({ status: 'recognizing text', progress: 0.55 });
      options?.logger?.({ status: 'recognizing text', progress: 1 });
      return { data: { text: ${JSON.stringify(recognizedText)}, confidence: 93, blocks: [] } };
    },
    async terminate() {}
  };
}`;

const validPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKUlEQVR4nO3NMQEAAAjDMMC/52ECvlRA00nqs3m9AwAAAAAAAAAAgMMWx/EDPS4YA2MAAAAASUVORK5CYII=',
  'base64'
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
let failure = null;

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
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
  step = 'load Missions screenshot input';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), false);
  await page.locator('[data-input="screenshot"]').click();
  await page.locator('#ocr-intake').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#ocr-use-draft').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().route), null);

  step = 'upload screenshot and run mocked browser OCR';
  await page.locator('#ocr-file-input').setInputFiles({
    name: 'covalex-contract.png',
    mimeType: 'image/png',
    buffer: validPng
  });
  await page.locator('.ocr-report').waitFor({ state: 'visible' });
  await page.locator('#ocr-progress-label').filter({ hasText: 'OCR complete' }).waitFor({ state: 'visible' });

  assert.equal(await page.locator('.ocr-objective').count(), 2);
  assert.equal(await page.locator('.ocr-objective.is-complete').count(), 2);
  assert.equal(await page.locator('[data-ocr-title]').inputValue(), 'Covalex local transfer');
  assert.equal(await page.locator('.ocr-objective').nth(0).locator('[data-ocr-field="action"]').inputValue(), 'collect');
  assert.equal(await page.locator('.ocr-objective').nth(0).locator('[data-ocr-field="location"]').inputValue(), 'ARC-L2 Lively Pathway Station');
  assert.equal(await page.locator('.ocr-objective').nth(0).locator('[data-ocr-field="quantity"]').inputValue(), '3');
  assert.equal(await page.locator('.ocr-objective').nth(0).locator('[data-ocr-field="commodity"]').inputValue(), 'Titanium');
  assert.match(await page.locator('.ocr-objective').nth(0).textContent(), /Line 3/);
  assert.match(await page.locator('#ocr-engine-state').textContent(), /Tesseract\.js 7\.0\.0/);
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().route), null);
  await noHorizontalOverflow('OCR desktop');
  await page.screenshot({ path: `${output}/ocr-intake-desktop.png`, fullPage: true });

  step = 'verify mobile OCR review layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow('OCR mobile');
  assert.ok(await page.locator('#ocr-choose').evaluate((element) => element.getBoundingClientRect().height >= 44));
  await page.screenshot({ path: `${output}/ocr-intake-mobile.png`, fullPage: true });

  step = 'correct OCR fields before handoff';
  await page.locator('.ocr-objective').nth(0).locator('[data-ocr-field="commodity"]').fill('Titanium');
  await page.locator('.ocr-objective').nth(1).locator('[data-ocr-field="commodity"]').fill('Titanium');

  step = 'load OCR draft into visual mission review';
  await page.locator('#ocr-use-draft').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), true);
  assert.equal(await page.locator('[data-review-mission]').count(), 1);
  assert.equal(await page.locator('[data-review-mission] [data-objective]').count(), 2);
  assert.equal(await page.locator('.location-state-v26.is-ready').count(), 2);
  assert.equal(await page.locator('.cargo-chip').count(), 2);
  assert.match(await page.locator('.mission-cargo-chips').first().textContent(), /3×\s*Titanium/i);
  const editorText = await page.locator('#mission-text').inputValue();
  assert.match(editorText, /collect ARC-L2 Lively Pathway Station 3scu titanium/i);
  assert.match(editorText, /deliver Teasa Spaceport 3scu titanium/i);
  assert.equal(await page.locator('#focused-review-generate').isDisabled(), true);
  await selectCurrentLocation();
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().route), null);
  await noHorizontalOverflow('OCR visual review mobile');
  await page.screenshot({ path: `${output}/ocr-visual-review-mobile.png`, fullPage: true });

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/ocr-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/ocr-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
