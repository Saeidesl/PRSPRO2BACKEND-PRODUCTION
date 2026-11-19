const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
