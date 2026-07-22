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

test('v0.21 prioritizes UX Foundation and Starmap 2.0 before Session History', () => {
  const context = roadmap.releases.find((item) => item.version === '0.19');
  const loadouts = roadmap.releases.find((item) => item.version === '0.20');
  const current = roadmap.releases.find((item) => item.version === '0.21');
  const next = roadmap.releases.find((item) => item.version === '0.22');
  assert.equal(context.status, 'done');
  assert.equal(loadouts.status, 'done');
  assert.match(loadouts.title, /Fleet loadouts/i);
  assert.equal(current.status, 'current');
  assert.match(current.title, /UX foundation/i);
  assert.ok(current.changes.some((change) => /distinct navigation layers/i.test(change)));
  assert.ok(current.changes.some((change) => /Persistent selected-object/i.test(change)));
  assert.ok(current.changes.some((change) => /mobile bottom-sheet/i.test(change)));
  assert.equal(next.status, 'next');
  assert.match(next.title, /Session history/i);
});

test('roadmap page keeps the English shell and release track host', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, '..', 'roadmap-view.js'), 'utf8');
  assert.match(html, /<html lang="en"/);
  assert.match(html, /id="roadmap-board"/);
  assert.match(view, /release-roadmap-track/);
  assert.match(view, /roadmap\.releases/);
});
