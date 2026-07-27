import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const missionText = `Mission Context
collect area18 4scu etam
deliver checkmate station pyro 2scu etam
deliver levski nyx 2scu etam`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function openWorkspace(id) {
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
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

async function exposeLocationBrowser() {
  await page.evaluate(() => {
    const root = document.querySelector('#locations');
    const host = document.querySelector('.app-main');
    if (!root || !host) throw new Error('Internal location browser host is unavailable.');
    root.removeAttribute('hidden');
    root.className = 'location-browser-test';
    host.append(root);
    root.style.setProperty('display', 'block', 'important');
    root.style.setProperty('visibility', 'visible', 'important');
    root.style.setProperty('opacity', '1', 'important');
    root.style.setProperty('position', 'relative', 'important');
    root.style.setProperty('inset', 'auto', 'important');
    root.style.setProperty('width', 'calc(100% - 36px)', 'important');
    root.style.setProperty('height', 'auto', 'important');
    root.style.setProperty('min-height', '500px', 'important');
    root.style.setProperty('margin', '18px', 'important');
    root.style.setProperty('padding', '16px', 'important');
    root.style.setProperty('overflow', 'visible', 'important');
    root.style.setProperty('background', 'var(--ds-surface-panel)', 'important');
    root.style.setProperty('border', '1px solid var(--ds-border-subtle)', 'important');
    [...root.querySelectorAll('*')].forEach((element) => {
      element.style.setProperty('visibility', 'visible', 'important');
    });
  });
  await page.locator('#location-search').waitFor({ state: 'visible' });
}

async function selectLocation(query) {
  await page.locator('#location-query').fill(query, { force: true });
  await page.locator('#location-search button[type="submit"]').click({ force: true });
}

let failure = null;
try {
  step = 'load clean mission state';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), false);

  step = 'generate context route';
  await page.locator('#mission-text').fill(missionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '1 mission' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#mission-start-location').isVisible(), true);
  assert.equal(await page.locator('#focused-review-generate').isDisabled(), true);
  await selectCurrentLocation();
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });

  step = 'verify no cargo exposure before first pickup';
  await openWorkspace('route');
  await page.locator('.current-stop-intel-card').first().waitFor({ state: 'visible' });
  const currentIntel = await page.locator('.current-stop-intel').textContent();
  assert.match(currentIntel, /No mission cargo exposed/i);
  assert.match(await page.locator('#route-stop-list').textContent(), /Official|Reviewed community/i);
  assert.equal(await page.locator('.tool-keys:not([hidden])').count(), 0, 'Legacy Moves/Adjust/Route keys must remain hidden');
  assert.ok(await page.locator('.ops-action-bar [data-ops-action]').count() >= 5);

  step = 'advance through optimized route to Pyro';
  let pyroGuard = 8;
  while (!/Checkmate Station/i.test(await page.locator('#current-stop-name').textContent()) && pyroGuard > 0) {
    assert.equal(await page.locator('#complete-stop').isDisabled(), false, 'Route completed before reaching Checkmate');
    await page.locator('#complete-stop').click();
    pyroGuard -= 1;
  }
  assert.ok(pyroGuard > 0, 'Optimized route did not reach Checkmate within the expected stop count');
  await page.locator('#current-stop-name').filter({ hasText: /Checkmate Station/ }).waitFor({ state: 'visible' });
  const exposureCard = page.locator('.current-stop-exposure-card').filter({ hasText: /High cargo exposure/i });
  await exposureCard.waitFor({ state: 'visible' });
  const exposureText = await exposureCard.textContent();
  assert.match(exposureText, /High cargo exposure/i);
  assert.match(exposureText, /[24] SCU/i);
  await page.locator('#global-route-status').filter({ hasText: /High cargo exposure/i }).waitFor({ state: 'visible' });
  assert.ok(await page.locator('#ops-live-map .ops-map-gateway').count() >= 2);
  assert.match(await page.locator('#ops-next-leg-strip').textContent(), /Gateway/i);
  assert.ok(await page.locator('.current-stop-intel-card .intel-icon').count() >= 5);
  await page.screenshot({ path: `${output}/location-context-operations-pyro.png`, fullPage: true });

  step = 'open complete Checkmate location intel';
  await exposeLocationBrowser();
  await selectLocation('Checkmate Station');
  await page.locator('#intel-location-name').filter({ hasText: /Checkmate Station/ }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#intel-location-system').textContent(), /Pyro/);
  assert.match(await page.locator('#intel-data-status').textContent(), /Official|Reviewed community/i);
  assert.match(await page.locator('#intel-risk-label').textContent(), /Extreme frontier exposure/);
  assert.match(await page.locator('#intel-exposure-label').textContent(), /High cargo exposure/);
  assert.ok(await page.locator('#intel-sources a[href*="robertsspaceindustries.com"]').count() >= 1);
  assert.ok(await page.locator('#intel-sources a[href*="scunpacked-data"]').count() >= 1);
  const serviceText = await page.locator('#intel-services').textContent();
  assert.match(serviceText, /Fuel, repair & rearm/);
  assert.match(serviceText, /Food & drink/);
  assert.match(serviceText, /Medical care/);
  assert.match(serviceText, /Available/);
  assert.match(serviceText, /Unregulated/);
  assert.doesNotMatch(serviceText, /No reviewed service record/);
  assert.match(await page.locator('#intel-boundary').textContent(), /not.*live shard/i);
  await noHorizontalOverflow('Checkmate context desktop');
  await page.screenshot({ path: `${output}/location-intel-complete-checkmate-desktop.png`, fullPage: true });

  step = 'verify ARC-L2 refinery and protected rest-stop profile';
  await selectLocation('ARC-L2');
  await page.locator('#intel-location-name').filter({ hasText: /Lively Pathway/ }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#intel-risk-label').textContent(), /Guarded but isolated rest stop/);
  const arcServices = await page.locator('#intel-services').textContent();
  assert.match(arcServices, /Refinery/);
  assert.match(arcServices, /A refinery deck/);
  assert.match(arcServices, /Food & drink/);
  assert.match(arcServices, /Fuel, repair & rearm/);
  await page.screenshot({ path: `${output}/location-intel-complete-arc-l2-desktop.png`, fullPage: true });

  step = 'verify Grim HEX is useful but explicitly high risk';
  await selectLocation('Grim HEX');
  await page.locator('#intel-location-name').filter({ hasText: /Grim HEX/ }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#intel-risk-label').textContent(), /High-risk outlaw hub/);
  const grimServices = await page.locator('#intel-services').textContent();
  assert.match(grimServices, /Green Imperial Medical/);
  assert.match(grimServices, /Outlaw and unregulated commerce/);

  step = 'verify major spaceport direct and transfer services';
  await selectLocation('Teasa');
  await page.locator('#intel-location-name').filter({ hasText: /Teasa/ }).waitFor({ state: 'visible' });
  const teasaServices = await page.locator('#intel-services').textContent();
  assert.match(teasaServices, /Fuel, repair & rearm/);
  assert.match(teasaServices, /Food & drink/);
  assert.match(teasaServices, /Local transfer/);
  assert.match(teasaServices, /New Deal and Vantage Rentals/);
  assert.match(await page.locator('#intel-risk-label').textContent(), /Low static location risk/);
  assert.ok(await page.locator('#intel-sources').getByText(/COMMUNITY|GAME-DATA/).count() >= 1);

  step = 'verify surface outpost essentials';
  await selectLocation('HDMS Bezdek');
  await page.locator('#intel-location-name').filter({ hasText: /HDMS-Bezdek/ }).waitFor({ state: 'visible' });
  assert.equal((await page.locator('#location-type').textContent()).trim(), 'Surface outpost');
  assert.match(await page.locator('#intel-risk-label').textContent(), /Elevated surface-outpost exposure/);
  assert.equal((await page.locator('#intel-essential-fuel').textContent()).trim(), 'Available');
  assert.equal((await page.locator('#intel-essential-food').textContent()).trim(), 'Not available');
  assert.equal((await page.locator('#intel-essential-medical').textContent()).trim(), 'Not available');
  const bezdekServices = await page.locator('#intel-services').textContent();
  assert.match(bezdekServices, /Ground vehicles/);
  assert.match(bezdekServices, /Commodity trade/);
  await page.screenshot({ path: `${output}/location-intel-hdms-bezdek-desktop.png`, fullPage: true });

  step = 'verify distribution center profile';
  await selectLocation('S4LD01');
  await page.locator('#intel-location-name').filter({ hasText: /S4LD01/ }).waitFor({ state: 'visible' });
  assert.equal((await page.locator('#location-type').textContent()).trim(), 'Distribution center');
  const depotServices = await page.locator('#intel-services').textContent();
  assert.match(depotServices, /Cargo servicesAvailable/);
  assert.match(depotServices, /Food & drinkLimited/);
  assert.match(await page.locator('#intel-risk-label').textContent(), /Elevated industrial-site exposure/);
  await page.screenshot({ path: `${output}/location-intel-s4ld01-desktop.png`, fullPage: true });

  step = 'verify unregulated surface site';
  await selectLocation('Buds Growery');
  await page.locator('#intel-location-name').filter({ hasText: /Bud's Growery/ }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#intel-risk-label').textContent(), /High-risk unregulated surface site/);
  assert.match(await page.locator('#intel-services').textContent(), /Unregulated tradeUnregulated/);

  step = 'verify mobile context layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await selectLocation('HDMS Bezdek');
  await noHorizontalOverflow('Location context mobile');
  const searchButton = page.locator('#location-search button[type="submit"]');
  const searchBox = await searchButton.boundingBox();
  assert.ok(searchBox && searchBox.height >= 43, `Mobile location search target is too small: ${JSON.stringify(searchBox)}`);
  assert.equal(await page.locator('.location-essentials article').count(), 4);
  await page.screenshot({ path: `${output}/location-intel-field-mobile.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/location-context-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/location-context-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
