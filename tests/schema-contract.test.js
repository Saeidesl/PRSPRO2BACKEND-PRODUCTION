'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'DatabaseSetup.js'), 'utf8');

test('database schema declares versioned project material specifications', () => {
  assert.ok(source.includes("name: '24_ProjectMaterialSpecs'"));
  assert.ok(source.includes('ConsumptionPerUnit'));
  assert.ok(source.includes('WastagePercent'));
  assert.ok(source.includes('EarlyOrderPolicy'));
  assert.ok(source.includes('SpecificationRevision') || source.includes('Revision'));
});

test('database schema declares durable material calculation history', () => {
  assert.ok(source.includes("name: '25_MaterialNeedCalculations'"));
  assert.ok(source.includes('CalculationKey'));
  assert.ok(source.includes('CalculatedQuantity'));
  assert.ok(source.includes('PreviousCalculatedQuantity'));
  assert.ok(source.includes('VarianceQuantity'));
});

test('schema setup appends missing headers and does not delete or reorder existing data', () => {
  assert.ok(source.toLowerCase().includes('append only missing required headers'));
  assert.ok(source.includes('Never reorder, overwrite, or delete user data'));
  assert.ok(source.includes('missing = headers.filter'));
});

test('production Apps Script sync is manually triggered and guarded', () => {
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'sync-apps-script.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const triggerBlock = workflow.split('on:')[1] || '';

  assert.ok(triggerBlock.trimStart().startsWith('workflow_dispatch:'));
  assert.ok(workflow.includes('ref: main'));
  assert.ok(workflow.includes('confirm_production_action:'));
  assert.ok(workflow.includes('type: boolean'));
  assert.ok(workflow.includes('default: false'));
  assert.ok(workflow.includes('inputs.confirm_production_action == true'));
  assert.ok(workflow.includes("inputs.phase == 'push_and_deploy' && vars.ALLOW_APPS_SCRIPT_DEPLOY == 'true'"));
  assert.ok(workflow.includes('clasp push --force'));
  assert.ok(workflow.includes('clasp deploy --deploymentId "$DEPLOYMENT_ID"'));
  assert.ok(workflow.includes('Refusing deployment: configured deployment ID belongs to an existing environment.'));
  assert.equal(triggerBlock.includes('push:'), false);
});

test('event creation persists an idempotency key and serializes duplicate submissions', () => {
  const eventService = fs.readFileSync(path.join(__dirname, '..', 'EventService.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'DatabaseSetup.js'), 'utf8');

  assert.ok(schema.includes("name: '13_Events'"));
  assert.ok(schema.includes('IdempotencyKey'));
  assert.ok(schema.includes('IdempotencyStatus'));
  assert.ok(eventService.includes('create: function(event, params)'));
  assert.ok(eventService.includes('getUserLock()'));
  assert.ok(eventService.includes('String(item.IdempotencyKey || \'\') === key'));
  assert.ok(eventService.includes('idempotentReplay: true'));
  assert.ok(eventService.includes("IdempotencyStatus: 'COMPLETED'"));
  assert.ok(eventService.includes('lock.releaseLock()'));
});
