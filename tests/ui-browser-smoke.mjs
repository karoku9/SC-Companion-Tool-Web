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
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
let step = 'initialization';
let failure = null;

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

async function noHorizontalOverflow(label) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert.ok(metrics.documentWidth <= metrics.viewport + 2, `${label}: document overflow ${JSON.stringify(metrics)}`);
  assert.ok(metrics.bodyWidth <= metrics.viewport + 2, `${label}: body overflow ${JSON.stringify(metrics)}`);
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

async function cockpitMetrics() {
  return page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height } : null;
    };
    const currentBody = document.querySelector('.current-operation-body');
    return {
      density: document.documentElement.dataset.opsDensity ?? '',
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      body: { width: document.body.scrollWidth, height: document.body.scrollHeight },
      page: box('.operations-page.operations-v028'),
      command: box('.ops-v027-command-deck'),
      primary: box('.ops-v027-primary-grid'),
      cargo: box('.ops-v0302-primary-cargo'),
      cargoGrid: box('.ops-v028-cargo-grid'),
      current: box('.current-operation-panel'),
      timeline: box('.ops-v027-timeline-panel'),
      timelineCard: box('.ops-v028-stop-card'),
      tools: box('.operations-tools'),
      currentBody: currentBody ? {
        clientHeight: currentBody.clientHeight,
        scrollHeight: currentBody.scrollHeight,
        overflowY: getComputedStyle(currentBody).overflowY
      } : null,
      currentTitleSize: parseFloat(getComputedStyle(document.querySelector('.current-operation-body > h2')).fontSize),
      timelineTextSize: parseFloat(getComputedStyle(document.querySelector('.ops-v028-stop-card strong')).fontSize),
      cargoTextSize: parseFloat(getComputedStyle(document.querySelector('.ops-v028-cargo-cell small')).fontSize)
    };
  });
}

function assertFittedCockpit(metrics, expectedDensity, label) {
  assert.equal(metrics.density, expectedDensity, `${label}: wrong adaptive density ${JSON.stringify(metrics)}`);
  assert.ok(metrics.page && metrics.command && metrics.primary && metrics.cargo && metrics.cargoGrid && metrics.current && metrics.timeline && metrics.timelineCard && metrics.tools && metrics.currentBody, `${label}: missing cockpit region ${JSON.stringify(metrics)}`);
  assert.ok(metrics.document.height <= metrics.viewport.height + 2, `${label}: document exceeds viewport ${JSON.stringify(metrics)}`);
  assert.ok(metrics.body.height <= metrics.viewport.height + 2, `${label}: body exceeds viewport ${JSON.stringify(metrics)}`);
  assert.ok(metrics.page.top >= -2 && metrics.page.bottom <= metrics.viewport.height + 2, `${label}: Operations page escapes viewport ${JSON.stringify(metrics)}`);
  assert.ok(metrics.command.bottom <= metrics.primary.top + 2, `${label}: command deck order is wrong ${JSON.stringify(metrics)}`);
  assert.ok(Math.abs(metrics.cargo.top - metrics.current.top) <= 2, `${label}: cargo/current row is misaligned ${JSON.stringify(metrics)}`);
  assert.ok(metrics.cargo.width > metrics.current.width, `${label}: cargo must remain the dominant instrument ${JSON.stringify(metrics)}`);
  assert.ok(metrics.cargo.height >= 450 && metrics.current.height >= 450, `${label}: primary cockpit is too short ${JSON.stringify(metrics)}`);
  assert.ok(metrics.cargoGrid.height >= 330, `${label}: cargo grid is too short ${JSON.stringify(metrics)}`);
  assert.ok(metrics.primary.bottom <= metrics.timeline.top + 2, `${label}: timeline must follow primary cockpit ${JSON.stringify(metrics)}`);
  assert.ok(metrics.timeline.bottom <= metrics.tools.top + 2, `${label}: tools must follow timeline ${JSON.stringify(metrics)}`);
  assert.ok(metrics.tools.bottom <= metrics.viewport.height + 2, `${label}: bottom controls are below the fold ${JSON.stringify(metrics)}`);
  assert.ok(metrics.timelineCard.width >= 190, `${label}: timeline cards are too narrow ${JSON.stringify(metrics)}`);
  assert.ok(metrics.currentBody.scrollHeight <= metrics.currentBody.clientHeight + 2, `${label}: common Current Step state requires internal scrolling ${JSON.stringify(metrics)}`);
  assert.ok(metrics.currentTitleSize >= 19, `${label}: Current Step title is too small ${JSON.stringify(metrics)}`);
  assert.ok(metrics.timelineTextSize >= 11.5, `${label}: timeline text is too small ${JSON.stringify(metrics)}`);
  assert.ok(metrics.cargoTextSize >= 11.5, `${label}: cargo coordinates are too small ${JSON.stringify(metrics)}`);
}

try {
  step = 'load missions-first intake';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('sc-companion-session-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'industrial');
  assert.match(await page.locator('.nav-footer span').textContent(), /CORE 0\.25.*UI 0\.29\.2/i);
  assert.equal(await page.locator('#mission-start-location').isVisible(), false);

  step = 'parse exact seven-mission sample';
  await page.locator('#mission-text').fill(realMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '7 missions' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-review-mission]').count(), 7);
  assert.equal(await page.locator('.mission-location-flag.is-ready').count(), 7);
  assert.ok(await page.locator('.cargo-chip').count() >= 15);
  await selectCurrentLocation();
  await page.locator('#mission-session-target').fill('60');
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);

  step = 'build travel-only sessions';
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  assert.ok(await page.locator('.mission-session-card').count() > 1);
  assert.match(await page.locator('#focused-route-summary').textContent(), /84 SCU total/i);
  assert.match(await page.locator('#focused-route-summary').textContent(), /Timing:\s*travel only/i);

  step = 'open inter-system session in Operations';
  const gatewaySession = page.locator('.mission-session-card').filter({ has: page.locator('.session-gateways') }).first();
  await gatewaySession.getByRole('button', { name: 'Select session' }).click();
  await page.locator('#focused-route-open').click();
  await page.locator('.operations-page.operations-v028.operations-cargo-primary-v0302').waitFor({ state: 'visible' });
  await page.locator('.ops-v0302-primary-cargo .ops-v028-cargo-cell').first().waitFor({ state: 'visible' });
  await page.locator('link[data-operations-adaptive-fit-style="0.30.3"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('.ops-live-navigation').count(), 0);
  assert.equal(await page.locator('.ops-action-bar [data-ops-action]').count(), 5);
  assert.ok(await page.locator('.ops-v028-stop-card').count() > 0);
  assert.ok(await page.locator('.ops-v028-cargo-cell').count() > 0);
  assert.doesNotMatch(await page.locator('.current-operation-panel').textContent(), /CURRENT DESTINATION/i);
  assert.equal(await page.evaluate(() => window.SCCompanionAutoCargoLayout?.version), '0.29.2');

  step = 'fit comfortable cockpit at 1600x900';
  await page.waitForFunction(() => document.documentElement.dataset.opsDensity === 'comfortable');
  const comfortable = await cockpitMetrics();
  assertFittedCockpit(comfortable, 'comfortable', '1600x900');
  await noHorizontalOverflow('Operations adaptive 1600x900');
  await page.screenshot({ path: `${output}/operations-adaptive-fit-1600x900.png`, fullPage: false });

  step = 'fit compact cockpit at 1664x800';
  await page.setViewportSize({ width: 1664, height: 800 });
  await page.waitForFunction(() => document.documentElement.dataset.opsDensity === 'compact');
  const compact = await cockpitMetrics();
  assertFittedCockpit(compact, 'compact', '1664x800');
  await noHorizontalOverflow('Operations adaptive 1664x800');
  await page.screenshot({ path: `${output}/operations-adaptive-fit-1664x800.png`, fullPage: false });

  step = 'verify explicit gateway sequence';
  const gatewaySetup = await page.evaluate(() => {
    const state = window.SCCompanionSession.getState();
    const route = window.SCCompanionRouteCorrections.deriveRoute(state.route, state.routeCorrections);
    const flow = window.SCCompanionOperationalSteps.derive(route, state);
    const index = flow.steps.findIndex((item) => item.kind === 'gateway-approach');
    if (index < 0) return null;
    const prior = flow.steps.slice(0, index);
    const completedStopIds = prior.filter((item) => item.kind === 'action').map((item) => String(item.stopId));
    window.SCCompanionSession.patch({
      operationalRouteKey: flow.routeKey,
      completedOperationalStepIds: prior.map((item) => item.id),
      completedStopIds,
      currentStopIndex: completedStopIds.length
    });
    return true;
  });
  assert.equal(gatewaySetup, true);
  await page.locator('#current-stop-name').filter({ hasText: /Travel to .*Gateway/i }).waitFor({ state: 'visible' });
  const completedBeforeGateway = await page.evaluate(() => window.SCCompanionSession.getState().completedStopIds.length);
  await page.locator('#complete-stop').click();
  await page.locator('#current-stop-name').filter({ hasText: /Jump to .*Gateway/i }).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().completedStopIds.length), completedBeforeGateway);
  await page.locator('#complete-stop').click();
  await page.locator('#current-stop-name').filter({ hasText: /Fly to /i }).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().completedStopIds.length), completedBeforeGateway);

  step = 'verify cargo grouping and mobile flow fallback';
  await page.locator('#ops-v028-cargo-mode').selectOption('mission');
  await page.waitForFunction(() => window.SCCompanionSession.getState().cargoLayoutGroupingMode === 'mission');
  await page.locator('#ops-v028-cargo-mode').selectOption('destination');
  await page.waitForFunction(() => window.SCCompanionSession.getState().cargoLayoutGroupingMode === 'destination');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.documentElement.dataset.opsDensity === 'flow');
  await page.locator('.ops-v0302-primary-cargo').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.ops-live-navigation').count(), 0);
  assert.equal(await page.locator('.ops-v028-cargo-panel').isVisible(), true);
  await noHorizontalOverflow('Operations mobile');
  await page.screenshot({ path: `${output}/operations-live-cockpit-mobile.png`, fullPage: true });

  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/failure.txt`, `Step: ${step}\n\n${error.stack ?? error}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
console.log('UI 0.30.3 adaptive-fit Operations smoke passed.');
