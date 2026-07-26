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

  step = 'verify reduced navigation and required route context';
  assert.equal(await page.locator('.nav-group[data-nav-group="plan"]').count(), 0);
  assert.equal(await page.locator('.nav-group[data-nav-group="manage"]').count(), 0);
  assert.equal(await page.locator('#mission-start-location').isVisible(), true);
  assert.equal(await page.locator('#mission-route-mode').inputValue(), 'sessions');
  assert.equal(await page.locator('#mission-session-target').inputValue(), '60');
  assert.deepEqual(await visibleStage(), { input: true, review: false, route: false });
  await noHorizontalOverflow('Missions input desktop');
  await page.screenshot({ path: `${output}/missions-focused-input-desktop.png`, fullPage: true });

  step = 'reject mission analysis without current location';
  await page.locator('#mission-text').fill(realMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  assert.deepEqual(await visibleStage(), { input: true, review: false, route: false });
  assert.equal(await page.locator('#mission-start-location').evaluate((element) => element.matches(':invalid')), true);

  step = 'select current location and analyze exact seven-mission sample';
  await page.locator('#mission-start-location').fill('Grim HEX');
  await page.locator('#mission-start-location').dispatchEvent('change');
  await page.locator('#mission-start-location-status').filter({ hasText: /Yela|Crusader/i }).waitFor({ state: 'visible' });
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '7 missions' }).waitFor({ state: 'visible' });
  assert.deepEqual(await visibleStage(), { input: false, review: true, route: false });
  assert.equal(await page.locator('[data-review-mission]').count(), 7);
  assert.equal(await page.locator('.mission-validation-badge.is-ready').count(), 7);
  assert.ok(await page.locator('.cargo-chip').count() >= 15);
  assert.match(await page.locator('[data-review-mission="1"] .mission-cargo-chips').first().textContent(), /5×\s*hydrogen/i);
  assert.match(await page.locator('[data-review-mission="3"] .mission-cargo-chips').first().textContent(), /32×\s*revenant tree pollen/i);
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await noHorizontalOverflow('Missions review desktop');
  await page.screenshot({ path: `${output}/missions-focused-review-desktop.png`, fullPage: true });

  step = 'build safe one-hour sessions';
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  assert.deepEqual(await visibleStage(), { input: false, review: false, route: true });
  const sessionCards = page.locator('.mission-session-card');
  assert.ok(await sessionCards.count() > 1, 'Seven-mission fixture should be split into multiple play sessions');
  const routeSummary = await page.locator('#focused-route-summary').textContent();
  assert.match(routeSummary, /84 SCU total/i);
  assert.match(routeSummary, /Session 1/i);
  assert.match(routeSummary, /Stanton Gateway/i);
  assert.match(routeSummary, /Pyro Gateway/i);
  const sessionMissionCounts = await sessionCards.evaluateAll((cards) => cards.map((card) => card.querySelectorAll('li').length));
  assert.equal(sessionMissionCounts.reduce((sum, count) => sum + count, 0), 7);
  await noHorizontalOverflow('Missions sessions desktop');
  await page.screenshot({ path: `${output}/missions-focused-sessions-desktop.png`, fullPage: true });

  step = 'open an inter-system session in Operations';
  const gatewaySession = page.locator('.mission-session-card').filter({ has: page.locator('.session-gateways') }).first();
  assert.equal(await gatewaySession.isVisible(), true);
  await gatewaySession.getByRole('button', { name: 'Select session' }).click();
  await page.locator('#focused-route-open').click();
  await page.locator('#current-stop-name').waitFor({ state: 'visible' });
  await page.locator('#ops-live-map .ops-map-node').first().waitFor({ state: 'visible' });
  assert.ok(await page.locator('#ops-live-map .ops-map-leg').count() > 0);
  assert.ok(await page.locator('#ops-live-map .ops-map-gateway').count() >= 2);
  assert.match(await page.locator('#ops-next-leg-strip').textContent(), /Gateway/i);
  assert.equal(await page.locator('.ops-action-bar [data-ops-action]').count(), 5);
  assert.ok(await page.locator('.current-stop-intel-card .intel-icon').count() >= 5);
  await noHorizontalOverflow('Operations live cockpit desktop');
  await page.screenshot({ path: `${output}/operations-live-cockpit-desktop.png`, fullPage: true });

  step = 'verify route order editor opens';
  await page.locator('[data-ops-action="order"]').click();
  await page.locator('.ops-editor-drawer').waitFor({ state: 'visible' });
  assert.ok(await page.locator('.ops-order-row').count() > 0);

  step = 'verify mobile visual review and cockpit';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-view-target="missions"]').click();
  await page.locator('[data-stage="review"]').click();
  await page.locator('[data-review-mission]').first().waitFor({ state: 'visible' });
  await noHorizontalOverflow('Missions review mobile');
  await page.screenshot({ path: `${output}/missions-focused-review-mobile.png`, fullPage: true });
  await page.locator('[data-view-target="route"]').click();
  await page.locator('#ops-live-map').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Operations live cockpit mobile');
  await page.screenshot({ path: `${output}/operations-live-cockpit-mobile.png`, fullPage: true });

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
console.log('v0.25 operational workflow browser smoke passed.');