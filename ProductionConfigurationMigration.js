/**
 * ابزار مستقل پیش‌نمایش انتقال تنظیمات به Production
 * فقط خواندنی است و هیچ داده‌ای را تغییر نمی‌دهد.
 */
function runProductionConfigurationMigrationPreview() {
  const sourceId = '1X0RX1UEHnuf8RWkXCoYTyqiI9l3DxUUgzcN9rb-7bFM';
  const targetId = getConfiguredDatabaseSpreadsheetId_();
  const names = [
    '01_Tenants','02_Users','03_Departments','04_Roles','05_Permissions',
    '06_UserRoles','07_RolePermissions','09_Workflows','10_WorkflowSteps',
    '11_EventTypes','12_EventFields','17_WorkflowStepDepartments',
    '18_ProjectStatuses','23_EventTypeProcurementSettings',
    '28_InformationTypes','29_InformationTypeColumns','32_Forms',
    '33_FormFields','34_EventTypeForms','36_PrintTemplates',
    '37_WorkflowStepEventRules'
  ];

  const source = SpreadsheetApp.openById(sourceId);
  const target = SpreadsheetApp.openById(targetId);
  const report = {
    mode: 'READ_ONLY_PREVIEW',
    sourceName: source.getName(),
    targetName: target.getName(),
    sourceId: sourceId,
    targetId: targetId,
    sheets: [],
    missingSourceSheets: [],
    missingTargetSheets: [],
    totalSourceRows: 0,
    totalTargetRows: 0
  };

  names.forEach(function(name) {
    const src = source.getSheetByName(name);
    const dst = target.getSheetByName(name);
    if (!src) { report.missingSourceSheets.push(name); return; }
    if (!dst) { report.missingTargetSheets.push(name); return; }

    const srcLastRow = src.getLastRow();
    const dstLastRow = dst.getLastRow();
    const srcLastCol = src.getLastColumn();
    const dstLastCol = dst.getLastColumn();
    const srcHeaders = srcLastCol ? src.getRange(1, 1, 1, srcLastCol).getDisplayValues()[0] : [];
    const dstHeaders = dstLastCol ? dst.getRange(1, 1, 1, dstLastCol).getDisplayValues()[0] : [];
    const row = {
      sheet: name,
      sourceRows: Math.max(0, srcLastRow - 1),
      targetRows: Math.max(0, dstLastRow - 1),
      sourceColumns: srcHeaders.filter(String).length,
      targetColumns: dstHeaders.filter(String).length,
      missingHeadersInTarget: srcHeaders.filter(function(h) { return h && dstHeaders.indexOf(h) < 0; })
    };
    report.sheets.push(row);
    report.totalSourceRows += row.sourceRows;
    report.totalTargetRows += row.targetRows;
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
