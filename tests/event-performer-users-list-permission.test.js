'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('event creators may read tenant-scoped user list to choose a performer', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'Router.js'), 'utf8');
  assert.match(source, /this\.requireAny\(params, \['USER_VIEW', 'EVENT_CREATE'\]\)/);
});
