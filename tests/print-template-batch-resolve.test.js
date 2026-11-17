'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('batch print-template resolve is exposed with the existing project-view permission', () => {
  const router = read('Router.js');
  assert.match(router, /path === '\/print-templates\/resolve'/);
  assert.match(router, /AccessControlService\.require\(params, 'PROJECT_VIEW'\);\s*return PrintTemplateService\.resolveMany\(body, params\);/);
});

test('batch resolver validates project and template IDs and limits the request size', () => {
  const service = read('PrintTemplateService.js');
  const start = service.indexOf('resolveMany: function(body, params)');
  const end = service.indexOf('resolve: function(id, body, params)', start);
  assert.ok(start >= 0 && end > start, 'resolveMany must be defined before the legacy resolver');
  const batch = service.slice(start, end);
  assert.match(batch, /Validator\.required\(body\.ProjectID, 'ProjectID'\)/);
  assert.match(batch, /Array\.isArray\(body\.TemplateIDs\)/);
  assert.match(batch, /templateIds\.length > 50/);
  assert.match(batch, /String\(row\.TenantID\) === String\(user\.TenantID\)/);
  assert.match(batch, /Status \|\| 'ACTIVE'\)\.toUpperCase\(\) === 'ACTIVE'/);
});

test('batch resolver namespaces binding IDs and performs one shared project-data resolution', () => {
  const service = read('PrintTemplateService.js');
  const start = service.indexOf('resolveMany: function(body, params)');
  const end = service.indexOf('resolve: function(id, body, params)', start);
  const batch = service.slice(start, end);
  assert.match(batch, /__pt_batch_/);
  assert.match(batch, /combinedBindings\.push\(Object\.assign\(\{\}, binding, \{ id: sharedId \}\)\)/);
  assert.match(batch, /shared = this\._resolveProjectData\(body\.ProjectID, \{ bindings: combinedBindings \}, user\)/);
  assert.match(batch, /if \(sharedResolutionFailed\)/);
  assert.match(batch, /Object\.prototype\.hasOwnProperty\.call\(shared\.data/);
  assert.match(batch, /Object\.prototype\.hasOwnProperty\.call\(shared\.sources/);
});

test('legacy single-template resolve contract remains available', () => {
  const router = read('Router.js');
  const service = read('PrintTemplateService.js');
  assert.match(router, /printTemplateResolveParts\.length === 4/);
  assert.match(router, /PrintTemplateService\.resolve\(decodeURIComponent\(printTemplateResolveParts\[2\]\), body, params\)/);
  assert.match(service, /resolve: function\(id, body, params\)/);
  assert.match(service, /this\._resolveProjectData\(body\.ProjectID, definition, user\)/);
});
