'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('print-template revision endpoint is tenant-scoped and returns lightweight version metadata', () => {
  const service = fs.readFileSync(path.join(__dirname, '..', 'PrintTemplateService.js'), 'utf8');
  const router = fs.readFileSync(path.join(__dirname, '..', 'Router.js'), 'utf8');
  assert.match(service, /revision: function\(params\)/);
  assert.match(service, /String\(row\.TenantID\) === String\(user\.TenantID\)/);
  assert.match(service, /Version: Number\(row\.Version \|\| 1\)/);
  assert.match(service, /UpdatedAt: String\(row\.UpdatedAt \|\| ''\)/);
  assert.match(service, /revision: templates\.length/);
  assert.match(router, /path === '\/print-templates\/revision'/);
  assert.match(router, /PrintTemplateService\.revision\(params\)/);
});
