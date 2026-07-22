import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const interstellarMissionText = `Mission A — Stanton to Pyro and Nyx
collect area18 12scu etam
deliver checkmate station pyro 5scu etam
deliver levski nyx 7scu etam

Mission B — Outer Systems Consolidation
pickup ruin station pyro 4scu neon
pickup orbituary pyro 6scu neon
pickup levski nyx 3scu titanium
deliver teasa 10scu neon 3scu titanium

Mission C — Three-System Relay
collect teasa 8scu processedfood
collect checkmate station pyro 5scu medicalsupplies
collect levski nyx 6scu titanium
deliver ruin station pyro 4scu processedfood 5scu medicalsupplies
deliver area18 4scu processedfood 2scu titanium
deliver orbituary pyro 4scu titanium`;

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

async function readableTypography(label) {
  const result = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('.app-frame *')].filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const directText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return directText && style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0 && !element.classList.contains('sr-only');
    });
    const sizes = candidates.map((element) => ({ text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 90), size: Number.parseFloat(getComputedStyle(element).fontSize), tag: element.tagName, className: element.className }));
    const operationTitle = Number.parseFloat(getComputedStyle(document.querySelector('#current-stop-name')).fontSize);
    return { smallest: sizes.sort((left, right) => left.size - right.size).slice(0, 12), minimum: Math.min(...sizes.map((item) => item.size)), operationTitle };
  });
  assert.ok(result.minimum >= 10.5, `${label}: visible text below 10.5px: ${JSON.stringify(result.smallest)}`);
  assert.ok(result.operationTitle / result.minimum <= 3.5, `${label}: title/metadata ratio too large: ${result.operationTitle}/${result.minimum}`);
}

async function openWorkspace(id) {
  step = `open workspace ${id}`;
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

async function visibleFocus(label, locator) {
  await locator.focus();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineWidth: Number.parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle, outlineColor: style.outlineColor };
  });
  assert.ok(focus.outlineWidth >= 2 && focus.outlineStyle !== 'none', `${label}: missing visible focus ${JSON.stringify(focus)}`);
}

function boxesOverlap(first, second, padding = 3) {
  return first.left < second.right + padding && first.right > second.left - padding && first.top < second.bottom + padding && first.bottom > second.top - padding;
}

let failure = null;
try {
  step = 'load empty Operations';
  await page.goto(`${baseUrl}/#route`, { waitUntil: 'networkidle' });
  await page.locator('#current-stop-name').filter({ hasText: 'Generate a session first' }).waitFor({ state: 'visible' });
  await noHorizontalOverflow('Operations empty');
  await readableTypography('Operations empty');
  await visibleFocus('Primary navigation', page.locator('[data-view-target="missions"]'));
  await page.screenshot({ path: `${output}/operations-empty-desktop.png`, fullPage: true });

  await openWorkspace('missions');
  await page.locator('#mission-text').fill(interstellarMissionText);
  step = 'generate interstellar session';
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-preview-title').filter({ hasText: '3 missions ready' }).waitFor({ state: 'visible' });
  const missionBody = await page.locator('#mission-cards').textContent();
  ['Checkmate Station', 'Orbituary', 'Ruin Station', 'Levski'].forEach((name) => assert.match(missionBody, new RegExp(name)));
  await noHorizontalOverflow('Missions 1664');
  await readableTypography('Missions 1664');
  await visibleFocus('Mission input', page.locator('#mission-text'));
  await page.screenshot({ path: `${output}/missions-interstellar-desktop.png`, fullPage: true });

  await openWorkspace('route');
  await page.locator('.route-leg-estimate').first().waitFor({ state: 'visible' });
  const routeIndexText = await page.locator('#route-stop-list').textContent();
  assert.match(routeIndexText, /Gm|km/);
  assert.match(routeIndexText, /jump/);
  await noHorizontalOverflow('Operations 1664');
  await readableTypography('Operations 1664');

  for (const toolId of ['moves', 'cargo', 'adjust', 'route']) {
    step = `test ${toolId} tool open and expanded`;
    await page.locator(`[data-ops-tool="${toolId}"]`).click();
    const tool = page.locator('#ops-tool-panel');
    await tool.waitFor({ state: 'visible' });
    await visibleFocus(`${toolId} close button`, page.locator('#ops-tool-close'));
    await page.locator('#ops-tool-expand').click();
    await tool.waitFor({ state: 'visible' });
    assert.ok(await tool.evaluate((element) => element.classList.contains('is-expanded')), `${toolId}: did not expand`);
    const box = await tool.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 1666, `${toolId}: expanded panel escapes viewport ${JSON.stringify(box)}`);
    await noHorizontalOverflow(`Operations ${toolId} expanded`);
    if (toolId === 'cargo') await page.screenshot({ path: `${output}/operations-cargo-expanded.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await tool.waitFor({ state: 'hidden' });
  }

  await openWorkspace('route-planner');
  await page.locator('#planner-detail-panel').waitFor({ state: 'visible' });
  const plannerText = await page.locator('#route-planner').textContent();
  assert.match(plannerText, /Alpha 4\.9/);
  assert.match(plannerText, /DISTANCE/);
  assert.match(plannerText, /JUMPS/);
  await noHorizontalOverflow('Planner 1664');
  await readableTypography('Planner 1664');
  await visibleFocus('Planner profile', page.locator('.planner-profile-card').first());
  await page.screenshot({ path: `${output}/planner-interstellar-desktop.png`, fullPage: true });

  await openWorkspace('hangar');
  await page.locator('#ship-hologram svg').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#fleet-zone-form .zone-form-row').count() >= 2, 'Fleet cargo-zone editor did not render');
  await noHorizontalOverflow('Fleet 1664');
  await readableTypography('Fleet 1664');
  await visibleFocus('Fleet ship card', page.locator('.hangar-card button').first());
  await page.screenshot({ path: `${output}/fleet-desktop.png`, fullPage: true });

  await openWorkspace('map');
  await page.locator('svg#starmap-canvas').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#starmap-canvas .map-node').count() > 0, 'Route-first Starmap rendered no nodes');
  const mapLabels = await page.evaluate(() => {
    const canvas = document.querySelector('#starmap-canvas').getBoundingClientRect();
    return { canvas: { left: canvas.left, right: canvas.right, top: canvas.top, bottom: canvas.bottom }, labels: [...document.querySelectorAll('#starmap-canvas .map-route-label')].map((text) => { const box = text.getBoundingClientRect(); return { content: text.textContent, left: box.left, right: box.right, top: box.top, bottom: box.bottom }; }) };
  });
  mapLabels.labels.forEach((label) => {
    assert.ok(label.left >= mapLabels.canvas.left - 2 && label.right <= mapLabels.canvas.right + 2 && label.top >= mapLabels.canvas.top - 2 && label.bottom <= mapLabels.canvas.bottom + 2, `Starmap label escapes canvas: ${JSON.stringify(label)}`);
  });
  for (let firstIndex = 0; firstIndex < mapLabels.labels.length; firstIndex += 1) for (let secondIndex = firstIndex + 1; secondIndex < mapLabels.labels.length; secondIndex += 1) assert.equal(boxesOverlap(mapLabels.labels[firstIndex], mapLabels.labels[secondIndex]), false, `Starmap labels overlap: ${JSON.stringify({ first: mapLabels.labels[firstIndex], second: mapLabels.labels[secondIndex] })}`);
  await visibleFocus('Starmap mode', page.locator('[data-map-mode="network"]'));
  await noHorizontalOverflow('Starmap 1664');
  await readableTypography('Starmap 1664');
  await page.screenshot({ path: `${output}/starmap-interstellar-desktop.png`, fullPage: true });

  step = 'audit compact desktop viewport';
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const workspace of ['route', 'missions', 'route-planner', 'hangar', 'map', 'roadmap']) {
    await openWorkspace(workspace);
    await noHorizontalOverflow(`${workspace} 1366`);
  }
  await page.screenshot({ path: `${output}/starmap-1366.png`, fullPage: true });

  step = 'audit tablet viewport';
  await page.setViewportSize({ width: 820, height: 1180 });
  for (const workspace of ['route', 'missions', 'route-planner', 'hangar', 'map']) {
    await openWorkspace(workspace);
    await noHorizontalOverflow(`${workspace} tablet`);
  }

  step = 'audit mobile viewport';
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace('route');
  await noHorizontalOverflow('Operations mobile');
  await page.locator('[data-ops-tool="moves"]').click();
  await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Operations mobile tool open');
  await readableTypography('Operations mobile');
  await page.screenshot({ path: `${output}/operations-mobile.png`, fullPage: true });

  step = 'audit narrow mobile viewport';
  await page.setViewportSize({ width: 360, height: 800 });
  for (const workspace of ['route', 'missions', 'route-planner', 'hangar', 'map']) {
    if (!(await page.locator('#ops-tool-panel').isHidden())) await page.keyboard.press('Escape');
    await openWorkspace(workspace);
    await noHorizontalOverflow(`${workspace} 360`);
  }

  step = 'check browser errors';
  assert.deepEqual(errors, [], `Browser errors:\n${errors.join('\n')}`);
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}\n\nBrowser errors:\n${errors.join('\n')}`);
  await page.screenshot({ path: `${output}/failure-state.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

if (failure) throw failure;
