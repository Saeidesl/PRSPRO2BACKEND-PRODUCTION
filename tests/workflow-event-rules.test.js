'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('workflow event rule schema is additive and version-aware', () => {
  const schema = read('DatabaseSetup.js');
  assert.match(schema, /name: '37_WorkflowStepEventRules'/);
  assert.match(schema, /WorkflowType[\s\S]*LifecycleState[\s\S]*PublishedVersion[\s\S]*DraftVersion/);
  assert.match(schema, /WorkflowVersion/);
  assert.ok(schema.includes("'EventOrder','DisplayOrder'"));
});

test('workflow event rule APIs are permission-protected and tenant-scoped', () => {
  const router = read('Router.js');
  const service = read('WorkflowService.js');
  assert.match(router, /event-rules/);
  assert.match(router, /WORKFLOW_MANAGE/);
  assert.match(router, /parts\[3\] === 'publish'/);
  assert.match(service, /saveStepEventRules/);
  assert.match(service, /String\(workflow\.TenantID\) !== String\(user\.TenantID\)/);
  assert.match(service, /WORKFLOW_PUBLISHED/);
  assert.match(service, /eventTypes: eventTypes/);
  assert.match(service, /ConnectionType/);
  assert.match(service, /return \{ ID: row.ID, Name: row.Name, Code: row.Code/);
  assert.match(service, /if \(isPublished && !workflow.DraftVersion\)/);
  assert.match(service, /Number\(item.WorkflowVersion \|\| 1\) <= version/);
  assert.match(service, /Number\(step.WorkflowVersion \|\| 1\) <= requestedVersion/);
});

test('workflow event rule validator enforces requirement, source and ordering compatibility', () => {
  const validator = read('WorkflowStepEventRuleValidator.js');
  assert.match(validator, /RequirementMode/);
  assert.match(validator, /DataSource/);
  assert.match(validator, /SequenceMode/);
  assert.match(validator, /strictOrders/);
  assert.match(validator, /stepSequenceMode/);
  assert.match(validator, /displayOrders/);
  assert.match(validator, /DisplayOrder/);
  assert.match(validator, /ترتیب نمایش/);
});
test('project workflow lookups and assignment only use published workflow versions', () => {
  const projects = read('ProjectService.js');
  assert.ok(projects.includes("LifecycleState || 'PUBLISHED'"));
  assert.ok(projects.includes('PublishedVersion || item.Version'));
  assert.ok(projects.includes('Number(item.PublishedVersion || 0) > 0'));
  assert.ok(projects.includes('Number(workflow.PublishedVersion || 0) > 0'));
  assert.match(projects, /WorkflowVersion: workflowVersion/);
});


test('free display order is versioned, cloned and returned without changing strict execution order', () => {
  const repository = read('WorkflowStepEventRuleRepository.js');
  const service = read('WorkflowService.js');
  const events = read('EventService.js');
  assert.match(repository, /DisplayOrder/);
  assert.ok(repository.includes('DisplayOrder: item.DisplayOrder'));
  assert.ok(service.includes('Number(a.DisplayOrder || 0)'));
  assert.ok(events.includes('displayOrder: Number(rule.DisplayOrder || index + 1)'));
  assert.ok(events.includes('return Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0)'));
});


test('free display order is independent from event execution order and validates uniqueness', () => {
  const context = {
    Validator: { required() {}, id() {} },
    ErrorHandler: { create(code, message) { return new Error(message); } },
    Constants: { ERROR: { VALIDATION_ERROR: 'VALIDATION_ERROR' } }
  };
  vm.runInNewContext(read('WorkflowStepEventRuleValidator.js') +
    '\nthis.result = WorkflowStepEventRuleValidator;', context);
  const validate = context.result.validate;
  const rules = validate([
    { EventTypeID: 'EVT_A', SequenceMode: 'FREE', EventOrder: 0, DisplayOrder: 2 },
    { EventTypeID: 'EVT_B', SequenceMode: 'FREE', EventOrder: 0, DisplayOrder: 1 }
  ]);
  assert.equal(rules[0].DisplayOrder, 2);
  assert.equal(rules[1].DisplayOrder, 1);
  assert.equal(rules[0].EventOrder, 0);
  assert.throws(() => validate([
    { EventTypeID: 'EVT_A', SequenceMode: 'FREE', EventOrder: 0, DisplayOrder: 1 },
    { EventTypeID: 'EVT_B', SequenceMode: 'FREE', EventOrder: 0, DisplayOrder: 1 }
  ]), /شماره ترتیب نمایش رویداد تکراری است/);
  assert.throws(() => validate([
    { EventTypeID: 'EVT_A', SequenceMode: 'FREE', EventOrder: 0, DisplayOrder: 0 }
  ]), /ترتیب نمایش هر رویداد باید عدد صحیح مثبت باشد/);
});
