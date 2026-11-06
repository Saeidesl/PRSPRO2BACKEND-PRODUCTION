'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'FormService.js'), 'utf8');

function loadService(fixtures) {
  const calls = { forms: 0, mappings: 0, fields: 0, types: 0, columns: 0, findForm: 0, findType: 0, findColumns: 0 };
  const sandbox = {
    AccessControlService: { getCurrentUser: () => ({ TenantID: 'TENANT-1' }) },
    EventTypeRepository: {
      findById: id => { calls.findType++; return id === 'EVENT-1' ? { ID: id, TenantID: 'TENANT-1' } : null; }
    },
    FormRepository: {
      getForms: () => { calls.forms++; return fixtures.forms; },
      findMappingsByEventType: () => { calls.mappings++; return fixtures.mappings; },
      getFields: () => { calls.fields++; return fixtures.fields; },
      findForm: () => { calls.findForm++; throw new Error('per-form lookup must not be used'); }
    },
    InformationTypeRepository: {
      findByTenant: () => { calls.types++; return fixtures.types; },
      getAllColumns: () => { calls.columns++; return fixtures.columns; },
      findById: () => { throw new Error('per-field type lookup must not be used'); },
      findColumns: () => { throw new Error('per-field column lookup must not be used'); }
    },
    Response: { success: data => ({ success: true, data }) },
    ErrorHandler: { create: (code, message) => Object.assign(new Error(message), { code }) },
    Constants: { ERROR: { NOT_FOUND: 'NOT_FOUND', INVALID_OPERATION: 'INVALID_OPERATION' } }
  };
  vm.runInNewContext(source + '\n;globalThis.__FormService = FormService;', sandbox);
  return { service: sandbox.__FormService, calls };
}

test('event type form definitions are built with one batch read per source sheet', () => {
  const fixtures = {
    forms: [
      { ID: 'FORM-1', TenantID: 'TENANT-1', Name: 'فرم نمونه', Status: 'ACTIVE', Version: 3 },
      { ID: 'FORM-2', TenantID: 'TENANT-1', Name: 'فرم ملزومات', Status: 'ACTIVE', Version: 2 },
      { ID: 'FORM-X', TenantID: 'OTHER', Name: 'فرم دیگر', Status: 'ACTIVE' }
    ],
    mappings: [
      { ID: 'MAP-2', TenantID: 'TENANT-1', EventTypeID: 'EVENT-1', FormID: 'FORM-2', FieldOrder: 2, Status: 'ACTIVE' },
      { ID: 'MAP-1', TenantID: 'TENANT-1', EventTypeID: 'EVENT-1', FormID: 'FORM-1', FieldOrder: 1, Status: 'ACTIVE' },
      { ID: 'MAP-X', TenantID: 'OTHER', EventTypeID: 'EVENT-1', FormID: 'FORM-X', Status: 'ACTIVE' },
      { ID: 'MAP-D', TenantID: 'TENANT-1', EventTypeID: 'EVENT-1', FormID: 'FORM-X', Status: 'ACTIVE' },
      { ID: 'MAP-I', TenantID: 'TENANT-1', EventTypeID: 'EVENT-1', FormID: 'FORM-1', Status: 'DELETED' }
    ],
    fields: [
      { ID: 'FIELD-2', TenantID: 'TENANT-1', FormID: 'FORM-1', InformationTypeID: 'TYPE-1', FieldOrder: 2, Status: 'ACTIVE', VisibilityRuleJSON: '' },
      { ID: 'FIELD-1', TenantID: 'TENANT-1', FormID: 'FORM-1', InformationTypeID: 'TYPE-1', FieldOrder: 1, Status: 'ACTIVE', VisibilityRuleJSON: '{"fieldId":"TYPE-2","operator":"FILLED"}' },
      { ID: 'FIELD-3', TenantID: 'TENANT-1', FormID: 'FORM-2', InformationTypeID: 'TYPE-2', FieldOrder: 1, Status: 'ACTIVE', VisibilityRuleJSON: '' },
      { ID: 'FIELD-X', TenantID: 'OTHER', FormID: 'FORM-1', InformationTypeID: 'TYPE-1', Status: 'ACTIVE' },
      { ID: 'FIELD-D', TenantID: 'TENANT-1', FormID: 'FORM-1', InformationTypeID: 'TYPE-1', Status: 'DELETED' }
    ],
    types: [
      { ID: 'TYPE-1', TenantID: 'TENANT-1', Name: 'رنگ', Status: 'ACTIVE', ValidationRuleJSON: '{}' },
      { ID: 'TYPE-2', TenantID: 'TENANT-1', Name: 'تعداد', Status: 'ACTIVE' }
    ],
    columns: [
      { ID: 'COL-2', TenantID: 'TENANT-1', InformationTypeID: 'TYPE-1', ColumnOrder: 2, Status: 'ACTIVE' },
      { ID: 'COL-1', TenantID: 'TENANT-1', InformationTypeID: 'TYPE-1', ColumnOrder: 1, Status: 'ACTIVE' },
      { ID: 'COL-X', TenantID: 'OTHER', InformationTypeID: 'TYPE-1', ColumnOrder: 0, Status: 'ACTIVE' },
      { ID: 'COL-D', TenantID: 'TENANT-1', InformationTypeID: 'TYPE-1', ColumnOrder: 0, Status: 'DELETED' }
    ]
  };
  const { service, calls } = loadService(fixtures);
  const response = service.listEventTypeForms('EVENT-1', {});
  assert.equal(response.success, true);
  assert.deepEqual(Array.from(response.data, row => row.ID), ['MAP-1', 'MAP-2']);
  assert.deepEqual(Array.from(response.data[0].Form.Fields, field => field.ID), ['FIELD-1', 'FIELD-2']);
  assert.deepEqual(JSON.parse(JSON.stringify(response.data[0].Form.Fields[0].VisibilityRule)), { fieldId: 'TYPE-2', operator: 'FILLED' });
  assert.deepEqual(Array.from(response.data[0].Form.Fields[0].InformationType.Columns, column => column.ID), ['COL-1', 'COL-2']);
  assert.equal(Object.hasOwn(response.data[0].Form.Fields[0].InformationType, 'ValidationRuleJSON'), false);
  assert.deepEqual(calls, { forms: 1, mappings: 1, fields: 1, types: 1, columns: 1, findForm: 0, findType: 1, findColumns: 0 });
});

test('batch form definitions reject missing or inactive information types', () => {
  const fixtures = {
    forms: [{ ID: 'FORM-1', TenantID: 'TENANT-1', Status: 'ACTIVE' }],
    mappings: [{ ID: 'MAP-1', TenantID: 'TENANT-1', EventTypeID: 'EVENT-1', FormID: 'FORM-1', Status: 'ACTIVE' }],
    fields: [{ ID: 'FIELD-1', TenantID: 'TENANT-1', FormID: 'FORM-1', InformationTypeID: 'MISSING', Status: 'ACTIVE' }],
    types: [],
    columns: []
  };
  const { service } = loadService(fixtures);
  assert.throws(() => service.listEventTypeForms('EVENT-1', {}), /نوع اطلاعات متصل به فرم پیدا نشد/);
});
