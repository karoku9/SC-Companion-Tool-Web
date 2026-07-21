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

test('roadmap tracks the current section, location intel and phone companion slices', () => {
  const items = roadmap.phases.flatMap((phase) => phase.items);
  assert.equal(items.find((item) => item.id === 'section-navigation').status, 'done');
  assert.equal(items.find((item) => item.id === 'service-profiles').status, 'active');
  assert.equal(items.find((item) => item.id === 'pairing-protocol').status, 'next');
});

test('page loads the English horizontal and vertical roadmap interface', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<html lang="en"/);
  assert.match(html, /href="roadmap\.css"/);
  assert.match(html, /data-view-target="roadmap"/);
  assert.match(html, /Macro phases run horizontally/);
});
