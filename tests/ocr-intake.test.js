'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const intake = require('../ocr-intake.js');

const locations = [
  { id: 'stanton-arcl2', operational: true, name: 'ARC-L2 Lively Pathway Station', contextName: 'ARC-L2', navigationTarget: 'ARC-L2 Lively Pathway Station', aliases: ['ARC-L2', 'Lively Pathway'] },
  { id: 'stanton-teasa', operational: true, name: 'Teasa Spaceport', contextName: 'Lorville', navigationTarget: 'Teasa Spaceport', aliases: ['teasa', 'lorville'] },
  { id: 'nyx-levski', operational: true, name: 'Levski', contextName: 'Nyx', navigationTarget: 'Levski', aliases: ['levski nyx'] }
];

const locationModel = {
  locations,
  formatOperationalLabel(location) { return `${location.name} · ${location.contextName}`; },
  searchOperationalLocations(query, options = {}) {
    const normalized = intake.normalize(query);
    return locations.filter((location) => [location.name, location.navigationTarget, ...(location.aliases ?? [])]
      .some((value) => intake.normalize(value).includes(normalized) || normalized.includes(intake.normalize(value))))
      .slice(0, options.limit ?? locations.length);
  }
};

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

function readProject(name) {
  return fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
}

test('OCR intake extracts independent action, location, quantity and commodity fields', () => {
  const report = intake.inspectOcrText(fixture('ocr-hauling-screen.txt'), locationModel, {
    sourceName: 'contract.png',
    sourceType: 'image/png',
    sourceSize: 250000,
    width: 1920,
    height: 1080,
    sourceHash: 'fixture-hash',
    engine: 'Tesseract.js',
    engineVersion: '7.0.0',
    globalConfidence: 91
  });

  assert.equal(report.title.value, 'Covalex local transfer');
  assert.equal(report.objectives.length, 2);
  assert.equal(report.summary.completeCount, 2);
  assert.equal(report.summary.unresolvedCount, 0);
  assert.equal(report.objectives[0].action.value, 'collect');
  assert.equal(report.objectives[0].location.id, 'stanton-arcl2');
  assert.equal(report.objectives[0].quantity.value, 3);
  assert.equal(report.objectives[0].commodity.value, 'Titanium');
  assert.equal(report.objectives[1].action.value, 'deliver');
  assert.equal(report.objectives[1].location.id, 'stanton-teasa');
  assert.match(report.draftText, /collect ARC-L2 Lively Pathway Station 3scu titanium/);
  assert.match(report.draftText, /deliver Teasa Spaceport 3scu titanium/);
  assert.equal(report.source.hash, 'fixture-hash');
  assert.equal(report.objectives[0].location.provenance.line, 3);
});

test('OCR intake preserves unresolved fields instead of inventing cargo', () => {
  const report = intake.inspectOcrText('Mission: Nyx delivery\nDeliver cargo\nDestination: Levski', locationModel, {
    sourceName: 'partial.png',
    globalConfidence: 80
  });

  assert.equal(report.objectives.length, 1);
  assert.equal(report.objectives[0].status, 'partial');
  assert.equal(report.objectives[0].location.id, 'nyx-levski');
  assert.equal(report.objectives[0].quantity.value, null);
  assert.equal(report.objectives[0].commodity.value, null);
  assert.equal(report.ready, false);
  assert.equal(report.summary.unresolvedCount, 1);
});

test('OCR review serialization accepts explicit corrections without bypassing validation', () => {
  const report = intake.inspectOcrText('Mission: Transfer\nPick up\nLocation: ARC-L2\nQuantity: 2 SCU\nDeliver\nDestination: Teasa', locationModel, { sourceName: 'correction.png' });
  const corrected = intake.serializeReport(report, {
    objectives: {
      'ocr-objective-1': { commodity: 'Medical Supplies' },
      'ocr-objective-2': { quantity: 2, commodity: 'Medical Supplies' }
    }
  });

  assert.match(corrected, /pickup ARC-L2 Lively Pathway Station 2scu medical-supplies/);
  assert.match(corrected, /deliver Teasa Spaceport 2scu medical-supplies/);
});

test('derived From and To labels are used only when explicit action headings are absent', () => {
  const report = intake.inspectOcrText('Contract: Direct labels\nFrom: ARC-L2\n2 SCU Titanium\nTo: Teasa\n2 SCU Titanium', locationModel, { sourceName: 'labels.png' });
  assert.equal(report.objectives.length, 2);
  assert.equal(report.objectives[0].action.value, 'pickup');
  assert.equal(report.objectives[1].action.value, 'deliver');
});

test('OCR runtime stays local-review-first and pins its browser OCR dependency', () => {
  const view = readProject('ocr-intake-view.js');
  const css = readProject('ocr-intake.css');
  const app = readProject('app.js');
  assert.match(view, /TESSERACT_VERSION = '7\.0\.0'/);
  assert.match(view, /tesseract\.js@\$\{TESSERACT_VERSION\}/);
  assert.match(view, /createWorker\('eng'/);
  assert.match(view, /Load OCR draft into review/);
  assert.match(view, /form\.requestSubmit\(\)/);
  assert.match(view, /Nothing is sent to route generation until the draft passes the normal mission review/);
  assert.match(css, /\.ocr-intake/);
  assert.match(app, /ocr-intake\.js/);
  assert.match(app, /ocr-intake-view\.js/);
});
