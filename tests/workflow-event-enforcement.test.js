'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('event creation enforces the active workflow step rules before persistence', () => {
  const service = read('EventService.js');
  assert.match(service, /_getWorkflowRuleProgress_:\s*function/);
  assert.match(service, /_validateWorkflowEvent_:\s*function/);
  assert.match(service, /this\._validateWorkflowEvent_\(project, eventType, user\.TenantID\)/);
  assert.match(service, /ابتدا رویدادهای اجباری با ترتیب قبلی را ثبت کنید/);
  assert.match(service, /ابتدا رویدادهای اجباری گروه قبلی را تکمیل کنید/);
});

test('workflow progress is tenant and project access scoped', () => {
  const service = read('EventService.js');
  const router = read('Router.js');
  assert.match(service, /workflowProgress:\s*function/);
  assert.match(service, /ProjectService\._isProjectAvailableToUser_\(project, user\)/);
  assert.match(router, /parts\[3\] === 'workflow-progress'/);
  assert.match(router, /EventService\.workflowProgress\(projectId, params\)/);
});

test('events retain the workflow step and version used at registration', () => {
  const service = read('EventService.js');
  const database = read('DatabaseSetup.js');
  assert.match(service, /WorkflowID: project \? \(project\.WorkflowID \|\| ''\)/);
  assert.match(service, /WorkflowStepID: project \? \(project\.CurrentStepID \|\| ''\)/);
  assert.match(database, /'WorkflowID','WorkflowVersion','WorkflowStepID','EventTypeID'/);
  assert.match(service, /بازمحاسبه تکمیل مرحله پس از ابطال رویداد/);
});


test('repeatable workflow rules expose occurrence counts and require explicit completion', () => {
  const service = read('EventService.js');
  const validator = read('WorkflowStepEventRuleValidator.js');
  const repository = read('WorkflowStepEventRuleRepository.js');
  assert.match(validator, /AllowRepeat/);
  assert.match(repository, /AllowRepeat/);
  assert.match(service, /eventCount:\s*eventCount/);
  assert.match(service, /manualCompletionRequired/);
  assert.match(service, /if \(rule\.satisfied && !rule\.allowRepeat\)/);
  assert.match(service, /مرحله این پروژه پایان یافته است/);
});

test('manual workflow step completion is exposed through the existing project API namespace', () => {
  const service = read('EventService.js');
  const router = read('Router.js');
  assert.match(service, /completeStep:\s*function/);
  assert.match(service, /_canUserCompleteStep_/);
  assert.match(service, /WorkflowStepDepartmentRepository\.findByWorkflowId/);
  assert.match(service, /WORKFLOW_STEP_COMPLETED/);
  assert.match(router, /complete-step/);
  assert.match(router, /EventService\.completeStep/);
  assert.match(router, /AccessControlService\.require\(params, 'EVENT_CREATE'\)/);
});


test('event insert revalidates workflow state inside the shared spreadsheet write lock', () => {
  const service = read('EventService.js');
  const eventRepository = read('EventRepository.js');
  const sheets = read('GoogleSheetsRepository.js');
  assert.match(service, /EventRepository\.insert\(newEvent, project \? function\(\)/);
  assert.match(service, /Revalidate under the repository's ScriptLock/);
  assert.match(eventRepository, /insert: function\(event, beforeWrite\)/);
  assert.match(sheets, /if \(typeof beforeWrite === 'function'\) beforeWrite\(\)/);
});


test('changed backend sources pass JavaScript syntax parsing', () => {
  [
    'DatabaseSetup.js',
    'EventRepository.js',
    'EventService.js',
    'GoogleSheetsRepository.js',
    'Router.js',
    'WorkflowStepEventRuleRepository.js',
    'WorkflowStepEventRuleValidator.js'
  ].forEach((file) => {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }), file);
  });
});
