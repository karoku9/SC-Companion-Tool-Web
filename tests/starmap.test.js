'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const starmap = require('../starmap-data.js');
const roadmap = require('../roadmap.js');
const pages = require('../product-pages.js');

test('starmap exposes unique playable Stanton, Pyro and Nyx systems', () => {
  assert.deepEqual(starmap.systems.map((system) => system.id), ['stanton', 'pyro', 'nyx']);
  assert.equal(new Set(starmap.systems.map((system) => system.id)).size, 3);
  starmap.systems.forEach((system) => {
    assert.equal(system.position.length, 3);
    assert.equal(system.availability, 'Playable');
    assert.ok(system.navigationRadiusGm > 0);
    assert.ok(system.bodies.length >= 4);
    assert.ok(system.sourceIds.length > 0);
  });
});

test('jump connections resolve to known systems and identify the active placeholder link', () => {
  const systemIds = new Set(starmap.systems.map((system) => system.id));
  starmap.connections.forEach((connection) => {
    assert.ok(systemIds.has(connection.from));
    assert.ok(systemIds.has(connection.to));
  });
  const placeholder = starmap.connections.find((connection) => connection.id === 'stanton-nyx');
  assert.equal(placeholder.status, 'active-placeholder');
  assert.match(placeholder.note, /placeholder/i);
});

test('supported mission locations resolve to stable system and distance anchors', () => {
  const anchors = [
    starmap.getLocationAnchor('stanton-hurston-lorville-teasa'),
    starmap.getLocationAnchor('stanton-arccorp-area18-riker'),
    starmap.getLocationAnchor('stanton-arccorp-baijini'),
    starmap.getLocationAnchor('pyro-monox-checkmate'),
    starmap.getLocationAnchor('pyro-bloom-orbituary'),
    starmap.getLocationAnchor('pyro-terminus-ruin'),
    starmap.getLocationAnchor('nyx-delamar-levski')
  ];
  assert.equal(anchors[0].systemId, 'stanton');
  assert.equal(anchors[3].systemId, 'pyro');
  assert.equal(anchors[6].systemId, 'nyx');
  assert.equal(anchors[2].label, 'Baijini Point · ArcCorp');
  anchors.forEach((anchor) => {
    assert.equal(anchor.position.length, 3);
    assert.equal(anchor.distancePositionGm.length, 3);
    anchor.position.forEach((value) => assert.ok(Number.isFinite(value)));
    anchor.distancePositionGm.forEach((value) => assert.ok(Number.isFinite(value)));
  });
});

test('map page uses route, dynamic local-system and network SVG modes', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, '..', 'starmap-view.js'), 'utf8');
  assert.equal(pages.getPage('map').status, 'live');
  assert.match(html, /data-view="map"/);
  assert.match(html, /<svg id="starmap-canvas"/);
  assert.match(view, /renderRouteMode/);
  assert.match(view, /renderLocalMode/);
  assert.match(view, /renderNetworkMode/);
  assert.match(view, /NavigationEstimates/);
  assert.doesNotMatch(view, /getContext\('2d'\)|camera\.yaw|pointer\.down/);
});

test('OCR and Game.log remain in the future assisted-intake release', () => {
  const assisted = roadmap.releases.find((release) => release.version === '0.25');
  assert.ok(assisted);
  assert.equal(assisted.status, 'future');
  assert.ok(assisted.changes.some((change) => /OCR/.test(change)));
  assert.ok(assisted.changes.some((change) => /Game\.log/.test(change)));
});
