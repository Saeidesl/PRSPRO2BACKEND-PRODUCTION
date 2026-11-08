'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const addonDir = path.join(__dirname, '..', 'google-sheets-addon');
const code = fs.readFileSync(path.join(addonDir, 'Code.gs'), 'utf8');
const sidebar = fs.readFileSync(path.join(addonDir, 'Sidebar.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(addonDir, 'appsscript.json'), 'utf8'));
const readme = fs.readFileSync(path.join(addonDir, 'README.md'), 'utf8');

test('Google Sheets add-on source is valid JavaScript and has a valid V8 manifest', () => {
  assert.doesNotThrow(() => new Function(code));
  assert.equal(manifest.runtimeVersion, 'V8');
  assert.ok(Array.isArray(manifest.oauthScopes));
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/script.external_request'));
});

test('Add-on authenticates through the existing PMS session API without persisting passwords', () => {
  assert.match(code, /pmsApiRequest_\('POST', '\/auth\/login'/);
  assert.match(code, /PropertiesService\.getUserProperties\(\)\.setProperty\('PMS_SESSION_TOKEN'/);
  assert.doesNotMatch(code, /setProperty\(['"]PMS_PASSWORD/);
  assert.match(code, /if \(token && method === 'GET'\) query \+= '&token='/);
  assert.match(code, /if \(token && method !== 'GET'\) body\.token = token/);
});

test('Project and project-information data are requested only through existing PMS API routes', () => {
  assert.match(code, /pmsApiRequest_\('GET', '\/projects'/);
  assert.match(code, /\/projects\/'.*\/information/);
  assert.doesNotMatch(code, /SpreadsheetApp\.openById\(.*DATABASE/);
});

test('Generation always creates a Drive copy and writes named ranges on the copy only', () => {
  assert.match(code, /sourceFile\.makeCopy\(copyName, folder\)/);
  assert.match(code, /SpreadsheetApp\.openById\(copyFile\.getId\(\)\)/);
  assert.match(code, /target\.getNamedRanges\(\)/);
  assert.match(code, /range\.setValue\(values\[name\]/);
  assert.match(code, /PMS_INFO_/);
});

test('Sidebar provides login, project selection, and copy generation actions', () => {
  assert.match(sidebar, /id="username"/);
  assert.match(sidebar, /id="password"/);
  assert.match(sidebar, /id="project"/);
  assert.match(sidebar, /pmsGenerateProjectCopy/);
  assert.match(readme, /PMS_PROJECT_TITLE/);
  assert.match(readme, /PMS_INFO_<InformationTypeID>/);
});
