import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const longMissionText = `Mission: Long-range medical consolidation for a deliberately verbose operational contract
collect teasa 8scu extremely_long_medical_supplies
collect checkmate station pyro 5scu extremely_long_medical_supplies
deliver levski nyx 13scu extremely_long_medical_supplies`;

const browser = await chromium.launch({ headless: true });
const errors = [];
let step = 'initialization';
let page;

function captureErrors(target) {
  target.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  target.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
}

async function createPage(width, height) {
  const target = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  captureErrors(target);
  await target.goto(`${baseUrl}/#route`, { waitUntil: 'networkidle' });
  await target.locator('#sidebar-toggle').waitFor({ state: 'visible' });
  return target;
}

async function clearSession(target) {
  await target.evaluate(() => {
    localStorage.removeItem('sc-companion-session-v1');
    localStorage.removeItem('sc-companion-nav-collapsed');
  });
  await target.reload({ waitUntil: 'networkidle' });
}

async function openWorkspace(target, id) {
  step = `open workspace ${id}`;
  await target.locator(`[data-view-target="${id}"]`).click();
  await target.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

async function noHorizontalOverflow(target, label) {
  const metrics = await target.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
}

async function readableTypography(target, label) {
  const result = await target.evaluate(() => {
    const candidates = [...document.querySelectorAll('.app-frame *')].filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const directText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return directText
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && box.width > 0
        && box.height > 0
        && !element.classList.contains('sr-only');
    });
    const sizes = candidates.map((element) => ({
      text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 90),
      size: Number.parseFloat(getComputedStyle(element).fontSize),
      tag: element.tagName,
      className: element.className
    }));
    return {
      minimum: Math.min(...sizes.map((item) => item.size)),
      smallest: sizes.sort((left, right) => left.size - right.size).slice(0, 12)
    };
  });
  assert.ok(result.minimum >= 11.5, `${label}: visible text below 11.5px: ${JSON.stringify(result.smallest)}`);
}

async function focusRingIsVisible(target, locator, label) {
  await locator.focus();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow
    };
  });
  assert.equal(focus.active, true, `${label}: target did not receive focus`);
  assert.ok(
    (focus.outlineStyle !== 'none' && focus.outlineWidth >= 2) || focus.boxShadow !== 'none',
    `${label}: focus is not visibly rendered: ${JSON.stringify(focus)}`
  );
}

async function minimumTouchTargets(target, label) {
  const undersized = await target.evaluate(() => [...document.querySelectorAll('button, select, input:not([type="hidden"])')]
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0 && !element.disabled;
    })
    .map((element) => ({
      text: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 50),
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height
    }))
    .filter((box) => box.height < 43));
  assert.deepEqual(undersized, [], `${label}: touch targets below 44px: ${JSON.stringify(undersized)}`);
}

async function generateLongSession(target) {
  await openWorkspace(target, 'missions');
  await target.locator('#mission-validation-panel').waitFor({ state: 'visible' });
  await target.locator('#mission-text').fill(longMissionText);
  await target.locator('#mission-form button[type="submit"]').click();
  await target.locator('#mission-validation-title').filter({ hasText: /^Ready$/ }).waitFor({ state: 'visible' });
  assert.equal(await target.locator('#mission-generate-validated').isEnabled(), true);
  await target.locator('#mission-generate-validated').click();
  await target.locator('#mission-preview-title').filter({ hasText: '1 mission generated' }).waitFor({ state: 'visible' });
}

async function inspectAllWorkspaces(target, label) {
  for (const id of ['route', 'missions', 'route-planner', 'map', 'hangar', 'roadmap']) {
    await openWorkspace(target, id);
    await noHorizontalOverflow(target, `${label} ${id}`);
    await readableTypography(target, `${label} ${id}`);
  }
}

async function exerciseTool(target, toolId) {
  step = `exercise ${toolId} tool`;
  const trigger = target.locator(`[data-ops-tool="${toolId}"]`);
  await trigger.click();
  const panel = target.locator('#ops-tool-panel');
  await panel.waitFor({ state: 'visible' });
  await noHorizontalOverflow(target, `${toolId} open`);

  await target.locator('#ops-tool-expand').focus();
  await target.keyboard.press('Enter');
  assert.equal(await panel.evaluate((element) => element.classList.contains('is-expanded')), true, `${toolId}: panel did not expand`);
  assert.equal(await panel.getAttribute('role'), 'dialog');
  assert.equal(await panel.getAttribute('aria-modal'), 'true');
  assert.equal(await target.locator('#ops-tool-expand').getAttribute('aria-label'), 'Restore auxiliary display');
  const box = await panel.boundingBox();
  const viewport = target.viewportSize();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 2 && box.y + box.height <= viewport.height + 2, `${toolId}: expanded panel escapes viewport: ${JSON.stringify(box)}`);

  const trapped = await target.evaluate(() => {
    const focusables = window.SCCompanionAccessibility.focusableElements();
    const first = focusables[0];
    const last = focusables.at(-1);
    last.focus();
    return { first: first?.id || first?.dataset?.correctionApply || first?.dataset?.routeAction || first?.textContent, last: last?.id || last?.textContent };
  });
  assert.ok(trapped.first && trapped.last, `${toolId}: expanded panel has no focusable controls`);
  await target.keyboard.press('Tab');
  assert.equal(await target.evaluate(() => document.activeElement === window.SCCompanionAccessibility.focusableElements()[0]), true, `${toolId}: focus did not wrap inside expanded panel`);

  await target.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
  await target.waitForFunction((id) => document.activeElement?.dataset?.opsTool === id, toolId);
}

async function exerciseStarmapUx(target) {
  step = 'verify Starmap route orientation and camera';
  await openWorkspace(target, 'map');
  await target.locator('#starmap-canvas .map-node').first().waitFor({ state: 'visible' });
  assert.notEqual((await target.locator('#starmap-hud-current').textContent())?.trim(), 'No active route');
  assert.notEqual((await target.locator('#starmap-hud-next').textContent())?.trim(), '—');
  assert.notEqual((await target.locator('#starmap-hud-final').textContent())?.trim(), '—');

  const stage = await target.locator('.starmap-stage-wrap').boundingBox();
  assert.ok(stage && stage.height >= 500, `Starmap surface is too short: ${JSON.stringify(stage)}`);
  const initialViewBox = await target.locator('#starmap-canvas').getAttribute('viewBox');
  await target.locator('[data-map-action="zoom-in"]').click();
  assert.notEqual(await target.locator('#starmap-canvas').getAttribute('viewBox'), initialViewBox, 'Zoom did not update the SVG camera');
  await target.locator('[data-map-action="fit"]').click();
  assert.equal(await target.locator('#starmap-canvas').getAttribute('viewBox'), '0 0 1200 720');

  step = 'verify persistent stop selection';
  const secondRouteEntry = target.locator('#starmap-route-list button').nth(1);
  const selectedStopName = (await secondRouteEntry.locator('b').textContent())?.trim();
  await secondRouteEntry.click();
  assert.equal((await target.locator('#starmap-selection-title').textContent())?.trim(), selectedStopName);
  assert.equal(await target.locator('#starmap-canvas .map-node.is-selected').count(), 1);

  step = 'verify layer does not change when route list is used';
  await target.locator('[data-map-mode="network"]').click();
  assert.equal(await target.locator('[data-map-mode="network"]').getAttribute('aria-selected'), 'true');
  await target.locator('#starmap-route-list button').nth(2).click();
  assert.equal(await target.locator('[data-map-mode="network"]').getAttribute('aria-selected'), 'true', 'Route selection silently changed the navigation layer');
  assert.equal((await target.locator('#starmap-mode').textContent())?.trim(), 'System network');

  step = 'verify network-to-system drilldown';
  await target.locator('#starmap-canvas [data-map-key="pyro"]').click();
  await target.locator('#starmap-open-system').click();
  assert.equal(await target.locator('[data-map-mode="local"]').getAttribute('aria-selected'), 'true');
  assert.equal(await target.locator('#starmap-system-select').inputValue(), 'pyro');
  assert.match((await target.locator('#starmap-mode').textContent()) ?? '', /Pyro system/);
  await noHorizontalOverflow(target, 'Starmap active desktop');
  await target.screenshot({ path: `${output}/hardening-starmap-v2-active-1664.png`, fullPage: true });
}

async function exerciseMobileStarmap(target, label) {
  step = `verify ${label} mobile Starmap details`;
  await openWorkspace(target, 'map');
  await noHorizontalOverflow(target, `${label} Starmap`);
  assert.equal(await target.locator('#starmap-context-toggle').isVisible(), true);
  await target.locator('#starmap-context-toggle').click();
  assert.equal(await target.locator('#map').evaluate((element) => element.classList.contains('is-context-open')), true);
  const box = await target.locator('#starmap-context-panel').boundingBox();
  const viewport = target.viewportSize();
  assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width + 2, `${label}: mobile details escape viewport: ${JSON.stringify(box)}`);
  await minimumTouchTargets(target, `${label} Starmap`);
  await target.screenshot({ path: `${output}/hardening-starmap-v2-mobile-details.png`, fullPage: true });
  await target.locator('#starmap-context-close').click();
  assert.equal(await target.locator('#map').evaluate((element) => element.classList.contains('is-context-open')), false);
}

let failure = null;
try {
  page = await createPage(1664, 936);
  await clearSession(page);

  step = 'verify no-route state';
  assert.match(await page.locator('#current-stop-name').textContent(), /Generate a session/i);
  assert.equal(await page.locator('#complete-stop').isDisabled(), true);
  await noHorizontalOverflow(page, 'No-route desktop');
  await readableTypography(page, 'No-route desktop');
  await page.screenshot({ path: `${output}/hardening-no-route-1664.png`, fullPage: true });

  step = 'verify keyboard tool opening and focus restoration';
  await page.keyboard.press('F1');
  await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.id === 'ops-tool-close');
  await page.keyboard.press('Escape');
  await page.locator('#ops-tool-panel').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.dataset?.opsTool === 'moves');
  await focusRingIsVisible(page, page.locator('[data-ops-tool="moves"]'), 'Operations tool key');

  step = 'generate long-content session';
  await generateLongSession(page);
  const missionText = await page.locator('#mission-cards').textContent();
  assert.match(missionText, /Long-range medical consolidation/);
  assert.match(missionText, /extremely_long_medical_supplies/);
  assert.match(missionText, /Source lines/);
  await noHorizontalOverflow(page, 'Long Missions desktop');
  await page.screenshot({ path: `${output}/hardening-long-missions-1664.png`, fullPage: true });

  await openWorkspace(page, 'route');
  assert.match(await page.locator('#route-stop-list').textContent(), /Checkmate Station|Levski/);
  for (const toolId of ['moves', 'cargo', 'adjust', 'route']) await exerciseTool(page, toolId);
  await page.screenshot({ path: `${output}/hardening-operations-long-1664.png`, fullPage: true });

  await exerciseStarmapUx(page);

  step = 'verify completed route state';
  await openWorkspace(page, 'route');
  let guard = 20;
  while (!(await page.locator('#complete-stop').isDisabled()) && guard > 0) {
    await page.locator('#complete-stop').click();
    guard -= 1;
  }
  assert.ok(guard > 0, 'Route completion exceeded safety limit');
  assert.match(await page.locator('#current-stop-name').textContent(), /complete/i);
  assert.match(await page.locator('#global-route-status').textContent(), /complete/i);
  await noHorizontalOverflow(page, 'Completed route desktop');
  await page.screenshot({ path: `${output}/hardening-route-complete-1664.png`, fullPage: true });

  step = 'verify Fleet with multiple ships';
  await openWorkspace(page, 'hangar');
  await page.locator('#hangar-model').selectOption('drake-cutlass-black');
  await page.locator('#hangar-nickname').fill('Cutlass Black — Long-range recovery and hauling configuration');
  await page.locator('#hangar-quantum').fill('XL-1 test configuration');
  await page.locator('#hangar-factor').fill('0.82');
  await page.locator('#hangar-form button[type="submit"]').click();
  await page.locator('#fleet-count').filter({ hasText: '2' }).waitFor({ state: 'visible' });
  assert.match(await page.locator('#fleet-selected-name').textContent(), /Cutlass Black/);
  assert.equal(await page.locator('#ship-hologram svg').getAttribute('aria-label'), 'Drake Cutlass Black schematic');
  await noHorizontalOverflow(page, 'Fleet multiple ships');
  await page.screenshot({ path: `${output}/hardening-fleet-multiple-1664.png`, fullPage: true });

  step = 'verify roving keyboard tabs';
  await openWorkspace(page, 'roadmap');
  const roadmapTab = page.locator('[data-development-tab="roadmap"]');
  await roadmapTab.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.developmentTab), 'changelog');
  assert.equal(await page.locator('[data-development-pane="changelog"]').isHidden(), false);
  await focusRingIsVisible(page, page.locator('[data-development-tab="changelog"]'), 'Development tab');

  await openWorkspace(page, 'map');
  await page.locator('[data-map-mode="route"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset?.mapMode), 'local');
  assert.equal(await page.locator('[data-map-mode="local"]').getAttribute('aria-pressed'), 'true');

  step = 'verify 1366 desktop density';
  await page.setViewportSize({ width: 1366, height: 768 });
  await inspectAllWorkspaces(page, '1366x768');
  await page.screenshot({ path: `${output}/hardening-development-1366.png`, fullPage: true });

  step = 'verify 768 tablet';
  await page.setViewportSize({ width: 768, height: 1024 });
  await openWorkspace(page, 'map');
  await noHorizontalOverflow(page, '768x1024 Starmap');
  await readableTypography(page, '768x1024 Starmap');
  await page.screenshot({ path: `${output}/hardening-starmap-v2-768.png`, fullPage: true });

  step = 'verify 390 mobile';
  await page.setViewportSize({ width: 390, height: 844 });
  await inspectAllWorkspaces(page, '390x844');
  await exerciseMobileStarmap(page, '390x844');
  await openWorkspace(page, 'route');
  await minimumTouchTargets(page, '390x844 Operations');
  await page.screenshot({ path: `${output}/hardening-operations-390.png`, fullPage: true });

  step = 'verify 430 mobile';
  await page.setViewportSize({ width: 430, height: 932 });
  await openWorkspace(page, 'hangar');
  await noHorizontalOverflow(page, '430x932 Fleet');
  await minimumTouchTargets(page, '430x932 Fleet');
  await page.screenshot({ path: `${output}/hardening-fleet-430.png`, fullPage: true });

  step = 'verify reduced-motion contract';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.locator('#sidebar-toggle').evaluate((element) => ({
    transitionDuration: getComputedStyle(element).transitionDuration,
    animationDuration: getComputedStyle(element).animationDuration
  }));
  assert.ok(['0s', '0.00001s'].includes(motion.transitionDuration), `Reduced motion transition remains active: ${motion.transitionDuration}`);

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/hardening-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  if (page) await page.screenshot({ path: `${output}/hardening-failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
