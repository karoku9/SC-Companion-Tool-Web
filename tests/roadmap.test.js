'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const roadmap = require('../roadmap.js');

const allowedStatuses = new Set(['done', 'active', 'next', 'future']);

test('roadmap phases and objectives have unique ids and valid statuses', () => {
  const phaseIds = roadmap.phases.map((phase) => phase.id);
  const itemIds = roadmap.phases.flatMap((phase) => phase.items.map((item) => item.id));

  assert.equal(new Set(phaseIds).size, phaseIds.length);
  assert.equal(new Set(itemIds).size, itemIds.length);

  roadmap.phases.forEach((phase) => {
    assert.ok(allowedStatuses.has(phase.status));
    assert.ok(phase.items.length > 0);
    phase.items.forEach((item) => assert.ok(allowedStatuses.has(item.status)));
  });
});

test('roadmap starts with completed foundations and exposes future product areas', () => {
  const foundation = roadmap.phases[0];

  assert.equal(foundation.id, 'foundation');
  assert.equal(foundation.items.filter((item) => item.status === 'done').length, 3);
  assert.ok(roadmap.phases.some((phase) => phase.id === 'routing'));
  assert.ok(roadmap.phases.some((phase) => phase.id === 'trading'));
  assert.ok(roadmap.phases.some((phase) => phase.id === 'companion'));
});

test('page loads the English roadmap interface and separate stylesheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /<html lang="en"/);
  assert.match(html, /href="roadmap\.css"/);
  assert.match(html, />ROADMAP</);
  assert.match(html, /Macro phases run horizontally/);
});
