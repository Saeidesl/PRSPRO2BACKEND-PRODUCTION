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


/**
 * اعتبارسنجی انتقال تنظیمات Development به Production؛ فقط خواندنی.
 * هیچ مقدار محرمانه‌ای از جمله PasswordHash در گزارش ثبت نمی‌شود.
 */
function runProductionConfigurationMigrationPreflight() {
  const sourceId = '1X0RX1UEHnuf8RWkXCoYTyqiI9l3DxUUgzcN9rb-7bFM';
  const targetId = getConfiguredDatabaseSpreadsheetId_();
  const names = [
    '01_Tenants','02_Users','03_Departments','04_Roles','05_Permissions',
    '06_UserRoles','07_RolePermissions','09_Workflows','10_WorkflowSteps',
    '11_EventTypes','12_EventFields','17_WorkflowStepDepartments',
    '18_ProjectStatuses','23_EventTypeProcurementSettings',
    '28_InformationTypes','29_InformationTypeColumns','32_Forms',
    '33_FormFields','34_EventTypeForms','36_PrintTemplates','37_WorkflowStepEventRules'
  ];
  const src = SpreadsheetApp.openById(sourceId);
  const dst = SpreadsheetApp.openById(targetId);
  const report = {mode:'PREFLIGHT_READ_ONLY',sourceId:sourceId,targetId:targetId,blockingIssues:[],sheets:[],totalToInsert:0};
  const data = {};
  const read = function(ss,name) {
    const sh=ss.getSheetByName(name);
    if(!sh) throw new Error('شیت پیدا نشد: '+name);
    const values=sh.getDataRange().getValues();
    const headers=(values.shift()||[]).map(String);
    return {headers:headers,rows:values.filter(r=>r.some(v=>v!==''&&v!==null))};
  };
  names.forEach(function(name){
    const a=read(src,name), b=read(dst,name);
    if(a.headers.join('|')!==b.headers.join('|')) {
      report.blockingIssues.push({sheet:name,issue:'HEADER_MISMATCH'}); return;
    }
    const idIndex=a.headers.indexOf('ID');
    if(idIndex<0){report.blockingIssues.push({sheet:name,issue:'NO_ID_COLUMN'});return;}
    const srcMap={},dstMap={}; let duplicateSource=0,duplicateTarget=0;
    a.rows.forEach(r=>{const id=String(r[idIndex]||'').trim();if(!id)return;if(srcMap[id])duplicateSource++;else srcMap[id]=r;});
    b.rows.forEach(r=>{const id=String(r[idIndex]||'').trim();if(!id)return;if(dstMap[id])duplicateTarget++;else dstMap[id]=r;});
    if(duplicateSource||duplicateTarget) report.blockingIssues.push({sheet:name,issue:'DUPLICATE_IDS',source:duplicateSource,target:duplicateTarget});
    let add=0, same=0, conflict=0;
    Object.keys(srcMap).forEach(id=>{
      if(!dstMap[id]){add++;return;}
      const x=srcMap[id],y=dstMap[id];
      if(x.every((v,i)=>String(v)===String(y[i]))) same++;
      else conflict++;
    });
    if(conflict) report.blockingIssues.push({sheet:name,issue:'SAME_ID_DIFFERENT_DATA',count:conflict});
    report.sheets.push({sheet:name,source:a.rows.length,target:b.rows.length,toInsert:add,alreadyIdentical:same,conflicts:conflict});
    report.totalToInsert+=add;
    data[name]={headers:a.headers,sourceRows:a.rows,targetRows:b.rows};
  });
  // Tenant identity must be exactly the same; never remap automatically.
  const tenants=data['01_Tenants'];
  if(tenants && tenants.sourceRows.length===1 && tenants.targetRows.length===1) {
    const si=tenants.headers.indexOf('ID');
    if(String(tenants.sourceRows[0][si])!==String(tenants.targetRows[0][si]))
      report.blockingIssues.push({sheet:'01_Tenants',issue:'TENANT_ID_MISMATCH'});
  } else report.blockingIssues.push({sheet:'01_Tenants',issue:'TENANT_COUNT_NOT_ONE'});
  // Validate foreign keys for rows that would be inserted.
  const refs={
    '02_Users':{TenantID:'01_Tenants',DepartmentID:'03_Departments'},
    '03_Departments':{TenantID:'01_Tenants'},'04_Roles':{TenantID:'01_Tenants'},
    '06_UserRoles':{TenantID:'01_Tenants',UserID:'02_Users',RoleID:'04_Roles'},
    '07_RolePermissions':{TenantID:'01_Tenants',RoleID:'04_Roles',PermissionID:'05_Permissions'},
    '09_Workflows':{TenantID:'01_Tenants'},
    '10_WorkflowSteps':{TenantID:'01_Tenants',WorkflowID:'09_Workflows'},
    '11_EventTypes':{TenantID:'01_Tenants',DepartmentID:'03_Departments',WorkflowStepID:'10_WorkflowSteps'},
    '12_EventFields':{TenantID:'01_Tenants',EventTypeID:'11_EventTypes'},
    '17_WorkflowStepDepartments':{TenantID:'01_Tenants',WorkflowID:'09_Workflows',WorkflowStepID:'10_WorkflowSteps',DepartmentID:'03_Departments'},
    '18_ProjectStatuses':{TenantID:'01_Tenants'},
    '23_EventTypeProcurementSettings':{TenantID:'01_Tenants',EventTypeID:'11_EventTypes',ConfirmedQuantityInformationTypeID:'28_InformationTypes'},
    '28_InformationTypes':{TenantID:'01_Tenants'},
    '29_InformationTypeColumns':{TenantID:'01_Tenants',InformationTypeID:'28_InformationTypes'},
    '32_Forms':{TenantID:'01_Tenants'},
    '33_FormFields':{TenantID:'01_Tenants',FormID:'32_Forms',InformationTypeID:'28_InformationTypes'},
    '34_EventTypeForms':{TenantID:'01_Tenants',EventTypeID:'11_EventTypes',FormID:'32_Forms'},
    '36_PrintTemplates':{TenantID:'01_Tenants'},
    '37_WorkflowStepEventRules':{TenantID:'01_Tenants',WorkflowID:'09_Workflows',WorkflowStepID:'10_WorkflowSteps',EventTypeID:'11_EventTypes'}
  };
  Object.keys(refs).forEach(child=>{
    if(!data[child]) return;
    const sourceRows=data[child].sourceRows, headers=data[child].headers;
    const targetIds={};
    Object.keys(data).forEach(n=>{
      const idx=data[n].headers.indexOf('ID'); targetIds[n]={};
      data[n].sourceRows.concat(data[n].targetRows).forEach(r=>targetIds[n][String(r[idx])]=true);
    });
    const insertIds={};
    data[child].targetRows.forEach(r=>insertIds[String(r[headers.indexOf('ID')])]=true);
    sourceRows.forEach(r=>{
      const id=String(r[headers.indexOf('ID')]);
      if(insertIds[id]) return;
      Object.keys(refs[child]).forEach(col=>{
        const value=String(r[headers.indexOf(col)]||'').trim();
        if(value && !targetIds[refs[child][col]][value])
          report.blockingIssues.push({sheet:child,issue:'BROKEN_REFERENCE',column:col});
      });
    });
  });
  report.safeToExecute=report.blockingIssues.length===0;
  Logger.log(JSON.stringify(report,null,2));
  return report;
}

/**
 * انتقال کنترل‌شده؛ فقط پس از تأیید صریح کاربر اجرا شود.
 * ابتدا پیش‌بررسی، سپس نسخه پشتیبان کامل، سپس افزودن رکوردهای غایب.
 */
function executeProductionConfigurationMigration() {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const check=runProductionConfigurationMigrationPreflight();
    if(!check.safeToExecute) throw new Error('انتقال متوقف شد؛ ابتدا تعارض‌های گزارش پیش‌بررسی باید رفع شوند.');
    const targetId=getConfiguredDatabaseSpreadsheetId_();
    const backup=DriveApp.getFileById(targetId).makeCopy('PMS-PRODUCTION-BACKUP-BEFORE-CONFIG-MIGRATION-'+new Date().toISOString().replace(/[:.]/g,'-'));
    const source=SpreadsheetApp.openById('1X0RX1UEHnuf8RWkXCoYTyqiI9l3DxUUgzcN9rb-7bFM');
    const target=SpreadsheetApp.openById(targetId);
    const inserted=[];
    check.sheets.forEach(item=>{
      const name=item.sheet;
      const src=source.getSheetByName(name), dst=target.getSheetByName(name);
      const headers=src.getRange(1,1,1,src.getLastColumn()).getValues()[0];
      const srcRows=src.getLastRow()>1?src.getRange(2,1,src.getLastRow()-1,headers.length).getValues():[];
      const dstRows=dst.getLastRow()>1?dst.getRange(2,1,dst.getLastRow()-1,headers.length).getValues():[];
      const idIndex=headers.indexOf('ID'), existing={};
      dstRows.forEach(r=>existing[String(r[idIndex])]=true);
      const add=srcRows.filter(r=>r.some(v=>v!==''&&v!==null)&&!existing[String(r[idIndex])]);
      if(add.length) dst.getRange(dst.getLastRow()+1,1,add.length,headers.length).setValues(add);
      inserted.push({sheet:name,count:add.length});
    });
    SpreadsheetApp.flush();
    const result={success:true,backupUrl:backup.getUrl(),inserted:inserted,totalInserted:inserted.reduce((s,x)=>s+x.count,0),sourceModified:false};
    Logger.log(JSON.stringify(result,null,2)); return result;
  } finally { lock.releaseLock(); }
}
