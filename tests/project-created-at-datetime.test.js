'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'ProjectService.js'), 'utf8');
const context = {
  Constants: { ERROR: { VALIDATION_ERROR: 'VALIDATION_ERROR' } },
  ErrorHandler: {
    create(code, message) {
      const error = new Error(message);
      error.code = code;
      return error;
    }
  }
};
vm.runInNewContext(source + '\nthis.__ProjectService = ProjectService;', context);
const normalize = context.__ProjectService._normalizeCreatedAt_.bind(context.__ProjectService);

test('project datetime preserves the exact UTC timestamp selected by the client', () => {
  assert.equal(normalize('2026-11-11T09:15:00.000Z'), '2026-11-11T09:15:00.000Z');
});

test('project datetime with an explicit timezone offset is normalized to UTC', () => {
  assert.equal(normalize('2026-11-11T12:45:00+03:30'), '2026-11-11T09:15:00.000Z');
});

test('legacy date-only project values retain the established noon-UTC representation', () => {
  assert.equal(normalize('2026-11-11'), '2026-11-11T12:00:00.000Z');
});

test('empty project date keeps the existing server-time fallback', () => {
  assert.equal(normalize('', '2026-11-11T09:15:00.000Z'), '2026-11-11T09:15:00.000Z');
});

test('invalid dates, times, and timezone offsets are rejected', () => {
  for (const value of [
    '2026-02-30',
    '2026-11-11T25:00:00.000Z',
    '2026-11-11T09:15:00',
    '2026-11-11T09:15:00+14:30'
  ]) {
    assert.throws(() => normalize(value), /تاریخ ایجاد پروژه معتبر نیست/);
  }
});

test('project creation and draft creation both use the shared timestamp normalizer', () => {
  assert.equal((source.match(/this\._normalizeCreatedAt_\(project\.CreatedAt, now\)/g) || []).length, 2);
});
