'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('Operations single-screen layout supports a 1536px display at 125 percent scaling', () => {
  const entry = read('ui-v2.css');
  const compact = read('operations-effective-viewport-v029.css');

  assert.match(entry, /operations-effective-viewport-v029\.css/);
  assert.match(compact, /min-width:\s*1180px/);
  assert.match(compact, /min-height:\s*650px/);
  assert.match(compact, /grid-template-areas:[\s\S]*"timeline cargo"/);
  assert.match(compact, /grid-template-columns:\s*68px minmax\(0, 1fr\)/);
  assert.match(compact, /height:\s*calc\(100dvh - 50px\)/);
  assert.match(compact, /\.ops-editor-drawer:not\(\[hidden\]\)/);
});
