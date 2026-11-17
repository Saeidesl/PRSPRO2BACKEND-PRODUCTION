'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'PrintTemplateService.js'), 'utf8');

function createHarness(options) {
  const settings = options || {};
  const counters = { templateReads: 0, projectReads: 0, accessChecks: 0 };
  const user = { ID: 'U1', TenantID: 'TENANT_A', IsAdmin: true };
  const project = {
    ID: 'P1', TenantID: 'TENANT_A', ProjectCode: 'P-001',
    Title: 'پروژه آزمایشی', UpdatedAt: '2026-11-17T10:00:00Z'
  };
  const rows = settings.rows || [
    { ID: 'T1', TenantID: 'TENANT_A', Status: 'ACTIVE', Name: 'قالب اول',
      DefinitionJSON: JSON.stringify({ bindings: [{ id: 'shared', sourceType: 'PROJECT_FIELD', field: 'Title' }] }) },
    { ID: 'T2', TenantID: 'TENANT_A', Status: 'ACTIVE', Name: 'قالب دوم',
      DefinitionJSON: JSON.stringify({ bindings: [{ id: 'shared', sourceType: 'PROJECT_FIELD', field: 'ProjectCode' }] }) }
  ];
  const context = {
    AccessControlService: { getCurrentUser: () => user },
    Validator: { required(value, name) { if (value === undefined || value === null || value === '') throw new Error(name + ' required'); } },
    ErrorHandler: { create(_code, message) { return new Error(message); } },
    Constants: { ERROR: { VALIDATION_ERROR: 'VALIDATION_ERROR', NOT_FOUND: 'NOT_FOUND', INVALID_OPERATION: 'INVALID_OPERATION' } },
    PrintTemplateRepository: { getAll() { counters.templateReads++; return rows; } },
    PrintTemplateValidator: { parseDefinition(value) { return typeof value === 'string' ? JSON.parse(value) : value; } },
    ProjectRepository: { findById(id) { counters.projectReads++; return id === 'P1' ? project : null; } },
    ProjectService: { _isProjectAvailableToUser_() { counters.accessChecks++; return settings.projectAccessible !== false; } },
    Response: { success(value) { return value; } },
    Utilities: { getUuid: () => 'test-uuid' },
    Date
  };
  vm.runInNewContext(source + '\n;globalThis.__printTemplateService = PrintTemplateService;', context);
  return { service: context.__printTemplateService, counters, rows, project };
}

test('batch resolve reads template rows and shared project data once; duplicate template IDs are deduplicated', () => {
  const h = createHarness();
  const result = h.service.resolveMany({ ProjectID: 'P1', TemplateIDs: ['T1', 'T2', 'T1'] }, {});
  assert.equal(h.counters.templateReads, 1);
  assert.equal(h.counters.projectReads, 1);
  assert.equal(h.counters.accessChecks, 1);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].data.shared, 'پروژه آزمایشی');
  assert.equal(result.results[1].data.shared, 'P-001');
  assert.equal(result.results[0].project.ID, 'P1');
  assert.equal(result.results[1].project.ID, 'P1');
});

test('batch resolve rejects templates outside the current tenant and inactive templates', () => {
  const h = createHarness({ rows: [
    { ID: 'OTHER', TenantID: 'TENANT_B', Status: 'ACTIVE', DefinitionJSON: '{"bindings":[]}' },
    { ID: 'INACTIVE', TenantID: 'TENANT_A', Status: 'DISABLED', DefinitionJSON: '{"bindings":[]}' }
  ] });
  assert.throws(() => h.service.resolveMany({ ProjectID: 'P1', TemplateIDs: ['OTHER'] }, {}), /قالب‌های درخواستی/);
  assert.throws(() => h.service.resolveMany({ ProjectID: 'P1', TemplateIDs: ['INACTIVE'] }, {}), /قالب‌های درخواستی/);
});

test('batch resolve enforces the maximum of fifty unique templates', () => {
  const h = createHarness();
  const ids = Array.from({ length: 51 }, (_, index) => 'T' + index);
  assert.throws(() => h.service.resolveMany({ ProjectID: 'P1', TemplateIDs: ids }, {}), /تعداد قالب‌های درخواستی معتبر نیست/);
  assert.equal(h.counters.templateReads, 0);
});

test('batch resolve fails closed when the user cannot access the project', () => {
  const h = createHarness({ projectAccessible: false });
  assert.throws(() => h.service.resolveMany({ ProjectID: 'P1', TemplateIDs: ['T1'] }, {}), /پروژه موردنظر پیدا نشد/);
});

test('one invalid template definition does not hide a valid template result', () => {
  const h = createHarness({ rows: [
    { ID: 'GOOD', TenantID: 'TENANT_A', Status: 'ACTIVE', DefinitionJSON:
      JSON.stringify({ bindings: [{ id: 'value', sourceType: 'PROJECT_FIELD', field: 'Title' }] }) },
    { ID: 'BAD', TenantID: 'TENANT_A', Status: 'ACTIVE', DefinitionJSON:
      JSON.stringify({ bindings: [{ id: 'value', sourceType: 'PROJECT_FIELD', field: 'SecretField' }] }) }
  ] });
  const result = h.service.resolveMany({ ProjectID: 'P1', TemplateIDs: ['GOOD', 'BAD'] }, {});
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].data.value, 'پروژه آزمایشی');
  assert.equal(result.results[0].project.ID, 'P1');
  assert.match(result.results[1].error, /فیلد پروژه در منبع قالب مجاز نیست/);
});
