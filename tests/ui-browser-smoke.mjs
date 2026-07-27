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
  step = 'load missions-first intake';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.locator('.mission-steps').waitFor({ state: 'visible' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'industrial');
  assert.match(await page.locator('.brand-text').textContent(), /SC Companion/i);

  step = 'verify reduced navigation and deferred route settings';
  assert.equal(await page.locator('.nav-group[data-nav-group="plan"]').count(), 0);
  assert.equal(await page.locator('.nav-group[data-nav-group="manage"]').count(), 0);
  assert.equal(await page.locator('#mission-start-location').isVisible(), false);
  assert.equal(await page.locator('#mission-route-mode').inputValue(), 'sessions');
  assert.equal(await page.locator('#mission-session-target').inputValue(), '60');
  assert.deepEqual(await visibleStage(), { input: true, review: false, route: false });
  await noHorizontalOverflow('Missions input desktop');
  await page.screenshot({ path: `${output}/missions-focused-input-desktop.png`, fullPage: true });

  step = 'analyze exact seven-mission sample before route settings';
  await page.locator('#mission-text').fill(realMissionText);
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#focused-review-count').filter({ hasText: '7 missions' }).waitFor({ state: 'visible' });
  assert.deepEqual(await visibleStage(), { input: false, review: true, route: false });
  assert.equal(await page.locator('#mission-start-location').isVisible(), true);
  assert.equal(await page.locator('[data-review-mission]').count(), 7);
  assert.equal(await page.locator('.mission-location-flag.is-ready').count(), 7);
  assert.ok(await page.locator('.cargo-chip').count() >= 15);
  assert.match(await page.locator('[data-review-mission="0"] .mission-location-name').first().textContent(), /Attritus PAF-III/i);
  assert.match(await page.locator('[data-review-mission="1"] .mission-cargo-chips').first().textContent(), /5×\s*hydrogen/i);
  assert.match(await page.locator('[data-review-mission="3"] .mission-cargo-chips').first().textContent(), /32×\s*revenant tree pollen/i);
  assert.equal(await page.locator('.mission-cargo-edit:visible').count(), 0, 'Raw cargo fields must stay hidden in the graphical run sheet');
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), false, 'Route build remains blocked until current location is selected');

  step = 'select current location and exact travel budget';
  const grimHexValue = await page.locator('#mission-start-location-list option').evaluateAll((options) => options.find((option) => /grim hex/i.test(option.value))?.value ?? '');
  assert.ok(grimHexValue, 'Grim HEX is missing from current-location suggestions');
  await page.locator('#mission-start-location').fill(grimHexValue);
  await page.locator('#mission-start-location').dispatchEvent('change');
  await page.locator('#mission-start-location-status[data-state="ready"]').waitFor({ state: 'visible' });
  await page.locator('#mission-session-target').fill('60');
  assert.equal(await page.locator('#focused-review-generate').isEnabled(), true);
  await noHorizontalOverflow('Missions review desktop');
  await page.screenshot({ path: `${output}/missions-focused-review-desktop.png`, fullPage: true });

  step = 'build exact sixty-minute travel sessions';
  await page.locator('#focused-review-generate').click();
  await page.locator('[data-stage="route"][aria-current="step"]').waitFor({ state: 'visible' });
  assert.deepEqual(await visibleStage(), { input: false, review: false, route: true });
  const sessionCards = page.locator('.mission-session-card');
  assert.ok(await sessionCards.count() > 1, 'Seven-mission fixture should be split into multiple play sessions');
  const routeSummary = await page.locator('#focused-route-summary').textContent();
  assert.match(routeSummary, /84 SCU total/i);
  assert.match(routeSummary, /Timing:\s*travel only/i);
  assert.match(routeSummary, /Session 1/i);
  assert.match(routeSummary, /Stanton Gateway/i);
  assert.match(routeSummary, /Pyro Gateway/i);
  const sessionMissionCounts = await sessionCards.evaluateAll((cards) => cards.map((card) => card.querySelectorAll('li').length));
  assert.equal(sessionMissionCounts.reduce((sum, count) => sum + count, 0), 7);
  const timingLabels = await sessionCards.locator('header > strong').allTextContents();
  assert.ok(timingLabels.every((label) => /~\d+ min travel/i.test(label)), `Unexpected timing labels: ${timingLabels.join(' | ')}`);

  const fullRouteAudit = await page.evaluate(() => {
    const state = window.SCCompanionSession.getState();
    const route = state.routePlan.fullRoute;
    const systems = route.stops.map((stop) => window.SCCompanionLocations.getSystemForLocation(stop.locationId)?.id ?? 'unknown');
    const collapsedSystems = systems.filter((system, index) => index === 0 || system !== systems[index - 1]);
    return {
      systemTransitions: Math.max(0, collapsedSystems.length - 1),
      collapsedSystems,
      jumpCount: route.estimate?.totalJumpCount ?? null,
      grimVisits: route.stops.filter((stop) => /grim-hex/.test(stop.locationId)).length,
      strategy: route.optimization?.strategy
    };
  });
  assert.equal(fullRouteAudit.strategy, 'phase-safe-fastest');
  assert.ok(fullRouteAudit.systemTransitions <= 2, `Unexpected system backtracking: ${JSON.stringify(fullRouteAudit)}`);
  assert.ok(fullRouteAudit.jumpCount === null || fullRouteAudit.jumpCount <= 2, `Unexpected jump count: ${JSON.stringify(fullRouteAudit)}`);
  assert.ok(fullRouteAudit.grimVisits >= 2, 'The late Fallow-dependent Grim HEX delivery must remain a separate route phase');
  await noHorizontalOverflow('Missions sessions desktop');
  await page.screenshot({ path: `${output}/missions-focused-sessions-desktop.png`, fullPage: true });

  step = 'open an inter-system session in Operations';
  const gatewaySession = page.locator('.mission-session-card').filter({ has: page.locator('.session-gateways') }).first();
  assert.equal(await gatewaySession.isVisible(), true);
  await gatewaySession.getByRole('button', { name: 'Select session' }).click();
  await page.locator('#focused-route-open').click();
  await page.locator('.operations-page.operations-v028').waitFor({ state: 'visible' });
  await page.locator('#current-stop-name').waitFor({ state: 'visible' });
  await page.locator('#ops-live-map .ops-map-node').first().waitFor({ state: 'visible' });
  await page.locator('.ops-v027-command-deck').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.operations-page').evaluate((element) => element.classList.contains('operations-v027')), true);
  assert.equal(await page.locator('.operations-page').evaluate((element) => element.classList.contains('operations-v028')), true);
  assert.ok(await page.locator('#ops-live-map .ops-map-leg').count() > 0);
  assert.match(await page.locator('#ops-session-summary').textContent(), /max 60 min travel/i);
  assert.match(await page.locator('#ops-v027-budget').textContent(), /60 min travel/i);
  assert.match(await page.locator('#ops-v027-gateway').textContent(), /Gateway/i);
  assert.ok(await page.locator('.ops-v028-stop-card').count() > 0);
  assert.equal(await page.locator('.ops-v028-stop-system').count(), await page.locator('.ops-v028-stop-card').count());
  assert.equal(await page.locator('.ops-v028-stop-cargo').count(), await page.locator('.ops-v028-stop-card').count());
  assert.ok((await page.locator('.ops-v028-stop-cargo').allTextContents()).every((text) => /SCU.*free/i.test(text)));
  assert.equal(await page.locator('.ops-v027-legacy-sequence').isVisible(), false);
  assert.equal(await page.locator('.ops-action-bar [data-ops-action]').count(), 5);
  assert.equal(await page.locator('.ops-v028-cargo-panel').isVisible(), true);
  assert.ok(await page.locator('.ops-v028-cargo-cell').count() > 0);
  assert.doesNotMatch(await page.locator('.current-operation-panel').textContent(), /CURRENT DESTINATION/i);

  const flowAudit = await page.evaluate(() => {
    const state = window.SCCompanionSession.getState();
    const route = window.SCCompanionRouteCorrections.deriveRoute(state.route, state.routeCorrections);
    const flow = window.SCCompanionOperationalSteps.derive(route, state);
    return {
      kinds: flow.steps.map((item) => item.kind),
      titles: flow.steps.map((item) => item.title),
      currentKind: flow.currentStep?.kind,
      currentTitle: flow.currentStep?.title
    };
  });
  assert.ok(flowAudit.kinds.includes('gateway-approach'), `Missing gateway approach: ${JSON.stringify(flowAudit)}`);
  assert.ok(flowAudit.kinds.includes('jump'), `Missing gateway jump: ${JSON.stringify(flowAudit)}`);
  assert.ok(flowAudit.kinds.includes('travel'), `Missing post-jump travel: ${JSON.stringify(flowAudit)}`);
  assert.ok(flowAudit.kinds.includes('action'), `Missing stop action: ${JSON.stringify(flowAudit)}`);

  const layout = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height } : null;
    };
    return {
      command: box('.ops-v027-command-deck'),
      primary: box('.ops-v027-primary-grid'),
      map: box('.ops-live-navigation'),
      current: box('.current-operation-panel'),
      timeline: box('.ops-v027-timeline-panel'),
      cargo: box('.ops-v028-cargo-panel'),
      tools: box('.operations-tools')
    };
  });
  assert.ok(layout.command && layout.primary && layout.map && layout.current && layout.timeline && layout.cargo && layout.tools, `Missing Operations layout regions: ${JSON.stringify(layout)}`);
  assert.ok(layout.command.bottom <= layout.primary.top + 2, `Command deck must precede the primary workspace: ${JSON.stringify(layout)}`);
  assert.ok(Math.abs(layout.map.top - layout.current.top) <= 2, `Map and current step must share a row: ${JSON.stringify(layout)}`);
  assert.ok(layout.map.width > layout.current.width, `Map must remain the primary visual surface: ${JSON.stringify(layout)}`);
  assert.ok(layout.primary.bottom <= layout.timeline.top + 2, `Timeline must follow the primary workspace: ${JSON.stringify(layout)}`);
  assert.ok(layout.timeline.bottom <= layout.cargo.top + 2, `Cargo layout must follow the stop timeline: ${JSON.stringify(layout)}`);
  assert.ok(layout.cargo.bottom <= layout.tools.top + 2, `Operational editing tools must follow the cargo layout: ${JSON.stringify(layout)}`);
  await noHorizontalOverflow('Operations live cockpit desktop');
  await page.screenshot({ path: `${output}/operations-live-cockpit-desktop.png`, fullPage: true });

  step = 'advance through the explicit gateway sequence';
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
    return { completedStopCount: completedStopIds.length };
  });
  assert.ok(gatewaySetup, 'Selected inter-system session did not expose a gateway approach');
  await page.locator('#current-stop-name').filter({ hasText: /Travel to .*Gateway/i }).waitFor({ state: 'visible' });
  assert.ok(await page.locator('#ops-live-map .ops-map-gateway').count() >= 2);
  const gatewayY = await page.locator('#ops-live-map .ops-map-gateway').evaluateAll((nodes) => nodes.map((node) => Number(/translate\([^ ]+ ([^)]+)\)/.exec(node.getAttribute('transform') ?? '')?.[1])).filter(Number.isFinite));
  assert.equal(new Set(gatewayY).size, 1, `Gateway nodes are vertically misaligned: ${gatewayY.join(', ')}`);
  const stopsBeforeTravel = await page.evaluate(() => window.SCCompanionSession.getState().completedStopIds.length);
  await page.locator('#complete-stop').click();
  await page.locator('#current-stop-name').filter({ hasText: /Jump to .*Gateway/i }).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().completedStopIds.length), stopsBeforeTravel, 'Reaching a gateway must not complete a cargo stop');
  await page.locator('#complete-stop').click();
  await page.locator('#current-stop-name').filter({ hasText: /Fly to /i }).waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.SCCompanionSession.getState().completedStopIds.length), stopsBeforeTravel, 'Completing a jump must not complete a cargo stop');
  await page.screenshot({ path: `${output}/operations-explicit-gateway-desktop.png`, fullPage: true });

  step = 'verify destination and mission cargo grouping';
  assert.equal(await page.locator('#ops-v028-cargo-mode').inputValue(), 'destination');
  await page.locator('#ops-v028-cargo-mode').selectOption('mission');
  await page.waitForFunction(() => window.SCCompanionSession.getState().cargoLayoutGroupingMode === 'mission');
  assert.equal(await page.locator('#ops-v028-cargo-mode').inputValue(), 'mission');
  await page.locator('#ops-v028-cargo-mode').selectOption('destination');
  await page.waitForFunction(() => window.SCCompanionSession.getState().cargoLayoutGroupingMode === 'destination');

  step = 'verify route order editor opens';
  await page.locator('[data-ops-action="order"]').click();
  await page.locator('.ops-editor-drawer').waitFor({ state: 'visible' });
  assert.ok(await page.locator('.ops-order-row').count() > 0);
  await page.locator('#ops-editor-close').click();
  await page.locator('.ops-editor-drawer').waitFor({ state: 'hidden' });

  step = 'verify mobile visual review and cockpit';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-view-target="missions"]').click();
  await page.locator('[data-stage="review"]').click();
  await page.locator('[data-review-mission]').first().waitFor({ state: 'visible' });
  await noHorizontalOverflow('Missions review mobile');
  await page.screenshot({ path: `${output}/missions-focused-review-mobile.png`, fullPage: true });
  await page.locator('[data-view-target="route"]').click();
  await page.locator('#ops-live-map').waitFor({ state: 'visible' });
  await page.locator('.operations-page.operations-v028').waitFor({ state: 'visible' });
  assert.ok(await page.locator('.ops-v028-stop-card').count() > 0);
  assert.equal(await page.locator('.ops-v028-cargo-panel').isVisible(), true);
  assert.equal(await page.locator('.ops-editor-drawer').isVisible(), false);
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
console.log('v0.28 explicit route flow and destination-aware cargo layout smoke passed.');
