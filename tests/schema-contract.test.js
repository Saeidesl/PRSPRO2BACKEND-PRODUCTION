'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'DatabaseSetup.js'), 'utf8');

test('database schema declares versioned project material specifications', () => {
  assert.match(source, /name: '24_ProjectMaterialSpecs'/);
  assert.match(source, /ConsumptionPerUnit/);
  assert.match(source, /WastagePercent/);
  assert.match(source, /EarlyOrderPolicy/);
  assert.match(source, /SpecificationRevision|Revision/);
});

test('database schema declares durable material calculation history', () => {
  assert.match(source, /name: '25_MaterialNeedCalculations'/);
  assert.match(source, /CalculationKey/);
  assert.match(source, /CalculatedQuantity/);
  assert.match(source, /PreviousCalculatedQuantity/);
  assert.match(source, /VarianceQuantity/);
});

test('schema setup appends missing headers and does not delete or reorder existing data', () => {
  assert.match(source, /append only missing required headers/i);
  assert.match(source, /Never reorder, overwrite, or delete user data/i);
  assert.match(source, /missing = headers\\.filter/);
});

test('production Apps Script sync is manually triggered and guarded', () => {
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'sync-apps-script.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /confirm_production_action:[\\s\\S]*?type: boolean[\\s\\S]*?default: false/);
  assert.ok(workflow.includes("inputs.confirm_production_action == true"));
  assert.ok(workflow.includes("inputs.phase == 'push_and_deploy' && vars.ALLOW_APPS_SCRIPT_DEPLOY == 'true'"));
  assert.ok(workflow.includes('clasp push --force'));
  assert.ok(workflow.includes('clasp deploy --deploymentId "$DEPLOYMENT_ID"'));
  assert.ok(workflow.includes('Refusing deployment: configured deployment ID belongs to an existing environment.'));
  assert.doesNotMatch(workflow, /on:\\s*\\n\\s*push:/);
});

test('event creation persists an idempotency key and serializes duplicate submissions', () => {
  const eventService = fs.readFileSync(path.join(__dirname, '..', 'EventService.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'DatabaseSetup.js'), 'utf8');

  assert.match(schema, /name: '13_Events',[\\s\\S]*?IdempotencyKey[\\s\\S]*?IdempotencyStatus/);
  assert.match(eventService, /create: function\\(event, params\\)\\s*\\{[\\s\\S]*?getUserLock\\(\\)/);
  assert.match(eventService, /String\\(item\\.IdempotencyKey \\|\\| ''\\) === key/);
  assert.match(eventService, /return this\\._createUnlocked_\\(Object\\.assign\\(\\{\\}, event, \\{ IdempotencyKey: key \\}\\), requestParams\\)/);
  assert.match(eventService, /finally\\s*\\{\\s*lock\\.releaseLock\\(\\)/);
  assert.match(eventService, /idempotentReplay: true/);
  assert.match(eventService, /IdempotencyStatus: String\\(event\\.IdempotencyKey \\|\\| ''\\)\\.trim\\(\\) \\? 'PROCESSING' : ''/);
  assert.match(eventService, /IdempotencyStatus \\|\\| ''\\)\\.toUpperCase\\(\\) === 'PROCESSING'/);
  assert.match(eventService, /IdempotencyStatus: 'COMPLETED'/);
  assert.match(eventService, /finalEvent\\.IdempotencyStatus \\|\\| ''\\)\\.toUpperCase\\(\\) !== 'COMPLETED'/);
});
