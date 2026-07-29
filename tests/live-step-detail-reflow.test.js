'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Live Ops dispatches presentation by operational step type', () => {
  const shell = read('ui/app-shell.js');

  assert.match(shell, /function renderStepDetails\(step, state, layout, capacity, onboard\)/);
  assert.match(shell, /function renderTravelDetails\(/);
  assert.match(shell, /function renderGatewayApproachDetails\(/);
  assert.match(shell, /function renderJumpTransitDetails\(/);
  assert.match(shell, /function renderCargoOperationDetails\(/);
  assert.match(shell, /data-step-detail="complete"/);
  assert.doesNotMatch(shell, /First objective after jump/i);
});

test('Jump Transit uses compact metrics and an accessible bounded action list', () => {
  const shell = read('ui/app-shell.js');

  assert.match(shell, /function getVisibleStepActions\(actions, limit = 3, expanded = false\)/);
  assert.match(shell, /function renderExpandableActionList\(step, actions, layout, limit = 3\)/);
  assert.match(shell, /aria-expanded="\$\{expanded\}"/);
  assert.match(shell, /data-action="toggle-step-actions"/);
  assert.match(shell, /First actions after transit/);
  assert.match(shell, /UNLOAD FIRST/);
  assert.match(shell, /LOAD AFTER/);
  assert.match(shell, /class="cargo-action-journey"/);
  assert.match(shell, /<b>FROM<\/b>/);
  assert.match(shell, /<b>TO<\/b>/);
  assert.match(shell, /class="cargo-action-cells"/);
  assert.match(shell, /title="\$\{escapeHtml\(operation\.missionTitle \?\? ''\)\}"/);
  assert.match(shell, /Jump count/);
  assert.match(shell, /Estimated duration/);
  assert.match(shell, /Cargo onboard/);
  assert.match(shell, /Missions in transfer/);
});

test('step context reflows without shrinking operational typography', () => {
  const css = read('ui/app.css');

  assert.match(css, /\.step-detail-path \{ display: grid; grid-template-columns: repeat\(3/);
  assert.match(css, /\.step-metrics \{[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(css, /\.cargo-action-groups \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(260px, 100%\), 1fr\)\)/);
  assert.match(css, /\.cargo-action-item\.is-unload[\s\S]*var\(--amber\)/);
  assert.match(css, /\.cargo-action-item\.is-load[\s\S]*var\(--cyan\)/);
  assert.match(css, /\.command-main h1 \{[\s\S]*font-size: clamp\(32px, 3vw, 44px\)/);
  assert.match(css, /\.cargo-grid \{[\s\S]*width: clamp\(280px, 58%, 360px\)/);
  assert.match(css, /\.app-shell\.is-live-active \.command-main h1 \{[\s\S]*font-size: clamp\(32px, 3vw, 44px\)/);
  assert.doesNotMatch(css, /\.command-panel[\s\S]{0,100}overflow-y:\s*(auto|scroll)/);
});
