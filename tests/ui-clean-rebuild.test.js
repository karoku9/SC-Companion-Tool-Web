'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the rebuilt application entry scripts are valid JavaScript', () => {
  ['app.js', 'ui/app-shell.js'].forEach((file) => assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`));
});

test('the replacement pipeline contains no retired visual runtime', () => {
  const app = read('app.js');
  const html = read('index.html');
  assert.match(app, /ui\/app-shell\.js/);
  assert.doesNotMatch(app, /ui-v2|operations-rebuild-v040|operations-flow|operations-design|balanced-cockpit|adaptive-fit/);
  assert.doesNotMatch(html, /ui-v2|operations-rebuild-v040|design-system\.css|product-shell/);
});

test('assisted input models still enter the common Contracts review', () => {
  const app = read('app.js');
  const ui = read('ui/app-shell.js');
  assert.match(app, /game-log-intake\.js/);
  assert.match(app, /ocr-intake\.js/);
  assert.match(ui, /Game\.log · Experimental/);
  assert.match(ui, /Screenshot \/ OCR/);
  assert.match(ui, /reviewContracts/);
  assert.match(ui, /validator\.inspectMissionText/);
});
