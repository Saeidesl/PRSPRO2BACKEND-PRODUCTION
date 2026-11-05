'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const TARGET_FOLDER_ID = '1E-nYv5GF8wPn9diOZlfiGXnWQH-2WSmB';

function loadStorage(overrides) {
  const calls = { folderIds: [], createFile: [], makeCopy: [] };
  const targetFolder = {
    createFile(blob) {
      calls.createFile.push(blob);
      return {
        getId: () => 'NEW_FILE_ID',
        getName: () => blob.name,
        getMimeType: () => blob.contentType,
        getSize: () => blob.bytes.length,
        getUrl: () => 'https://drive.google.com/file/d/NEW_FILE_ID'
      };
    }
  };
  const sourceFile = {
    makeCopy(name, folder) {
      calls.makeCopy.push({ name, folder });
      return {
        getId: () => 'COPIED_FILE_ID',
        getName: () => name,
        getMimeType: () => 'image/png',
        getSize: () => 3,
        getUrl: () => 'https://drive.google.com/file/d/COPIED_FILE_ID'
      };
    }
  };
  const context = {
    AppConfig: {
      APP_NAME: 'Production Management System',
      FILES: {
        MAX_SIZE_MB: 10,
        GOOGLE_DRIVE_FOLDER_ID: TARGET_FOLDER_ID,
        ALLOWED_MIME_TYPES: ['image/png', 'application/pdf']
      }
    },
    DriveApp: {
      getFolderById(id) {
        calls.folderIds.push(id);
        if (overrides && overrides.folderError) throw new Error('folder access denied');
        return targetFolder;
      },
      getFoldersByName() { throw new Error('legacy fallback must not be used'); },
      createFolder() { throw new Error('legacy fallback must not be used'); },
      getFileById() { return sourceFile; }
    },
    Utilities: {
      base64Decode: () => [1, 2, 3],
      newBlob: (bytes, contentType, name) => ({ bytes, contentType, name })
    },
    Validator: {
      required(value, label) {
        if (value === undefined || value === null || String(value) === '') {
          throw new Error('required: ' + label);
        }
      }
    },
    ErrorHandler: { create: (_code, message) => new Error(message) },
    Constants: { ERROR: { UPLOAD_FAILED: 'UPLOAD_FAILED', FILE_NOT_FOUND: 'FILE_NOT_FOUND' } }
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'GoogleDriveStorage.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__storage = GoogleDriveStorage;', context);
  return { storage: context.__storage, calls, targetFolder };
}

test('root folder resolves to the configured shared Drive folder ID', () => {
  const { storage, calls, targetFolder } = loadStorage();
  assert.equal(storage.getRootFolder_(), targetFolder);
  assert.deepEqual(calls.folderIds, [TARGET_FOLDER_ID]);
});

test('new attachment uploads are created inside the configured shared folder', () => {
  const { storage, calls } = loadStorage();
  const result = storage.uploadBase64({
    fileName: 'project-image.png',
    mimeType: 'image/png',
    base64: 'AQID'
  });
  assert.equal(calls.folderIds[0], TARGET_FOLDER_ID);
  assert.equal(calls.createFile.length, 1);
  assert.equal(result.storageKey, 'NEW_FILE_ID');
  assert.equal(result.fileName, 'project-image.png');
});

test('copied project images are created inside the configured shared folder', () => {
  const { storage, calls, targetFolder } = loadStorage();
  const result = storage.copyFile('SOURCE_FILE_ID', 'PROJECT_PROFILE.png');
  assert.equal(calls.folderIds[0], TARGET_FOLDER_ID);
  assert.equal(calls.makeCopy.length, 1);
  assert.equal(calls.makeCopy[0].folder, targetFolder);
  assert.equal(result.storageKey, 'COPIED_FILE_ID');
});

test('folder access errors are not silently redirected to a different folder', () => {
  const { storage } = loadStorage({ folderError: true });
  assert.throws(() => storage.getRootFolder_(), /folder access denied/);
});

test('production AppConfig points to the requested shared folder', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'AppConfig.gs.js'), 'utf8');
  assert.match(source, /GOOGLE_DRIVE_FOLDER_ID:\s*'1E-nYv5GF8wPn9diOZlfiGXnWQH-2WSmB'/);
  assert.doesNotThrow(() => new vm.Script(source));
});
