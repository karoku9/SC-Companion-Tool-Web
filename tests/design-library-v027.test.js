'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const system = require('../design-system.js');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('v0.27 defines an original industrial design language', () => {
  assert.equal(system.version, '0.27');
  assert.equal(system.currentThemeId, 'industrial');
  assert.equal(system.themes.industrial.manufacturer, null);
  assert.equal(Object.values(system.inspirationBlend).filter(Number.isFinite).reduce((sum, value) => sum + value, 0), 100);
  assert.ok(Math.min(...Object.values(system.primitive.type)) >= 12);
  assert.match(system.principles.join(' '), /no copied game assets/i);
  assert.match(system.principles.join(' '), /No glassmorphism/i);
  assert.match(system.productQuestions.operations, /Where do I go next/i);
});

test('design library exposes tokens, primitives and hauling-domain components', () => {
  const css = read('design-library-v027.css');
  [
    '--scx-surface-canvas', '--scx-content-primary', '--scx-action-primary',
    '.scx-button', '.scx-field', '.scx-tabs', '.scx-status', '.scx-mission-card',
    '.scx-objective-row', '.scx-cargo-chip', '.scx-data-table', '.scx-route-timeline'
  ].forEach((contract) => assert.match(css, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /glassmorphism|neon glow/i);
});

test('research and reference policy separate derivation from asset copying', () => {
  const research = read('docs/ui-ux-research-v027.md');
  const references = read('reference/README.md');
  assert.match(research, /must not reproduce CIG artwork/i);
  assert.match(research, /Commodity Shop interaction patterns: 40%/i);
  assert.match(research, /SC Hauler Helper and Schaulers Manifest/i);
  assert.match(references, /does not commit a bulk mirror/i);
  assert.match(references, /Do not copy logos, proprietary fonts, textures, illustrations, screen compositions, or extracted game assets/i);
  assert.match(references, /100–150 high-value references total/i);
});

test('visual laboratory uses only local project runtimes', () => {
  const html = read('design-library.html');
  assert.match(html, /Industrial Hauling Design Library/);
  assert.match(html, /scx-mission-card/);
  assert.match(html, /scx-data-table/);
  assert.match(html, /scx-route-timeline/);
  assert.match(html, /src="\.\/mfd-icons\.js"/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test('approved industrial direction is consolidated into the active stylesheet', () => {
  const app = read('app.js');
  const css = read('ui/app.css');
  assert.match(app, /ui\/app-shell\.js/);
  assert.match(css, /--surface:/);
  assert.match(css, /--amber:/);
  assert.match(css, /--cyan:/);
  assert.match(css, /--green:/);
  assert.match(css, /--red:/);
  assert.match(css, /\.command-panel/);
  assert.doesNotMatch(app, /operations-rebuild-v040|ui-v2/);
});
