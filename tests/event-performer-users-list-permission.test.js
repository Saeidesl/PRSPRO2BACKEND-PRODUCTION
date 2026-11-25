'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('authenticated users can access the tenant-scoped user list for performer selection', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'Router.js'), 'utf8');
  const route = source.match(/if \(path === '\/users'\) \{([\s\S]*?)\n    \}/);
  assert.ok(route, 'GET /users route exists');
  assert.match(route[1], /AccessControlService\.getCurrentUser\(params \|\| \{\}\)/);
  assert.match(route[1], /return UserService\.list\(params\)/);
  assert.doesNotMatch(route[1], /requireAny|AccessControlService\.require\(/);
});
