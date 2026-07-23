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

async function selectLocation(query) {
  await page.locator('#location-query').fill(query);
  await page.locator('#location-search button[type="submit"]').click();
}

let failure = null;
try {
  step = 'load clean mission state';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#mission-validation-panel').waitFor({ state: 'visible' });

  step = 'generate context route';
  await page.locator('#mission-text').fill(missionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-validation-title').filter({ hasText: /^Ready$/ }).waitFor({ state: 'visible' });
  await page.locator('#mission-generate-validated').click();
  await page.locator('#mission-preview-title').filter({ hasText: '1 mission generated' }).waitFor({ state: 'visible' });

  step = 'verify no cargo exposure before first pickup';
  await openWorkspace('route');
  await page.locator('[data-ops-tool="moves"]').click();
  const inlineContext = page.locator('#ops-tool-body .location-context-inline');
  await inlineContext.waitFor({ state: 'visible' });
  assert.match(await inlineContext.textContent(), /No mission cargo exposed/i);
  assert.match(await page.locator('#route-stop-list').textContent(), /Official|Reviewed community/i);

  step = 'advance to Pyro with cargo onboard';
  await page.locator('#ops-tool-close').click();
  await page.locator('#complete-stop').click();
  await page.locator('#current-stop-name').filter({ hasText: /Checkmate Station/ }).waitFor({ state: 'visible' });
  await page.locator('[data-ops-tool="moves"]').click();
  await page.locator('#ops-tool-body .location-context-inline.is-high-exposure').waitFor({ state: 'visible' });
  const exposureText = await page.locator('#ops-tool-body .location-context-inline').textContent();
  assert.match(exposureText, /High cargo exposure/i);
  assert.match(exposureText, /4 SCU/i);
  assert.match(await page.locator('#global-route-status').textContent(), /High cargo exposure/i);
  await page.screenshot({ path: `${output}/location-context-operations-pyro.png`, fullPage: true });

  step = 'verify planner leg context';
  await openWorkspace('route-planner');
  await page.locator('#planner-detail-panel').waitFor({ state: 'visible' });
  await page.locator('.planner-location-context').first().waitFor({ state: 'visible' });
  const plannerContext = await page.locator('#planner-route-list').textContent();
  assert.match(plannerContext, /High cargo exposure|Elevated cargo exposure/);
  assert.match(plannerContext, /Official|Reviewed community/i);

  step = 'open complete Checkmate location intel';
  const details = page.locator('.contextual-location-intel');
  await details.waitFor({ state: 'attached' });
  await details.evaluate((element) => { element.open = true; });
  await page.locator('#locations').waitFor({ state: 'visible' });
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

  step = 'verify mobile context layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow('Location context mobile');
  const searchButton = page.locator('#location-search button[type="submit"]');
  const searchBox = await searchButton.boundingBox();
  assert.ok(searchBox && searchBox.height >= 43, `Mobile location search target is too small: ${JSON.stringify(searchBox)}`);
  await page.screenshot({ path: `${output}/location-intel-complete-mobile.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/location-context-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/location-context-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
