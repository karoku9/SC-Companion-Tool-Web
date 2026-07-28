import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const brokenSource = `Mission Field Repair
collect hidden depot 2scu etam
delver area18 2scu etam`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

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

async function openMissionEditor(index = 0) {
  const button = page.locator(`[data-edit-mission="${index}"]`);
  await button.click();
  await page.locator(`[data-review-mission="${index}"] .mission-card-editor`).waitFor({ state: 'visible' });
}

async function assertReviewFieldsFit(label) {
  const result = await page.evaluate(() => {
    const panel = document.querySelector('#mission-validation-panel').getBoundingClientRect();
    const controls = [...document.querySelectorAll('#focused-review-grid select, #focused-review-grid input')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden';
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          text: element.value || element.getAttribute('aria-label') || element.className,
          left: box.left,
          right: box.right
        };
      });
    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      panel: { left: panel.left, right: panel.right },
      controls
    };
  });
  assert.ok(result.documentWidth <= result.viewport + 2, `${label}: document overflows horizontally`);
  result.controls.forEach((control) => {
    assert.ok(control.left >= result.panel.left - 2, `${label}: control escapes panel left: ${JSON.stringify(control)}`);
    assert.ok(control.right <= result.panel.right + 2, `${label}: control escapes panel right: ${JSON.stringify(control)}`);
  });
}

let failure = null;
let step = 'initialization';
try {
  step = 'load visual mission validation';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), false);

  step = 'review broken source';
  await page.locator('#mission-text').fill(brokenSource);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), true);
  const issueText = await page.locator('#focused-review-alerts').textContent();
  assert.match(issueText, /blocking issue/i);
  assert.equal(await page.locator('#focused-review-generate').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().route), null);
  assert.equal(await page.locator('[data-review-mission]').count(), 1);
  assert.equal(await page.locator('.location-state-v26.is-error').count(), 1);
  await selectCurrentLocation();
  await assertReviewFieldsFit('Blocked visual review');
  await page.screenshot({ path: `${output}/mission-validation-blocked.png`, fullPage: true });

  step = 'correct location and suggested action';
  const rows = page.locator('[data-review-mission] [data-objective]');
  assert.equal(await rows.count(), 2);
  assert.equal(await rows.nth(1).locator('[data-field="action"]').inputValue(), 'deliver');
  await openMissionEditor(0);
  await rows.nth(0).locator('[data-field="location"]').fill('Teasa Spaceport');
  await page.locator('#focused-review-validate').click();
  await page.locator('#focused-review-alerts .is-ready').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  assert.equal(await page.locator('.location-state-v26.is-ready').count(), 2);
  await assertReviewFieldsFit('Corrected visual review');
  await page.screenshot({ path: `${output}/mission-validation-reviewed.png`, fullPage: true });

  step = 'generate corrected session route';
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  const stored = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.equal(stored.missionValidation.status, 'ready');
  assert.equal(stored.missionValidation.sourceText, brokenSource);
  assert.match(stored.missionValidation.reviewedText, /deliver Area18/i);
  assert.match(stored.missionValidation.reviewedText, /Teasa Spaceport/i);
  assert.match(stored.missionValidation.sourceText, /delver/);
  assert.ok(stored.route.stops.some((stop) => stop.locationId === 'stanton-hurston-lorville-teasa'));
  assert.equal(stored.missions[0].cargoLots[0].pickupLocationId, 'stanton-hurston-lorville-teasa');
  assert.equal(stored.missions[0].cargoLots[0].deliveryLocationId, 'stanton-arccorp-area18-riker');
  assert.equal(stored.missions[0].cargoLots[0].source.pickupLine, 2);
  assert.equal(stored.missions[0].cargoLots[0].source.deliveryLine, 3);
  const firstRoute = JSON.stringify(stored.route);

  step = 'block ambiguous replacement without touching active route';
  await page.locator('[data-stage="input"]').click();
  await page.locator('#mission-text').fill(`Mission Ambiguous\ncollect pyro 2scu etam\ndeliver area18 2scu etam`);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.location-state-v26.is-warning').count(), 1);
  assert.equal(await page.locator('#focused-review-generate').isDisabled(), true);
  assert.equal(JSON.stringify(await page.evaluate(() => window.SCCompanionSession.getState().route)), firstRoute);

  step = 'resolve ambiguous location manually';
  await openMissionEditor(0);
  await page.locator('[data-review-mission] [data-objective]').first().locator('[data-field="location"]').fill('Checkmate Station');
  await page.locator('#focused-review-validate').click();
  await page.locator('#focused-review-alerts .is-ready').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await assertReviewFieldsFit('Resolved ambiguous location');
  await page.screenshot({ path: `${output}/mission-validation-ambiguous-resolved.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/mission-validation-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/mission-validation-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
console.log('Mission validation browser test passed.');
