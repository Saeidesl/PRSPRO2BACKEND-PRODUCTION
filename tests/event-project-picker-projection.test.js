'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'ProjectService.js'), 'utf8');

function loadProjectService(projects) {
  const sandbox = {
    AccessControlService: {
      getCurrentUser: () => ({ ID: 'USER-1', TenantID: 'TENANT-1' }),
      isAdmin: () => false
    },
    PermissionService: { hasPermission: () => true },
    ProjectRepository: { getAll: () => projects },
    Response: { success: data => ({ success: true, data }) },
    InformationTypeRepository: {
      findByTenant: () => { throw new Error('picker must skip card information lookup'); }
    },
    ProjectInformationRepository: {
      getAll: () => { throw new Error('picker must skip project information lookup'); }
    }
  };
  vm.runInNewContext(source + '\n;globalThis.__ProjectService = ProjectService;', sandbox);
  sandbox.__ProjectService._isProjectAvailableToUser_ = () => true;
  return sandbox.__ProjectService;
}

test('event picker returns a minimal tenant-scoped project projection without card data reads', () => {
  const projects = [
    {
      ID: 'P-1', TenantID: 'TENANT-1', ProjectCode: 'PR-001', Title: 'طرح اول',
      RecordState: 'ACTIVE', WorkflowID: 'WF-1', CurrentStepID: 'STEP-1',
      CurrentStepName: 'برش', CurrentStepStatus: 'IN_PROGRESS', Status: 'ACTIVE',
      LargeUnusedPayload: 'x'.repeat(10000)
    },
    { ID: 'P-2', TenantID: 'OTHER', ProjectCode: 'PR-002', Title: 'پروژه دیگر' }
  ];
  const service = loadProjectService(projects);
  const response = service.list({ view: 'event-picker' });
  assert.equal(response.success, true);
  assert.deepEqual(response.data.map(project => project.ID), ['P-1']);
  assert.deepEqual(Object.keys(response.data[0]).sort(), [
    'CurrentStepID', 'CurrentStepName', 'CurrentStepStatus', 'ID', 'Name',
    'ProjectCode', 'ProjectName', 'RecordState', 'Status', 'Title',
    'WorkflowID', 'WorkflowStepName'
  ].sort());
  assert.equal(response.data[0].WorkflowID, 'WF-1');
  assert.equal(response.data[0].CurrentStepID, 'STEP-1');
});

test('ordinary project list keeps the full existing project-card path', () => {
  const service = loadProjectService([
    { ID: 'P-1', TenantID: 'TENANT-1', ProjectCode: 'PR-001', Title: 'طرح اول' }
  ]);
  service._isProjectAvailableToUser_ = () => true;
  const response = service.list({});
  assert.equal(response.success, true);
  assert.ok(Array.isArray(response.data));
  assert.ok(Array.isArray(response.data[0].CardInformation));
});
