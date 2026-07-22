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
  assert.match(await page.locator('#route-stop-list').textContent(), /Official current reference/i);

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
  assert.match(plannerContext, /High cargo exposure|Frontier cargo exposure/);
  assert.match(plannerContext, /Official current reference/);

  step = 'open sourced location intel';
  const details = page.locator('.contextual-location-intel');
  await details.waitFor({ state: 'attached' });
  await details.evaluate((element) => { element.open = true; });
  await page.locator('#locations').waitFor({ state: 'visible' });
  await selectLocation('Checkmate Station');
  await page.locator('#intel-location-name').filter({ hasText: /Checkmate Station/ }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#intel-location-system').textContent(), /Pyro/);
  assert.match(await page.locator('#intel-data-status').textContent(), /Official current reference/);
  assert.match(await page.locator('#intel-exposure-label').textContent(), /High cargo exposure/);
  assert.ok(await page.locator('#intel-sources a[href*="robertsspaceindustries.com"]').count() >= 1);
  const serviceText = await page.locator('#intel-services').textContent();
  assert.match(serviceText, /No reviewed data/);
  assert.match(serviceText, /No reviewed service record/);
  assert.match(await page.locator('#intel-boundary').textContent(), /not live shard telemetry/i);
  await noHorizontalOverflow('Checkmate context desktop');
  await page.screenshot({ path: `${output}/location-context-checkmate-desktop.png`, fullPage: true });

  step = 'verify reviewed community service layer remains separate';
  await selectLocation('Teasa');
  await page.locator('#intel-location-name').filter({ hasText: /Teasa/ }).waitFor({ state: 'visible' });
  const teasaServices = await page.locator('#intel-services').textContent();
  assert.match(teasaServices, /Hangars/);
  assert.match(teasaServices, /Available/);
  assert.match(teasaServices, /community reviewed/i);
  assert.match(await page.locator('#intel-data-status').textContent(), /Official current reference/);
  assert.ok(await page.locator('#intel-sources').getByText(/COMMUNITY/).count() >= 1);

  step = 'verify mobile context layout';
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow('Location context mobile');
  const searchButton = page.locator('#location-search button[type="submit"]');
  const searchBox = await searchButton.boundingBox();
  assert.ok(searchBox && searchBox.height >= 43, `Mobile location search target is too small: ${JSON.stringify(searchBox)}`);
  await page.screenshot({ path: `${output}/location-context-mobile.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/location-context-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/location-context-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
