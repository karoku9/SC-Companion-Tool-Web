'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const starmap = require('../starmap-data.js');
const roadmap = require('../roadmap.js');

test('starmap exposes unique playable Stanton, Pyro and Nyx systems', () => {
  assert.deepEqual(starmap.systems.map((system) => system.id), ['stanton', 'pyro', 'nyx']);
  assert.equal(new Set(starmap.systems.map((system) => system.id)).size, 3);
  starmap.systems.forEach((system) => {
    assert.equal(system.position.length, 3);
    assert.equal(system.availability, 'Playable');
    assert.ok(system.bodies.length >= 4);
  });
});

test('jump connections resolve to known systems and identify the placeholder link', () => {
  const systemIds = new Set(starmap.systems.map((system) => system.id));
  starmap.connections.forEach((connection) => {
    assert.ok(systemIds.has(connection.from));
    assert.ok(systemIds.has(connection.to));
  });
  const placeholder = starmap.connections.find((connection) => connection.id === 'stanton-nyx');
  assert.equal(placeholder.status, 'placeholder');
});

test('supported mission locations resolve to stable system anchors', () => {
  const teasa = starmap.getLocationAnchor('stanton-hurston-lorville-teasa');
  const riker = starmap.getLocationAnchor('stanton-arccorp-area18-riker');
  const baijini = starmap.getLocationAnchor('stanton-arccorp-baijini');

  assert.equal(teasa.systemId, 'stanton');
  assert.equal(riker.bodyId, 'arccorp');
  assert.equal(baijini.label, 'Baijini Point · ArcCorp');
  [teasa, riker, baijini].forEach((anchor) => {
    assert.equal(anchor.position.length, 3);
    anchor.position.forEach((value) => assert.ok(Number.isFinite(value)));
  });
});

test('map page loads the lightweight canvas renderer and separate stylesheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /data-view-target="map"/);
  assert.match(html, /id="starmap-canvas"/);
  assert.match(html, /href="starmap\.css"/);
  assert.match(html, /src="starmap-data\.js"/);
  assert.match(html, /src="starmap-view\.js"/);
});

test('OCR and Game.log are deferred to the automated intake phase', () => {
  const automation = roadmap.phases.find((phase) => phase.id === 'automation');
  assert.ok(automation);
  assert.equal(automation.status, 'future');
  assert.equal(automation.items.find((item) => item.id === 'ocr').status, 'future');
  assert.equal(automation.items.find((item) => item.id === 'game-log').status, 'future');
});
