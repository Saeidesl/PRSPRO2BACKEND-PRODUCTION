'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'EventTypeService.js'), 'utf8');

function loadService(includeResult) {
  const calls = [];
  const sandbox = {
    AccessControlService: {
      getCurrentUser: () => ({ ID: 'USER-1', TenantID: 'TENANT-1', DepartmentID: 'DEPT-1' }),
      isAdmin: () => false
    },
    PermissionService: { hasPermission: () => false },
    EventTypeRepository: {
      getAll: () => [
        { ID: 'EVENT-1', TenantID: 'TENANT-1', Status: 'ACTIVE', Name: 'رویداد اول' },
        { ID: 'EVENT-2', TenantID: 'TENANT-1', Status: 'ACTIVE', Name: 'رویداد دوم' },
        { ID: 'EVENT-3', TenantID: 'OTHER', Status: 'ACTIVE', Name: 'رویداد مجموعه دیگر' },
        { ID: 'EVENT-4', TenantID: 'TENANT-1', Status: 'INACTIVE', Name: 'رویداد غیرفعال' }
      ]
    },
    FormService: {
      listEventTypeForms: (eventTypeId, params) => {
        calls.push({ eventTypeId, params });
        if (includeResult && includeResult.throwFor === eventTypeId) {
          throw new Error('invalid form definition');
        }
        return { success: true, data: [{ ID: 'MAP-' + eventTypeId, Form: { ID: 'FORM-' + eventTypeId } }] };
      }
    },
    Response: { success: data => ({ success: true, data }) }
  };
  vm.runInNewContext(source + '\n;globalThis.__EventTypeService = EventTypeService;', sandbox);
  return { service: sandbox.__EventTypeService, calls };
}

test('event type list remains unchanged unless form prefetch is explicitly requested', () => {
  const { service, calls } = loadService();
  const response = service.list({});
  assert.equal(response.success, true);
  assert.deepEqual(Array.from(response.data.items, item => item.ID), ['EVENT-1', 'EVENT-2']);
  assert.equal(calls.length, 0);
  assert.equal(Object.hasOwn(response.data.items[0], 'FormDefinitions'), false);
});

test('event type list can include tenant-scoped form definitions in one request', () => {
  const { service, calls } = loadService();
  const response = service.list({ includeFormDefinitions: 'true' });
  assert.equal(response.success, true);
  assert.deepEqual(Array.from(response.data.items, item => item.ID), ['EVENT-1', 'EVENT-2']);
  assert.deepEqual(Array.from(response.data.items[0].FormDefinitions, item => item.ID), ['MAP-EVENT-1']);
  assert.deepEqual(Array.from(response.data.items[1].FormDefinitions, item => item.ID), ['MAP-EVENT-2']);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.params.includeFormDefinitions === 'true'));
});

test('one invalid event type definition does not block the full event type list', () => {
  const { service, calls } = loadService({ throwFor: 'EVENT-2' });
  const response = service.list({ includeFormDefinitions: true });
  assert.equal(response.success, true);
  assert.equal(response.data.items.length, 2);
  assert.deepEqual(Array.from(response.data.items[0].FormDefinitions, item => item.ID), ['MAP-EVENT-1']);
  assert.equal(response.data.items[1].FormDefinitionsLoadFailed, true);
  assert.equal(Object.hasOwn(response.data.items[1], 'FormDefinitions'), false);
  assert.equal(calls.length, 2);
});
