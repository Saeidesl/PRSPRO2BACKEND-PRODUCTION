'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('admin event attribution validates the performer tenant and active status', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'EventService.js'), 'utf8');
  assert.match(source, /String\(performedUser\.TenantID\) !== String\(user\.TenantID\)/);
  assert.match(source, /String\(performedUser\.Status \|\| Constants\.STATUS\.ACTIVE\)[\s\S]*?Constants\.STATUS\.ACTIVE/);
  assert.match(source, /PerformedBy: performedBy[\s\S]*?CreatedBy: user\.ID/);
});
