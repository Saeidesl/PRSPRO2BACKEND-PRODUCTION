'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadService(options = {}) {
  const props = Object.assign({
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_WEBHOOK_SECRET: 'test-secret',
    TELEGRAM_TENANT_CHAT_IDS: '{}'
  }, options.properties || {});
  const sent = [];
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => props[key] || '' }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } })
    },
    UrlFetchApp: { fetch: (url, options) => {
      sent.push({ url, options });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ ok: true }) };
    } },
    console: { warn() {} },
    JSON, String, Object, Array, RegExp
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'TelegramBotService.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__service = TelegramBotService;', context);
  return { service: context.__service, sent };
}

test('automatically pairs the first private chat with the only active tenant during the armed window', () => {
  const properties = { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_TENANT_CHAT_IDS: '{}' };
  const messages = [];
  const context = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties[key] || '',
      setProperty: (key, value) => { properties[key] = String(value); },
      deleteProperty: key => { delete properties[key]; }
    }) },
    GoogleSheetsRepository: { getAll: name => name === '01_Tenants'
      ? [{ ID: 'TENANT_MAIN', Name: 'شرکت اصلی', Status: 'ACTIVE' }]
      : [] },
    UrlFetchApp: { fetch: (url, options) => {
      messages.push({ url, options });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ ok: true }) };
    } },
    Date, JSON, String, Object, Array, RegExp, Math,
    console: { warn() {} }
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'TelegramBotService.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__service = TelegramBotService;', context);
  const result = context.__service.armTenantRegistration();
  assert.equal(result.ok, true);
  const processed = context.__service._processUpdate_({
    message: { chat: { id: 556677, type: 'private' }, from: { first_name: 'Admin' }, text: '/start' }
  });
  assert.equal(processed.registered, true);
  assert.deepEqual(JSON.parse(properties.TELEGRAM_TENANT_CHAT_IDS), { TENANT_MAIN: ['556677'] });
  assert.equal(properties.TELEGRAM_PENDING_TENANT_ID, undefined);
  assert.equal(properties.TELEGRAM_PENDING_REGISTRATION_EXPIRES_AT, undefined);
  assert.match(JSON.parse(messages[0].options.payload).text, /اتصال/);
});

test('refuses automatic pairing when more than one active tenant exists', () => {
  const properties = { TELEGRAM_BOT_TOKEN: 'test-token' };
  const context = {
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => properties[key] || '',
      setProperty: (key, value) => { properties[key] = String(value); }
    }) },
    GoogleSheetsRepository: { getAll: () => [
      { ID: 'T1', Status: 'ACTIVE' }, { ID: 'T2', Status: 'ACTIVE' }
    ] },
    JSON, String, Object, Array, Date, Math
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'TelegramBotService.js'), 'utf8');
  vm.runInNewContext(source + '\nthis.__service = TelegramBotService;', context);
  assert.throws(() => context.__service.armTenantRegistration(), /فقط یک Tenant فعال/);
  assert.equal(properties.TELEGRAM_PENDING_TENANT_ID, undefined);
});

test('rejects webhook calls without the configured secret', () => {
  const h = loadService();
  const response = h.service.handleWebhook({ parameter: { telegramSecret: 'wrong' }, postData: { contents: '{}' } });
  assert.deepEqual(JSON.parse(response.text), { ok: false });
  assert.equal(h.sent.length, 0);
});

test('returns the chat ID but does not auto-subscribe arbitrary chats', () => {
  const h = loadService({ properties: { TELEGRAM_BOT_TOKEN: 'fake-token' } });
  h.service.handleWebhook({
    parameter: { telegramSecret: 'test-secret' },
    postData: { contents: JSON.stringify({ message: { chat: { id: 12345 }, from: { first_name: 'Test' }, text: '/start' } }) }
  });
  assert.equal(h.sent.length, 1);
  const payload = JSON.parse(h.sent[0].options.payload);
  assert.equal(payload.chat_id, '12345');
  assert.match(payload.text, /12345/);
  assert.match(payload.text, /مدیر سامانه/);
});

test('sends event notices only to chat IDs mapped to the event tenant', () => {
  const h = loadService({ properties: {
    TELEGRAM_BOT_TOKEN: 'fake-token',
    TELEGRAM_TENANT_CHAT_IDS: JSON.stringify({ T1: ['111', '222'], T2: ['333'] })
  } });
  const result = h.service.notifyEvent(
    { Description: 'شروع دوخت', OccurredAt: '2026-01-01' },
    { ID: 'P1', TenantID: 'T1', ProjectCode: 'P-01', Title: 'نمونه', NotifyEnabled: true },
    { Name: 'شروع دوخت' }, { Name: 'دوخت' }, { Name: 'کاربر' }, 'T1'
  );
  assert.equal(result.sent, 2);
  assert.equal(h.sent.length, 2);
  assert.ok(h.sent.every((call) => {
    const payload = JSON.parse(call.options.payload);
    return ['111', '222'].includes(payload.chat_id);
  }));
});

test('does not send notices when project notifications are disabled', () => {
  const h = loadService({ properties: {
    TELEGRAM_BOT_TOKEN: 'fake-token',
    TELEGRAM_TENANT_CHAT_IDS: JSON.stringify({ T1: ['111'] })
  } });
  const result = h.service.notifyEvent(
    {}, { NotifyEnabled: false }, { Name: 'Test' }, {}, {}, 'T1'
  );
  assert.equal(result.sent, 0);
  assert.equal(h.sent.length, 0);
});
