'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadService() {
  const calls = { projects: 0, events: 0, attachments: 0, projectEvents: 0 };
  const projects = [
    { ID: 'P1', TenantID: 'T1', ProjectCode: 'PR-1', Title: 'Visible project' },
    { ID: 'P2', TenantID: 'T1', ProjectCode: 'PR-2', Title: 'Private project' },
    { ID: 'P3', TenantID: 'T2', ProjectCode: 'PR-3', Title: 'Other tenant' }
  ];
  const events = [
    { ID: 'E1', TenantID: 'T1', ProjectID: 'P1', EventTypeName: 'Cutting', OccurredAt: '2026-11-18T10:00:00Z' },
    { ID: 'E2', TenantID: 'T1', ProjectID: 'P2', EventTypeName: 'Sewing', OccurredAt: '2026-11-18T11:00:00Z' },
    { ID: 'E3', TenantID: 'T2', ProjectID: 'P1', EventTypeName: 'Other tenant event' }
  ];
  const attachments = [
    { ID: 'A1', TenantID: 'T1', EntityType: 'PROJECT', EntityID: 'P1', MimeType: 'image/jpeg', FileName: 'profile.jpg', UploadedAt: '2026-11-17T10:00:00Z', StorageKey: 'private-drive-key' },
    { ID: 'A2', TenantID: 'T1', EntityType: 'EVENT', EntityID: 'E1', MimeType: 'image/png', FileName: 'cut-1.png', UploadedAt: '2026-11-18T10:05:00Z', Base64: 'must-not-leak' },
    { ID: 'A3', TenantID: 'T1', EntityType: 'EVENT', EntityID: 'E1', MimeType: 'image/webp', FileName: 'cut-2.webp', UploadedAt: '2026-11-18T10:06:00Z' },
    { ID: 'A4', TenantID: 'T1', EntityType: 'EVENT', EntityID: 'E1', MimeType: 'application/pdf', FileName: 'spec.pdf' },
    { ID: 'A5', TenantID: 'T1', EntityType: 'PROJECT', EntityID: 'P1', MimeType: 'image/jpeg', Status: 'DELETED' },
    { ID: 'A6', TenantID: 'T1', EntityType: 'EVENT', EntityID: 'E1', MimeType: 'image/jpeg', Status: 'VOID' },
    { ID: 'A7', TenantID: 'T1', EntityType: 'EVENT', EntityID: 'E2', MimeType: 'image/jpeg' },
    { ID: 'A8', TenantID: 'T2', EntityType: 'PROJECT', EntityID: 'P3', MimeType: 'image/jpeg' },
    { ID: 'A9', TenantID: 'T2', EntityType: 'EVENT', EntityID: 'E3', MimeType: 'image/jpeg' }
  ];
  const user = { ID: 'U1', TenantID: 'T1' };
  const context = {
    AccessControlService: { getCurrentUser: () => user },
    ProjectRepository: {
      findById: (id) => projects.find((item) => item.ID === String(id)) || null,
      getAll: () => { calls.projects++; return projects; }
    },
    EventRepository: {
      findByProjectId: (id) => { calls.projectEvents++; return events.filter((item) => item.ProjectID === String(id)); },
      getAll: () => { calls.events++; return events; }
    },
    AttachmentRepository: {
      getAll: () => { calls.attachments++; return attachments; }
    },
    ProjectService: {
      _isProjectAvailableToUser_: (project) => project.ID === 'P1'
    },
    Validator: { required: (value, label) => {
      if (value === undefined || value === null || String(value) === '') throw new Error('required: ' + label);
    } },
    Constants: { STATUS: { DELETED: 'DELETED' }, ERROR: { NOT_FOUND: 'NOT_FOUND' } },
    ErrorHandler: { create: (_code, message) => new Error(message) },
    Response: { success: (data) => ({ success: true, data }) },
    Object, String, Number, Array, Date
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'AttachmentService.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__service = AttachmentService;', context);
  return { service: context.__service, calls };
}

test('project gallery returns only visible active image metadata for project and its events', () => {
  const { service, calls } = loadService();
  const result = service.listProjectImageGallery('P1', {});
  assert.equal(result.success, true);
  assert.deepEqual(Array.from(result.data.items, (item) => item.ID).sort(), ['A1', 'A2', 'A3']);
  assert.equal(result.data.items.find((item) => item.ID === 'A2').EventTypeName, 'Cutting');
  assert.equal(result.data.items.find((item) => item.ID === 'A1').EventTypeName, 'تصاویر پروژه');
  for (const item of result.data.items) {
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'StorageKey'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'Base64'), false);
  }
  assert.equal(calls.projectEvents, 1);
  assert.equal(calls.attachments, 1);
});

test('project gallery denies inaccessible projects before reading attachments', () => {
  const { service, calls } = loadService();
  assert.throws(() => service.listProjectImageGallery('P2', {}), /پروژه مورد نظر پیدا نشد/);
  assert.equal(calls.attachments, 0);
});

test('project image counts aggregate project and event images with one read per sheet', () => {
  const { service, calls } = loadService();
  const result = service.listProjectImageCounts({});
  assert.equal(result.success, true);
  assert.deepEqual(Array.from(result.data, (item) => ({ projectId: item.projectId, count: item.count })), [{ projectId: 'P1', count: 3 }]);
  assert.equal(calls.projects, 1);
  assert.equal(calls.events, 1);
  assert.equal(calls.attachments, 1);
});

test('router exposes count and per-project gallery routes with attachment permission', () => {
  const required = [];
  const context = {
    AccessControlService: {
      getCurrentUser: () => ({ ID: 'ADMIN', TenantID: 'T1' }),
      isAdmin: () => true,
      require: (_params, permission) => required.push(permission)
    },
    AttachmentService: {
      listProjectImageCounts: () => ({ marker: 'counts' }),
      listProjectImageGallery: (id) => ({ marker: 'gallery', id })
    },
    ProjectRepository: {}, ProjectService: {}, EventService: {},
    ErrorHandler: { create: (_code, message) => new Error(message) },
    Constants: { ERROR: { NOT_FOUND: 'NOT_FOUND' } },
    Object, String, Array
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'Router.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__router = Router;', context);
  assert.equal(context.__router.get('/project-image-gallery/counts', {}).marker, 'counts');
  const gallery = context.__router.get('/projects/P%201/image-gallery', {});
  assert.equal(gallery.marker, 'gallery');
  assert.equal(gallery.id, 'P 1');
  assert.deepEqual(required, ['ATTACHMENT_VIEW', 'ATTACHMENT_VIEW']);
});
