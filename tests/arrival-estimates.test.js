'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const estimates = require('../arrival-estimates.js');

test('landing-zone estimate includes descent, ATC, ship exit and local transit', () => {
  const result = estimates.estimateArrival('landing-zone', 'high');
  assert.equal(result.indicativeOnly, true);
  assert.deepEqual(result.segments.map((segment) => segment.id), ['approach', 'atc', 'ship-exit', 'local-transit']);
  assert.equal(result.minMinutes, result.segments.reduce((sum, segment) => sum + segment.minMinutes, 0));
  assert.equal(result.maxMinutes, result.segments.reduce((sum, segment) => sum + segment.maxMinutes, 0));
});
