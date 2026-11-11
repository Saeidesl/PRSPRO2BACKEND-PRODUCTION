'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadTelegramService(options) {
  options = options || {};
  const sent = [];
  const properties = {
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_TENANT_CHAT_IDS: JSON.stringify(options.mapping || { T1: ['1001', '1002'], T2: ['2001'] })
  };
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: key => properties[key] || '' })
    },
    UrlFetchApp: {
      fetch: (url, request) => {
        sent.push({ url, payload: typeof request.payload === 'string' ? JSON.parse(request.payload) : request.payload });
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify({ ok: true, result: { message_id: sent.length } })
        };
      }
    },
    FormRepository: {
      findResponsesByEvent: () => options.responses || []
    },
    AttachmentRepository: {
      findById: id => (options.attachments || []).find(item => String(item.ID) === String(id)) || null,
      findByEntity: (type, id) => (options.attachments || []).filter(item => String(item.EntityType) === String(type) && String(item.EntityID) === String(id))
    },
    StorageRepository: {
      getFile: key => ({ getName: () => key, getBlob: () => ({ setName: name => ({ name }) }) })
    },
    Utilities: {
      formatDate: (date, timezone, format) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
        }).formatToParts(date).reduce((result, part) => {
          if (part.type !== 'literal') result[part.type] = part.value;
          return result;
        }, {});
        return parts.year + '-' + parts.month + '-' + parts.day + ' ' + parts.hour + ':' + parts.minute + ':' + parts.second;
      }
    },
    console: { warn: () => {}, log: () => {} },
    JSON, String, Number, Array, Object, Math, RegExp, isFinite
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'TelegramBotService.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__service = TelegramBotService;', context);
  return { service: context.__service, sent };
}

test('sends independent event notifications to the matching tenant chats with form details', () => {
  const harness = loadTelegramService({
    responses: [{
      TenantID: 'T1',
      EventID: 'EVT-INDEPENDENT',
      DefinitionSnapshotJSON: JSON.stringify({
        Name: 'فرم خرید عمومی',
        Fields: [{
          InformationTypeID: 'IT1',
          LabelOverride: 'اقلام خرید',
          InformationType: {
            ID: 'IT1', Name: 'اقلام خرید', Cardinality: 'MULTIPLE',
            Columns: [
              { Code: 'Item', Name: 'قلم', DataType: 'text', Status: 'ACTIVE' },
              { Code: 'Qty', Name: 'تعداد', DataType: 'number', Status: 'ACTIVE' }
            ]
          }
        }]
      }),
      ResponseJSON: JSON.stringify({ IT1: [{ Item: 'پارچه', Qty: 2 }, { Item: 'زیپ', Qty: 1 }] })
    }]
  });
  const result = harness.service.notifyEvent(
    { ID: 'EVT-INDEPENDENT', TenantID: 'T1', ProjectID: '', Description: 'سفارش عمومی', OccurredAt: '2026-11-07T10:00:00Z' },
    null,
    { Name: 'درخواست خرید عمومی' },
    { Name: 'تدارکات' },
    { Name: 'کاربر تست' },
    'T1'
  );
  assert.equal(result.status, 'SENT');
  assert.equal(result.sent, 2);
  assert.equal(harness.sent.length, 2);
  assert.match(harness.sent[0].payload.text, /رویداد مستقل/);
  assert.match(harness.sent[0].payload.text, /درخواست خرید عمومی/);
  assert.match(harness.sent[0].payload.text, /ردیف 1/);
  assert.match(harness.sent[0].payload.text, /پارچه/);
  assert.match(harness.sent[0].payload.text, /زیپ/);
  assert.equal(harness.sent[0].payload.chat_id, '1001');
  assert.equal(harness.sent[1].payload.chat_id, '1002');
});

test('sends project details and canonical image names while excluding other-tenant form responses', () => {
  const harness = loadTelegramService({
    responses: [
      {
        TenantID: 'T1', EventID: 'EVT1',
        DefinitionSnapshotJSON: JSON.stringify({
          Name: 'فرم نمونه‌گیری',
          Fields: [{
            InformationTypeID: 'IMG',
            LabelOverride: 'تصویر نمونه تأییدشده',
            InformationType: { ID: 'IMG', Name: 'تصویر', DataType: 'image', Cardinality: 'SINGLE' }
          }]
        }),
        ResponseJSON: JSON.stringify({ IMG: [{ AttachmentID: 'A1', FileName: 'نام جعلی.png' }] })
      },
      {
        TenantID: 'T2', EventID: 'EVT1',
        DefinitionSnapshotJSON: JSON.stringify({ Name: 'اطلاعات محرمانه', Fields: [] }),
        ResponseJSON: '{}'
      }
    ],
    attachments: [{
      ID: 'A1', TenantID: 'T1', EntityType: 'PROJECT', EntityID: 'P1',
      Status: 'ACTIVE', FileName: 'sample-approved.png', MimeType: 'image/png'
    }]
  });
  const result = harness.service.notifyEvent(
    { ID: 'EVT1', TenantID: 'T1', ProjectID: 'P1', Description: 'تأیید نمونه' },
    { ID: 'P1', ProjectCode: 'PR-10', Title: 'مانتو', NotifyEnabled: true },
    { Name: 'تأیید تولید' },
    { Name: 'نمونه‌گیری' },
    { Name: 'اپراتور' },
    'T1'
  );
  assert.equal(result.status, 'SENT');
  assert.match(harness.sent[0].payload.text, /PR-10/);
  assert.match(harness.sent[0].payload.text, /sample-approved.png/);
  assert.doesNotMatch(harness.sent[0].payload.text, /نام جعلی/);
  assert.doesNotMatch(harness.sent[0].payload.text, /اطلاعات محرمانه/);
});

test('respects project NotifyEnabled=false but does not require a project for independent events', () => {
  const harness = loadTelegramService();
  const disabled = harness.service.notifyEvent(
    { ID: 'EVT1', ProjectID: 'P1' },
    { ID: 'P1', NotifyEnabled: false },
    { Name: 'رویداد' }, null, null, 'T1'
  );
  assert.equal(disabled.status, 'PROJECT_NOTIFICATIONS_DISABLED');
  assert.equal(harness.sent.length, 0);

  const independent = harness.service.notifyEvent(
    { ID: 'EVT2', ProjectID: '' },
    null, { Name: 'رویداد مستقل' }, null, null, 'T1'
  );
  assert.equal(independent.status, 'SENT');
  assert.equal(harness.sent.length, 2);
});

test('splits long notifications into safe Telegram message chunks', () => {
  const harness = loadTelegramService({ mapping: { T1: ['1001'] } });
  const longText = 'جزئیات طولانی\n' + Array.from({ length: 180 }, (_, index) => 'ردیف ' + index + ': ' + 'مقدار'.repeat(12)).join('\n');
  const chunks = harness.service._splitNotificationMessage_(longText, 3800);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.length <= 3800));
  assert.equal(chunks.join('\n'), longText);
});

test('does not send to a different tenant and handles missing Telegram configuration', () => {
  const harness = loadTelegramService({ mapping: { T2: ['2001'] } });
  const result = harness.service.notifyEvent(
    { ID: 'EVT1', ProjectID: '' },
    null, { Name: 'رویداد' }, null, null, 'T1'
  );
  assert.equal(result.status, 'NOT_CONFIGURED');
  assert.equal(harness.sent.length, 0);
});

test('formats event timestamps as Jalali Tehran time and omits the internal event ID', () => {
  const harness = loadTelegramService({ mapping: { T1: ['1001'] } });
  const result = harness.service.notifyEvent(
    { ID: 'EVT-PRIVATE-ID', TenantID: 'T1', ProjectID: '', OccurredAt: '2026-11-11T15:03:00.000Z', CreatedAt: '2026-11-11T15:04:39.584Z' },
    null, { Name: 'ثبت آزمایشی' }, null, { Name: 'مدیر' }, 'T1'
  );
  assert.equal(result.status, 'SENT');
  assert.match(harness.sent[0].payload.text, /1405\/08\/20 18:33/);
  assert.match(harness.sent[0].payload.text, /1405\/08\/20 18:34/);
  assert.doesNotMatch(harness.sent[0].payload.text, /EVT-PRIVATE-ID/);
});

test('sends event attachments as original documents, not links or photo conversions', () => {
  const attachment = {
    ID: 'A1', TenantID: 'T1', EntityType: 'PROJECT', EntityID: 'P1',
    Status: 'ACTIVE', FileName: 'طرح-اولیه.jpg', MimeType: 'image/jpeg',
    StorageKey: 'DRIVE_FILE_1', FileSize: 1024
  };
  const harness = loadTelegramService({
    mapping: { T1: ['1001'] },
    attachments: [attachment],
    responses: [{
      TenantID: 'T1', EventID: 'EVT1',
      DefinitionSnapshotJSON: JSON.stringify({ Name: 'فرم طراحی', Fields: [{ InformationTypeID: 'IMG', InformationType: { ID: 'IMG', Name: 'تصویر', DataType: 'image' } }] }),
      ResponseJSON: JSON.stringify({ IMG: [{ AttachmentID: 'A1', FileName: 'طرح-اولیه.jpg' }] })
    }]
  });
  const result = harness.service.notifyEvent(
    { ID: 'EVT1', TenantID: 'T1', ProjectID: 'P1' },
    { ID: 'P1', TenantID: 'T1', NotifyEnabled: true },
    { Name: 'تحویل طرح' }, null, null, 'T1'
  );
  assert.equal(result.mediaSent, 1);
  const mediaCall = harness.sent.find(call => call.url.indexOf('/sendDocument') >= 0);
  assert.ok(mediaCall);
  assert.equal(mediaCall.payload.document.name, 'طرح-اولیه.jpg');
  assert.doesNotMatch(harness.sent[0].payload.text, /https?:\/\//);
});

test('sends project creation notices to the matching tenant and includes its Jalali timestamp', () => {
  const harness = loadTelegramService({ mapping: { T1: ['1001'] } });
  const result = harness.service.notifyProject({
    ID: 'P-NEW', TenantID: 'T1', ProjectCode: 'P-01', Title: 'نمونه',
    RecordState: 'ACTIVE', NotifyEnabled: true, CreatedAt: '2026-11-11T15:03:00.000Z'
  }, { Name: 'مدیر سیستم' }, 'T1');
  assert.equal(result.status, 'SENT');
  assert.equal(harness.sent.length, 1);
  assert.match(harness.sent[0].payload.text, /پروژه جدید/);
  assert.match(harness.sent[0].payload.text, /1405\/08\/20 18:33/);
});

test('project creation service invokes the existing notification hook for drafts and active projects', () => {
  const projectService = fs.readFileSync(path.join(__dirname, '..', 'ProjectService.js'), 'utf8');
  assert.match(projectService, /this\._notifyProjectCreated_\(createdDraft, user\)/);
  assert.match(projectService, /this\._notifyProjectCreated_\(created, user\)/);
});
