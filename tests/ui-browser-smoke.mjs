import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const realMissionText = `Mission 1
collect attritus paf-iii 10scu dcsr2
deliver grim hex 10scu dcsr2

Mission 2
collect vivere paf-iii + attritus paf-ii 5scu hydrogen totale
deliver grim hex 5scu hydrogen

Mission 3
collect vivere olp 3scu medical supplies
deliver grim hex 3scu medical supplies

Mission 4
collect cru-l4 shallow fields 32scu revenant tree pollen 8scu neon 4scu slam 4scu e'tam
deliver rustville 16scu revenant tree pollen 8scu neon
deliver fallow field 16scu revenant tree pollen 4scu slam 4scu e'tam

Mission 5
collect teasa spaceport 4scu cryopod
deliver shepherd's rest 4scu cryopod

Mission 6
collect grim hex 2scu e'tam 2scu slam 2scu neon
deliver rustville 2scu e'tam
deliver ashland 1scu slam 1scu neon
deliver last landings 1scu slam 1scu neon

Mission 7
collect reclamation & disposal orinth 4scu e'tam
collect fallow field 2scu slam 2scu neon
deliver grim hex 4scu e'tam 2scu slam 2scu neon`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1664, height: 936 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
}

async function visibleStage() {
  return page.evaluate(() => ({
    input: !document.querySelector('#mission-form')?.hidden,
    review: !document.querySelector('#mission-validation-panel')?.hidden,
    route: !document.querySelector('.mission-output')?.hidden
  }));
}

let failure = null;
try {
  step = 'load focused Missions';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });

  step = 'verify expanded destination registry';
  const registry = await page.evaluate(() => {
    const model = window.SCCompanionLocations;
    return {
      coverage: model.getCoverageSummary(),
      attritus: model.searchOperationalLocations('Attritus PAF 3')[0]?.id,
      vivere: model.searchOperationalLocations('Vivere OLP')[0]?.id,
      rustville: model.searchOperationalLocations('Rustville')[0]?.id,
      validation: model.validation
    };
  });
  assert.equal(registry.coverage.operationalDestinations, 106);
  assert.equal(registry.coverage.fieldDestinations, 72);
  assert.equal(registry.attritus, 'stanton-crusader-daymar-attritus-paf-iii');
  assert.equal(registry.vivere, 'stanton-hurston-aberdeen-vivere-olp');
  assert.ok(registry.rustville?.includes('rustville'));
  assert.deepEqual(registry.validation, { errors: [], warnings: [] });

  step = 'verify simple Input stage';
  assert.deepEqual(await visibleStage(), { input: true, review: false, route: false });
  assert.equal(await page.locator('.mission-input-choice').count(), 2);
  assert.equal(await page.locator('.mission-experimental').evaluate((node) => node.open), false);
  assert.equal(await page.locator('.mission-validation-summary').count(), 0);
  await noHorizontalOverflow('Missions input desktop');
  await page.screenshot({ path: `${output}/missions-focused-input-desktop.png`, fullPage: true });

  step = 'analyze exact seven-mission sample';
  await page.locator('#mission-text').fill(realMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 / 7' }).waitFor({ state: 'visible' });
  assert.deepEqual(await visibleStage(), { input: false, review: true, route: false });
  assert.equal(await page.locator('[data-focused-mission]').count(), 1);
  assert.equal(await page.locator('.mission-review-card').count(), 0);
  assert.match(await page.locator('#focused-review-single').textContent(), /Attritus PAF-III/i);
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await noHorizontalOverflow('Missions review desktop');
  await page.screenshot({ path: `${output}/missions-focused-review-desktop.png`, fullPage: true });

  step = 'navigate one mission at a time';
  await page.locator('#focused-review-next').click();
  await page.locator('#focused-review-count').filter({ hasText: '2 / 7' }).waitFor({ state: 'visible' });
  const sharedMission = await page.locator('#focused-review-single').textContent();
  assert.match(sharedMission, /Vivere PAF-III/i);
  assert.match(sharedMission, /Attritus PAF-II/i);
  assert.match(sharedMission, /5scu hydrogen totale/i);

  step = 'generate route';
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  assert.deepEqual(await visibleStage(), { input: false, review: false, route: true });
  const routeSummary = await page.locator('#focused-route-summary').textContent();
  assert.match(routeSummary, /84 SCU total/i);
  assert.match(routeSummary, /Attritus PAF-III/i);
  assert.match(routeSummary, /Vivere OLP/i);
  assert.match(routeSummary, /Rustville/i);
  assert.match(routeSummary, /Shepherd's Rest/i);
  await noHorizontalOverflow('Missions route desktop');
  await page.screenshot({ path: `${output}/missions-focused-route-desktop.png`, fullPage: true });

  step = 'open Operations from generated route';
  await page.locator('[data-shell-link="route"]').click();
  await page.locator('#current-stop-name').waitFor({ state: 'visible' });
  const operationsText = await page.locator('#route-stop-list').textContent();
  assert.match(operationsText, /Attritus PAF-III/i);
  assert.match(operationsText, /Vivere OLP/i);
  assert.match(operationsText, /Fallow Field/i);
  await noHorizontalOverflow('Operations generated route');

  step = 'verify mobile Missions layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-view-target="missions"]').click();
  await page.locator('[data-stage="input"]').click();
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Missions input mobile');
  const mobileColumns = await page.evaluate(() => getComputedStyle(document.querySelector('.mission-input-tools')).gridTemplateColumns.split(' ').length);
  assert.equal(mobileColumns, 1);
  await page.screenshot({ path: `${output}/missions-focused-input-mobile.png`, fullPage: true });

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/failure.txt`, `Step: ${step}\n\n${error.stack ?? error}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/failure-state.png`, fullPage: true });
} finally {
  await browser.close();
}

if (failure) throw failure;
console.log('Focused Missions browser smoke passed.');