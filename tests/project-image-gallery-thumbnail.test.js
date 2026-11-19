const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'GoogleDriveStorage.js'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'StorageRepository.js'), 'utf8');
const service = fs.readFileSync(path.join(root, 'AttachmentService.js'), 'utf8');
const router = fs.readFileSync(path.join(root, 'Router.js'), 'utf8');

test('Google Drive thumbnails are returned as image-only reduced preview blobs', () => {
  assert.match(storage, /getThumbnailAsBase64: function/);
  assert.match(storage, /file\.getThumbnail\(\)/);
  assert.match(storage, /mimeType\.indexOf\('image\/'\) !== 0/);
  assert.match(repository, /GoogleDriveStorage\.getThumbnailAsBase64\(storageKey\)/);
});

test('thumbnail service enforces tenant, attachment visibility, active state and image MIME', () => {
  const start = service.indexOf('downloadThumbnail: function');
  const end = service.indexOf('download: function', start);
  const method = service.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(method, /AccessControlService\.getCurrentUser/);
  assert.match(method, /_isAttachmentVisibleToUser_/);
  assert.match(method, /DELETED', 'VOID'/);
  assert.match(method, /MimeType.*image\//);
  assert.match(method, /StorageRepository\.getThumbnailAsBase64/);
});

test('thumbnail route remains behind the existing attachment-view permission gate', () => {
  const start = router.indexOf("if (path.indexOf('/attachments/') === 0)");
  const end = router.indexOf("if (path === '/users')", start);
  const route = router.slice(start, end);
  assert.match(route, /AccessControlService\.require\(params, 'ATTACHMENT_VIEW'\)/);
  assert.match(route, /parts\[3\] === 'thumbnail'/);
  assert.match(route, /AttachmentService\.downloadThumbnail\(attachmentId, params\)/);
});


function loadThumbnailService(attachment, visible) {
  const calls = { thumbnail: 0 };
  const context = {
    Validator: { required: (value, label) => {
      if (value === undefined || value === null || String(value) === '') throw new Error('required: ' + label);
    } },
    AccessControlService: { getCurrentUser: () => ({ ID: 'U1', TenantID: 'T1' }) },
    AttachmentRepository: { findById: () => attachment },
    StorageRepository: { getThumbnailAsBase64: () => {
      calls.thumbnail += 1;
      return { fileName: 'small.jpg', mimeType: 'image/jpeg', fileSize: 42, base64: 'c21hbGw=' };
    } },
    Constants: { ERROR: { FILE_NOT_FOUND: 'FILE_NOT_FOUND' } },
    ErrorHandler: { create: (_code, message) => new Error(message) },
    Response: { success: (data) => ({ success: true, data }) }
  };
  const source = fs.readFileSync(path.join(root, 'AttachmentService.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__service = AttachmentService;', context);
  context.__service._isAttachmentVisibleToUser_ = () => visible !== false;
  return { service: context.__service, calls };
}

test('thumbnail service returns only reduced image bytes for an authorized active attachment', () => {
  const attachment = { ID: 'A1', TenantID: 'T1', Status: 'ACTIVE', MimeType: 'image/jpeg', StorageKey: 'private-key' };
  const { service, calls } = loadThumbnailService(attachment, true);
  const result = service.downloadThumbnail('A1', {});
  assert.equal(result.success, true);
  assert.equal(result.data.Base64, 'c21hbGw=');
  assert.equal(result.data.MimeType, 'image/jpeg');
  assert.equal(Object.prototype.hasOwnProperty.call(result.data, 'StorageKey'), false);
  assert.equal(calls.thumbnail, 1);
});

test('thumbnail service rejects cross-tenant, hidden, deleted and non-image attachments', () => {
  const cases = [
    [{ ID: 'A1', TenantID: 'T2', Status: 'ACTIVE', MimeType: 'image/jpeg' }, true],
    [{ ID: 'A1', TenantID: 'T1', Status: 'ACTIVE', MimeType: 'image/jpeg' }, false],
    [{ ID: 'A1', TenantID: 'T1', Status: 'DELETED', MimeType: 'image/jpeg' }, true],
    [{ ID: 'A1', TenantID: 'T1', Status: 'ACTIVE', MimeType: 'application/pdf' }, true]
  ];
  cases.forEach(([attachment, visible]) => {
    const { service, calls } = loadThumbnailService(attachment, visible);
    assert.throws(() => service.downloadThumbnail('A1', {}));
    assert.equal(calls.thumbnail, 0);
  });
});
