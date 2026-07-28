'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('Game.log normal import does not depend on the powerful file picker', () => {
  const access = read('assisted-intake-access.js');
  assert.match(access, /Import Game\.log/);
  assert.match(access, /openStandardPicker/);
  assert.match(access, /fileInput\.click\(\)/);
  assert.match(access, /event\.stopImmediatePropagation\(\)/);
  assert.match(access, /Enable live refresh/);
  assert.match(access, /showOpenFilePicker/);
  assert.match(access, /Use Import Game\.log instead/);
  assert.match(access, /game-log-dropzone/);
});

test('Win Shift S screenshots can enter OCR through paste and drag drop', () => {
  const access = read('assisted-intake-access.js');
  assert.match(access, /Paste screenshot/);
  assert.match(access, /navigator\.clipboard\?\.read/);
  assert.match(access, /document\.addEventListener\('paste'/);
  assert.match(access, /clipboardData\?\.items/);
  assert.match(access, /getAsFile\(\)/);
  assert.match(access, /Win \+ Shift \+ S/);
  assert.match(access, /ocr-paste-zone/);
  assert.match(access, /dataTransfer\?\.files/);
});

test('assisted sources are progressively disclosed inside the shared Contracts flow', () => {
  const app = read('app.js');
  const ui = read('ui/app-shell.js');
  assert.match(app, /ocr-intake\.js/);
  assert.match(app, /game-log-intake\.js/);
  assert.match(ui, /role="tablist" aria-label="Contract source"/);
  assert.match(ui, /Screenshot \/ OCR/);
  assert.match(ui, /Game\.log · Experimental/);
  assert.match(ui, /type="file"/);
  assert.match(ui, /reviewContracts/);
});
