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

async function assertReviewFieldsFit(label) {
  const result = await page.evaluate(() => {
    const panel = document.querySelector('#mission-validation-panel').getBoundingClientRect();
    const controls = [...document.querySelectorAll('.mission-review-row select, .mission-review-row input:not([type="checkbox"]), .mission-field-status')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden';
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          text: element.textContent?.trim() || element.value || element.getAttribute('aria-label') || element.className,
          left: box.left,
          right: box.right,
          clippedText: element.classList.contains('mission-field-status') && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2)
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
    assert.equal(control.clippedText, false, `${label}: status text is clipped: ${JSON.stringify(control)}`);
  });
}

let failure = null;
let step = 'initialization';
try {
  step = 'load mission validation';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#mission-validation-panel').waitFor({ state: 'visible' });

  step = 'review broken source';
  await page.locator('#mission-text').fill(brokenSource);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-validation-title').filter({ hasText: 'Blocked' }).waitFor({ state: 'visible' });
  const issueText = await page.locator('#mission-validation-issues').textContent();
  assert.match(issueText, /unverified location/i);
  assert.match(issueText, /unknown action/i);
  assert.equal(await page.locator('#mission-generate-validated').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().route), null);
  await assertReviewFieldsFit('Blocked review');
  await page.screenshot({ path: `${output}/mission-validation-blocked.png`, fullPage: true });

  step = 'confirm custom location and apply suggested action';
  const rows = page.locator('.mission-review-row');
  assert.equal(await rows.count(), 2);
  assert.equal(await rows.nth(1).locator('[data-review-action]').inputValue(), 'deliver');
  await rows.nth(0).locator('[data-confirm-custom]').check();
  await page.locator('#mission-validation-title').filter({ hasText: 'Ready with warnings' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-generate-validated').isEnabled(), true);
  const reviewedText = await page.locator('#mission-text').inputValue();
  assert.match(reviewedText, /deliver area18/i);
  assert.doesNotMatch(reviewedText, /delver/);
  await assertReviewFieldsFit('Reviewed custom location');
  await page.screenshot({ path: `${output}/mission-validation-reviewed-custom.png`, fullPage: true });

  step = 'generate corrected session';
  await page.locator('#mission-generate-validated').click();
  await page.locator('#mission-preview-title').filter({ hasText: '1 mission generated' }).waitFor({ state: 'visible' });
  const stored = await page.evaluate(() => window.SCCompanionSession.getState());
  assert.equal(stored.missionValidation.status, 'review');
  assert.equal(stored.missionValidation.sourceText, brokenSource);
  assert.match(stored.missionValidation.reviewedText, /deliver area18/i);
  assert.match(stored.missionValidation.sourceText, /delver/);
  assert.ok(Object.values(stored.missionValidation.confirmedCustomLocations).includes('hidden depot'));
  assert.ok(stored.route.stops.some((stop) => stop.locationId === 'custom-hidden-depot'));
  assert.equal(stored.missions[0].cargoLots[0].source.pickupLine, 2);
  assert.equal(stored.missions[0].cargoLots[0].source.deliveryLine, 3);

  step = 'invalidate review after source edit';
  await page.locator('#mission-text').fill(`${reviewedText}\n`);
  await page.locator('#mission-validation-title').filter({ hasText: 'Source changed' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-generate-validated').isDisabled(), true);

  step = 'verify ambiguous location suggestions';
  await page.locator('#mission-text').fill(`Mission Ambiguous\ncollect pyro 2scu etam\ndeliver area18 2scu etam`);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-validation-title').filter({ hasText: 'Blocked' }).waitFor({ state: 'visible' });
  assert.ok(await page.locator('.mission-suggestion').count() >= 2);
  await page.locator('.mission-suggestion').first().click();
  await page.locator('#mission-validation-title').filter({ hasText: /Ready/ }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-generate-validated').isEnabled(), true);
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
