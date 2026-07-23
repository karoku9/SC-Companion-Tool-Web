'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const starmap = require('../starmap-data.js');
const roadmap = require('../roadmap.js');
const pages = require('../product-pages.js');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

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

test('base expanded mission locations resolve to stable system and distance anchors', () => {
  const anchors = [
    starmap.getLocationAnchor('stanton-hurston-lorville-teasa'),
    starmap.getLocationAnchor('stanton-crusader-seraphim'),
    starmap.getLocationAnchor('stanton-arc-l2-lively-pathway'),
    starmap.getLocationAnchor('stanton-microtech-new-babbage-nbis'),
    starmap.getLocationAnchor('pyro-monox-checkmate'),
    starmap.getLocationAnchor('pyro-bloom-orbituary'),
    starmap.getLocationAnchor('pyro-terminus-ruin'),
    starmap.getLocationAnchor('nyx-delamar-levski')
  ];
  assert.equal(anchors[0].systemId, 'stanton');
  assert.equal(anchors[4].systemId, 'pyro');
  assert.equal(anchors[7].systemId, 'nyx');
  assert.equal(anchors[2].label, 'ARC-L2 Lively Pathway Station · ARC-L2');
  anchors.forEach((anchor) => {
    assert.equal(anchor.position.length, 3);
    assert.equal(anchor.distancePositionGm.length, 3);
    anchor.position.forEach((value) => assert.ok(Number.isFinite(value)));
    anchor.distancePositionGm.forEach((value) => assert.ok(Number.isFinite(value)));
  });
  assert.equal(Object.keys(starmap.locationAnchors).length, 34);
});

test('Starmap 2.0 separates itinerary, system and network navigation layers', () => {
  const html = read('index.html');
  const view = read('starmap-view.js');
  const css = read('starmap-v2.css');
  assert.equal(pages.getPage('map').status, 'live');
  assert.match(html, /data-view="map"/);
  assert.match(view, /data-map-mode="route"[^>]*>Itinerary/);
  assert.match(view, /data-map-mode="local"[^>]*>System/);
  assert.match(view, /data-map-mode="network"[^>]*>Network/);
  assert.match(view, /renderRouteMode/);
  assert.match(view, /renderLocalMode/);
  assert.match(view, /renderNetworkMode/);
  assert.match(view, /NavigationEstimates/);
  assert.match(css, /\.starmap-objective-hud/);
  assert.match(css, /\.starmap-context-panel/);
});

test('Starmap 2.0 keeps orientation, selection and camera controls explicit', () => {
  const view = read('starmap-view.js');
  assert.match(view, /CURRENT OBJECTIVE/);
  assert.match(view, /FINAL DESTINATION/);
  assert.match(view, /Session complete/);
  assert.match(view, /No further stops/);
  assert.match(view, /data-map-action="fit"/);
  assert.match(view, /data-map-action="current"/);
  assert.match(view, /centerOnKey/);
  assert.match(view, /is-selected/);
  assert.match(view, /pointerdown/);
  assert.match(view, /Home/);
  assert.doesNotMatch(view, /const jumps = estimate\.jumpCount/);
  assert.doesNotMatch(view, /if \(mode !== 'route'\).*mode = 'route'/s);
});

test('v0.24 OCR intake follows delivered universe and Game.log releases', () => {
  const universe = roadmap.releases.find((release) => release.version === '0.22');
  const gameLog = roadmap.releases.find((release) => release.version === '0.23');
  const ocr = roadmap.releases.find((release) => release.version === '0.24');
  const hardening = roadmap.releases.find((release) => release.version === '0.25');
  assert.ok(universe);
  assert.equal(universe.status, 'done');
  assert.match(universe.title, /Expanded universe data/i);
  assert.ok(universe.changes.some((change) => /84 operational destinations/i.test(change)));
  assert.ok(universe.changes.some((change) => /surface.*outposts/i.test(change)));
  assert.ok(gameLog);
  assert.equal(gameLog.status, 'done');
  assert.match(gameLog.title, /Game\.log assisted intake/i);
  assert.ok(gameLog.changes.some((change) => /raw line, timestamp, file/i.test(change)));
  assert.ok(gameLog.changes.some((change) => /mission validation/i.test(change)));
  assert.ok(ocr);
  assert.equal(ocr.status, 'current');
  assert.ok(ocr.changes.some((change) => /Tesseract\.js 7/i.test(change)));
  assert.ok(ocr.changes.some((change) => /mission validation/i.test(change)));
  assert.equal(hardening.status, 'next');
});
