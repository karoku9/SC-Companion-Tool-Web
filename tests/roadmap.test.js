'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const roadmap = require('../roadmap.js');

const allowedStatuses = new Set(['done', 'current', 'next', 'future']);

function numericVersion(version) {
  const [major, minor = '0'] = version.split('.').map(Number);
  return major * 1000 + minor;
}

test('roadmap is a unique left-to-right release sequence', () => {
  const versions = roadmap.releases.map((release) => release.version);
  assert.equal(new Set(versions).size, versions.length);
  assert.equal(versions[0], '0.1');
  assert.equal(versions.at(-1), '1.0');
  roadmap.releases.forEach((release, index) => {
    assert.ok(allowedStatuses.has(release.status));
    assert.ok(release.changes.length > 0);
    if (index) assert.ok(numericVersion(release.version) > numericVersion(roadmap.releases[index - 1].version));
  });
});

test('current, next and future releases form one linear delivery path', () => {
  const currentIndex = roadmap.releases.findIndex((release) => release.status === 'current');
  const nextIndex = roadmap.releases.findIndex((release) => release.status === 'next');
  assert.equal(roadmap.releases[currentIndex].version, roadmap.currentVersion);
  assert.equal(nextIndex, currentIndex + 1);
  assert.ok(roadmap.releases.slice(0, currentIndex).every((release) => release.status === 'done'));
  assert.ok(roadmap.releases.slice(nextIndex + 1).every((release) => release.status === 'future'));
});

test('v0.23 delivers reviewable Game.log intake after complete universe data', () => {
  const context = roadmap.releases.find((item) => item.version === '0.19');
  const loadouts = roadmap.releases.find((item) => item.version === '0.20');
  const ux = roadmap.releases.find((item) => item.version === '0.21');
  const universe = roadmap.releases.find((item) => item.version === '0.22');
  const gameLog = roadmap.releases.find((item) => item.version === '0.23');
  const ocr = roadmap.releases.find((item) => item.version === '0.24');
  const hardening = roadmap.releases.find((item) => item.version === '0.25');
  const release = roadmap.releases.find((item) => item.version === '1.0');

  assert.equal(context.status, 'done');
  assert.equal(loadouts.status, 'done');
  assert.equal(ux.status, 'done');
  assert.match(ux.title, /UX foundation/i);
  assert.equal(universe.status, 'done');
  assert.match(universe.title, /Expanded universe data/i);
  assert.ok(universe.changes.some((change) => /84 operational destinations/i.test(change)));
  assert.ok(universe.changes.some((change) => /43 surface.*outposts/i.test(change)));
  assert.ok(universe.changes.some((change) => /complete fuel, food, medical/i.test(change)));
  assert.ok(universe.changes.some((change) => /Starmap anchors/i.test(change)));
  assert.equal(gameLog.status, 'current');
  assert.match(gameLog.title, /Game\.log assisted intake/i);
  assert.ok(gameLog.changes.some((change) => /raw line, timestamp, file/i.test(change)));
  assert.ok(gameLog.changes.some((change) => /rotation/i.test(change)));
  assert.ok(gameLog.changes.some((change) => /mission validation/i.test(change)));
  assert.equal(ocr.status, 'next');
  assert.match(ocr.title, /OCR assisted intake/i);
  assert.ok(ocr.changes.some((change) => /existing mission validation pipeline/i.test(change)));
  assert.match(hardening.title, /Release hardening/i);
  assert.match(release.title, /Core companion release/i);
});

test('pre-1.0 roadmap excludes deferred expansion features', () => {
  const titles = roadmap.releases.map((release) => release.title).join(' | ');
  assert.doesNotMatch(titles, /Session history/i);
  assert.doesNotMatch(titles, /Companion pairing/i);
  assert.doesNotMatch(titles, /Trading foundation/i);
});

test('roadmap page keeps the English shell and release track host', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, '..', 'roadmap-view.js'), 'utf8');
  assert.match(html, /<html lang="en"/);
  assert.match(html, /id="roadmap-board"/);
  assert.match(view, /release-roadmap-track/);
  assert.match(view, /roadmap\.releases/);
});