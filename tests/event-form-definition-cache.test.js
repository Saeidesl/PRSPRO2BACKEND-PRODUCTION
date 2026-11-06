'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'FormService.js'), 'utf8');

function loadService() {
  const store = new Map();
  const calls = { forms: 0, mappings: 0, fields: 0, types: 0, columns: 0 };
  let uuid = 0;
  const tenants = {
    'TENANT-1': {
      event: { ID: 'EVENT-1', TenantID: 'TENANT-1' },
      forms: [{ ID: 'FORM-1', TenantID: 'TENANT-1', Name: 'Form 1', Status: 'ACTIVE', Version: 1 }],
      mappings: [{ ID: 'MAP-1', TenantID: 'TENANT-1', EventTypeID: 'EVENT-1', FormID: 'FORM-1', Status: 'ACTIVE' }],
      fields: [],
      types: [],
      columns: []
    },
    'TENANT-2': {
      event: { ID: 'EVENT-1', TenantID: 'TENANT-2' },
      forms: [{ ID: 'FORM-2', TenantID: 'TENANT-2', Name: 'Form 2', Status: 'ACTIVE', Version: 1 }],
      mappings: [{ ID: 'MAP-2', TenantID: 'TENANT-2', EventTypeID: 'EVENT-1', FormID: 'FORM-2', Status: 'ACTIVE' }],
      fields: [],
      types: [],
      columns: []
    }
  };
  const cache = {
    get: key => store.has(key) ? store.get(key) : null,
    put: (key, value) => store.set(key, value),
    remove: key => store.delete(key)
  };
  const sandbox = {
    CacheService: { getScriptCache: () => cache },
    Utilities: { getUuid: () => 'uuid-' + (++uuid) },
    AccessControlService: { getCurrentUser: params => ({ TenantID: params.tenantId }) },
    EventTypeRepository: {
      findById: (id) => {
        const tenant = Object.keys(tenants).find(key => tenants[key].event.ID === id && tenants[key].event.TenantID === currentTenant);
        return tenant ? tenants[tenant].event : null;
      }
    },
    FormRepository: {
      getForms: () => { calls.forms++; return tenants[currentTenant].forms; },
      findMappingsByEventType: () => { calls.mappings++; return tenants[currentTenant].mappings; },
      getFields: () => { calls.fields++; return tenants[currentTenant].fields; }
    },
    InformationTypeRepository: {
      findByTenant: () => { calls.types++; return tenants[currentTenant].types; },
      getAllColumns: () => { calls.columns++; return tenants[currentTenant].columns; }
    },
    Response: { success: data => ({ success: true, data }) },
    ErrorHandler: { create: (code, message) => Object.assign(new Error(message), { code }) },
    Constants: { ERROR: { NOT_FOUND: 'NOT_FOUND', INVALID_OPERATION: 'INVALID_OPERATION' } }
  };
  let currentTenant = 'TENANT-1';
  const originalGetCurrentUser = sandbox.AccessControlService.getCurrentUser;
  sandbox.AccessControlService.getCurrentUser = params => {
    currentTenant = params.tenantId;
    return originalGetCurrentUser(params);
  };
  vm.runInNewContext(source + '\n;globalThis.__FormService = FormService;', sandbox);
  return { service: sandbox.__FormService, calls, setTenant: tenantId => { currentTenant = tenantId; } };
}

test('event form definitions are served from a short-lived script cache on repeat reads', () => {
  const { service, calls } = loadService();
  const first = service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-1' });
  const afterFirst = Object.assign({}, calls);
  const second = service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-1' });

  assert.equal(first.data[0].Form.Name, 'Form 1');
  assert.deepEqual(JSON.parse(JSON.stringify(second.data)), JSON.parse(JSON.stringify(first.data)));
  assert.deepEqual(calls, afterFirst);
  assert.deepEqual(calls, { forms: 1, mappings: 1, fields: 1, types: 1, columns: 1 });
});

test('event form definition cache is isolated by tenant', () => {
  const { service, calls } = loadService();
  const first = service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-1' });
  const second = service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-2' });

  assert.equal(first.data[0].Form.ID, 'FORM-1');
  assert.equal(second.data[0].Form.ID, 'FORM-2');
  assert.deepEqual(calls, { forms: 2, mappings: 2, fields: 2, types: 2, columns: 2 });
});

test('tenant cache version invalidation forces a fresh form definition read', () => {
  const { service, calls } = loadService();
  service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-1' });
  service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-1' });
  assert.equal(calls.forms, 1);

  service._invalidateEventTypeFormDefinitions_('TENANT-1');
  service.listEventTypeForms('EVENT-1', { tenantId: 'TENANT-1' });

  assert.equal(calls.forms, 2);
  assert.equal(calls.mappings, 2);
  assert.equal(calls.fields, 2);
});
