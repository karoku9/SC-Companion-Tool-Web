import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const baseUrl = process.env.UI_BASE_URL ?? 'http://127.0.0.1:4173';
const output = process.env.UI_SCREENSHOT_DIR ?? 'ui-smoke-artifacts';
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
let failure = null;
let step = 'initialization';

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert.ok(metrics.document <= metrics.viewport + 2, `${label}: document overflow ${metrics.document} > ${metrics.viewport}`);
  assert.ok(metrics.body <= metrics.viewport + 2, `${label}: body overflow ${metrics.body} > ${metrics.viewport}`);
}

async function assertFocusVisible(page, locator, label) {
  await locator.focus();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
  });
  const hasOutline = Number.parseFloat(focus.outlineWidth) >= 2 && focus.outlineStyle !== 'none';
  const hasRing = focus.boxShadow && focus.boxShadow !== 'none';
  assert.ok(hasOutline || hasRing, `${label}: no visible keyboard focus ${JSON.stringify(focus)}`);
}

async function openWorkspace(page, id) {
  await page.locator(`[data-view-target="${id}"]`).click();
  await page.locator(`[data-view="${id}"]`).waitFor({ state: 'visible' });
}

async function freshPage(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  return { context, page, errors };
}

try {
  step = 'empty Operations at 1366x768';
  {
    const { context, page, errors } = await freshPage({ width: 1366, height: 768 });
    await page.goto(`${baseUrl}/#route`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.SCCompanionSession.reset());
    await page.locator('#current-stop-name').filter({ hasText: 'Generate a session first' }).waitFor();
    await assertNoOverflow(page, 'empty Operations 1366');
    await assertFocusVisible(page, page.locator('[data-ops-tool="moves"]'), 'Operations function key');
    await page.screenshot({ path: `${output}/v017-operations-empty-1366.png`, fullPage: true });

    for (const toolId of ['moves', 'cargo', 'adjust', 'route']) {
      step = `open and expand ${toolId}`;
      const button = page.locator(`[data-ops-tool="${toolId}"]`);
      await button.click();
      const panel = page.locator('#ops-tool-panel');
      await panel.waitFor({ state: 'visible' });
      await assertNoOverflow(page, `${toolId} open 1366`);
      await page.locator('#ops-tool-expand').click();
      await assertNoOverflow(page, `${toolId} expanded 1366`);
      const box = await panel.boundingBox();
      assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1368 && box.y + box.height <= 770, `${toolId} expanded outside viewport: ${JSON.stringify(box)}`);
      await page.screenshot({ path: `${output}/v017-tool-${toolId}-expanded-1366.png`, fullPage: true });
      await page.keyboard.press('Escape');
      await panel.waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, [], errors.join('\n'));
    await context.close();
  }

  step = 'long content and completed route';
  {
    const { context, page, errors } = await freshPage({ width: 1366, height: 768 });
    await page.goto(`${baseUrl}/#missions`, { waitUntil: 'networkidle' });
    const longMission = `Extremely Long Multi System Humanitarian Logistics Contract With Verified Cargo Provenance And Priority Handling\ncollect teasa 2scu ultralongprocessedmedicalsuppliescontainer\ndeliver area18 2scu ultralongprocessedmedicalsuppliescontainer`;
    await page.locator('#mission-text').fill(longMission);
    await page.locator('#mission-form button[type="submit"]').click();
    await page.locator('#mission-cards .mission-card').first().waitFor();
    assert.match(await page.locator('#mission-cards').textContent(), /ultralongprocessedmedicalsuppliescontainer/i);
    await assertNoOverflow(page, 'long mission 1366');
    await page.screenshot({ path: `${output}/v017-long-content-1366.png`, fullPage: true });

    await openWorkspace(page, 'route');
    while (await page.locator('#complete-stop').isEnabled()) {
      await page.locator('#complete-stop').click();
    }
    await page.locator('#ops-stop-state').filter({ hasText: 'COMPLETE' }).waitFor();
    await assertNoOverflow(page, 'completed Operations 1366');
    await page.screenshot({ path: `${output}/v017-operations-complete-1366.png`, fullPage: true });
    assert.deepEqual(errors, [], errors.join('\n'));
    await context.close();
  }

  step = 'Fleet with multiple ships and Cutlass';
  {
    const { context, page, errors } = await freshPage({ width: 1366, height: 768 });
    await page.goto(`${baseUrl}/#hangar`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const state = window.SCCompanionSession.getState();
      window.SCCompanionSession.patch({
        selectedShipId: 'cutlass-main',
        selectedShipModelId: 'drake-cutlass-black',
        hangarShips: [
          ...state.hangarShips.filter((ship) => ship.id !== 'cutlass-main'),
          {
            id: 'cutlass-main', modelId: 'drake-cutlass-black', nickname: 'Blackbird',
            cargoCapacityScu: 46, quantumDrive: 'Crossfield', quantumTimeFactor: 0.86,
            notes: 'Daily hauling ship with side-door access.'
          }
        ]
      });
    });
    await page.locator('.hangar-card').filter({ hasText: 'Blackbird' }).waitFor();
    assert.ok(await page.locator('.hangar-card').count() >= 2, 'multiple ships did not render');
    assert.match(await page.locator('#ship-hologram').textContent(), /Cutlass Black/i);
    await assertNoOverflow(page, 'Fleet Cutlass 1366');
    await page.screenshot({ path: `${output}/v017-fleet-cutlass-multiple-1366.png`, fullPage: true });
    assert.deepEqual(errors, [], errors.join('\n'));
    await context.close();
  }

  for (const viewport of [{ width: 430, height: 932 }, { width: 360, height: 800 }]) {
    step = `mobile ${viewport.width}`;
    const { context, page, errors } = await freshPage(viewport);
    await page.goto(`${baseUrl}/#route`, { waitUntil: 'networkidle' });
    await assertNoOverflow(page, `Operations mobile ${viewport.width}`);
    const picker = page.locator('.mobile-page-picker');
    await assertFocusVisible(page, picker, `mobile workspace picker ${viewport.width}`);
    await page.locator('[data-ops-tool="cargo"]').click();
    await page.locator('#ops-tool-panel').waitFor({ state: 'visible' });
    await assertNoOverflow(page, `mobile cargo ${viewport.width}`);
    await page.screenshot({ path: `${output}/v017-operations-mobile-${viewport.width}.png`, fullPage: true });
    assert.deepEqual(errors, [], errors.join('\n'));
    await context.close();
  }
} catch (error) {
  failure = error;
  await fs.writeFile(`${output}/v017-failure.txt`, `Step: ${step}\n\n${error.stack ?? error.message}`);
} finally {
  await browser.close();
}

if (failure) throw failure;
