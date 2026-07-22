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
    const operationTitle = Number.parseFloat(getComputedStyle(document.querySelector('#current-stop-name')).fontSize);
    return {
      smallest: sizes.sort((left, right) => left.size - right.size).slice(0, 12),
      minimum: Math.min(...sizes.map((item) => item.size)),
      operationTitle
    };
  });
  assert.ok(result.minimum >= 10.5, `${label}: visible text below 10.5px: ${JSON.stringify(result.smallest)}`);
  assert.ok(result.operationTitle / result.minimum <= 3.5, `${label}: title/metadata ratio too large: ${result.operationTitle}/${result.minimum}`);
}

async function openWorkspace(id) {
  step = `open workspace ${id}`;
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

function boxesOverlap(first, second, padding = 3) {
  return first.left < second.right + padding
    && first.right > second.left - padding
    && first.top < second.bottom + padding
    && first.bottom > second.top - padding;
}

let failure = null;
try {
  step = 'load Missions';
  await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
  await page.locator('#mission-text').waitFor({ state: 'visible' });
  await page.locator('#mission-validation-panel').waitFor({ state: 'visible' });
  await page.locator('#mission-text').fill(interstellarMissionText);
  step = 'review interstellar session';
  await page.locator('#mission-form button[type="submit"]').click();
  await page.locator('#mission-validation-title').filter({ hasText: /^Ready$/ }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.validation-issue.is-error').count(), 0);
  assert.equal(await page.locator('#mission-generate-validated').isEnabled(), true);
  step = 'generate validated interstellar session';
  await page.locator('#mission-generate-validated').click();
  await page.locator('#mission-preview-title').filter({ hasText: '3 missions generated' }).waitFor({ state: 'visible' });
  const missionBody = await page.locator('#mission-cards').textContent();
  ['Checkmate Station', 'Orbituary', 'Ruin Station', 'Levski'].forEach((name) => assert.match(missionBody, new RegExp(name)));
  assert.match(missionBody, /Source lines/);
  await noHorizontalOverflow('Missions');
  await readableTypography('Missions');
  await page.screenshot({ path: `${output}/missions-validation-interstellar-desktop.png`, fullPage: true });

  await openWorkspace('route');
  step = 'inspect Operations closed';
  await page.locator('#current-stop-name').waitFor({ state: 'visible' });
  await page.locator('.route-leg-estimate').first().waitFor({ state: 'visible' });
  const routeIndexText = await page.locator('#route-stop-list').textContent();
  assert.match(routeIndexText, /Gm|km/);
  assert.match(routeIndexText, /jump/);
  await noHorizontalOverflow('Operations closed');
  await readableTypography('Operations');
  await page.screenshot({ path: `${output}/operations-interstellar-desktop.png`, fullPage: true });

  step = 'open Cargo auxiliary display';
  await page.locator('[data-ops-tool="cargo"]').click();
  const tool = page.locator('#ops-tool-panel');
  await tool.waitFor({ state: 'visible' });
  const box = await tool.boundingBox();
  assert.ok(box, 'Cargo tool has no bounding box');
  assert.ok(box.x >= 0 && box.x + box.width <= 1666, `Cargo tool escapes viewport: ${JSON.stringify(box)}`);
  assert.ok(box.width >= 700, `Cargo tool is squeezed: ${box.width}px`);
  await noHorizontalOverflow('Operations cargo open');
  await page.screenshot({ path: `${output}/operations-cargo-open.png`, fullPage: true });
  step = 'close Cargo auxiliary display';
  await page.locator('#ops-tool-close').click();
  await tool.waitFor({ state: 'hidden' });

  await openWorkspace('route-planner');
  step = 'inspect interstellar Planner';
  await page.locator('#planner-detail-panel').waitFor({ state: 'visible' });
  const plannerText = await page.locator('#route-planner').textContent();
  assert.match(plannerText, /Alpha 4\.9/);
  assert.match(plannerText, /DISTANCE/);
  assert.match(plannerText, /JUMPS/);
  assert.match(plannerText, /Gm|km/);
  await noHorizontalOverflow('Planner');
  await readableTypography('Planner');
  await page.screenshot({ path: `${output}/planner-interstellar-desktop.png`, fullPage: true });

  await openWorkspace('hangar');
  step = 'inspect Fleet';
  await page.locator('#ship-hologram svg').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#fleet-zone-form .zone-form-row').count() >= 2, 'Fleet cargo-zone editor did not render');
  await noHorizontalOverflow('Fleet');
  await readableTypography('Fleet');
  await page.screenshot({ path: `${output}/fleet-desktop.png`, fullPage: true });

  await openWorkspace('map');
  step = 'inspect Starmap';
  await page.locator('svg#starmap-canvas').waitFor({ state: 'visible' });
  assert.equal(await page.locator('canvas#starmap-canvas').count(), 0, 'Legacy canvas Starmap is still present');
  assert.ok(await page.locator('#starmap-canvas .map-node').count() > 0, 'Route-first Starmap rendered no nodes');
  const mapSummary = await page.locator('#starmap-route-status').textContent();
  assert.match(mapSummary, /Gm|km/);
  assert.match(mapSummary, /jump/);
  const mapLabels = await page.evaluate(() => {
    const canvas = document.querySelector('#starmap-canvas').getBoundingClientRect();
    return {
      canvas: { left: canvas.left, right: canvas.right, top: canvas.top, bottom: canvas.bottom },
      labels: [...document.querySelectorAll('#starmap-canvas .map-route-label')].map((text) => {
        const box = text.getBoundingClientRect();
        return { content: text.textContent, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      })
    };
  });
  mapLabels.labels.forEach((label) => {
    assert.ok(label.left >= mapLabels.canvas.left - 2, `Starmap label escapes left edge: ${JSON.stringify(label)}`);
    assert.ok(label.right <= mapLabels.canvas.right + 2, `Starmap label escapes right edge: ${JSON.stringify(label)}`);
    assert.ok(label.top >= mapLabels.canvas.top - 2, `Starmap label escapes top edge: ${JSON.stringify(label)}`);
    assert.ok(label.bottom <= mapLabels.canvas.bottom + 2, `Starmap label escapes bottom edge: ${JSON.stringify(label)}`);
  });
  for (let firstIndex = 0; firstIndex < mapLabels.labels.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < mapLabels.labels.length; secondIndex += 1) {
      const first = mapLabels.labels[firstIndex];
      const second = mapLabels.labels[secondIndex];
      assert.equal(boxesOverlap(first, second), false, `Starmap labels overlap: ${JSON.stringify({ first, second })}`);
    }
  }
  await noHorizontalOverflow('Starmap');
  await readableTypography('Starmap');
  await page.screenshot({ path: `${output}/starmap-interstellar-desktop.png`, fullPage: true });

  step = 'switch Starmap to system network';
  await page.locator('[data-map-mode="network"]').click();
  const networkText = await page.locator('#starmap-selection-detail').textContent();
  assert.match(networkText, /Alpha 4\.9/);
  await page.screenshot({ path: `${output}/starmap-systems-desktop.png`, fullPage: true });

  step = 'switch to mobile viewport';
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace('route');
  await noHorizontalOverflow('Operations mobile');
  step = 'open Moves on mobile';
  await page.locator('[data-ops-tool="moves"]').click();
  await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
  await noHorizontalOverflow('Operations mobile tool open');
  await readableTypography('Operations mobile');
  await page.screenshot({ path: `${output}/operations-mobile.png`, fullPage: true });

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
