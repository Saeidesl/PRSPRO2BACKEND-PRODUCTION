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


/**
 * انتقال تنظیمات Development به Production و همگام‌سازی ساختار شیت‌های عملیاتی.
 *
 * هشدارهای ایمنی:
 * - از شناسه ثابت فایل‌ها استفاده می‌شود، نه جست‌وجوی نام فایل.
 * - پیش از هر تغییری از فایل مقصد نسخه پشتیبان کامل گرفته می‌شود.
 * - شیت‌های تنظیمات از مبدا جایگزین می‌شوند.
 * - داده‌های عملیاتی Production پاک نمی‌شوند.
 * - اگر سرستون شیت عملیاتی با داده موجود متفاوت باشد، عملیات پیش از هر تغییری متوقف می‌شود.
 * - فایل مبدا فقط خوانده می‌شود و هرگز تغییر نمی‌کند.
 */
function migrateToProduction() {
  const SOURCE_ID = '1X0RX1UEHnuf8RWkXCoYTyqiI9l3DxUUgzcN9rb-7bFM';
  const TARGET_ID = '1UmMK-3Ltrlnfobjjb4PrQy8hYSJxaVqxFgAyr9mr0Z8';

  const configSheets = [
    '01_Tenants',
    '02_Users',
    '03_Departments',
    '04_Roles',
    '05_Permissions',
    '06_UserRoles',
    '07_RolePermissions',
    '09_Workflows',
    '10_WorkflowSteps',
    '11_EventTypes',
    '12_EventFields',
    '17_WorkflowStepDepartments',
    '18_ProjectStatuses',
    '23_EventTypeProcurementSettings',
    '28_InformationTypes',
    '29_InformationTypeColumns',
    '32_Forms',
    '33_FormFields',
    '34_EventTypeForms',
    '36_PrintTemplates',
    '37_WorkflowStepEventRules'
  ];

  // این شیت‌ها فقط از نظر ساختار بررسی می‌شوند؛ هیچ داده‌ای از آن‌ها کپی یا حذف نمی‌شود.
  const projectDataSheets = [
    '08_Projects',
    '13_Events',
    '14_EventData',
    '15_Attachments',
    '16_AuditLogs',
    '18_MaterialNeeds',
    '19_PurchaseOrders',
    '20_PurchaseOrderItems',
    '21_PurchaseAllocations',
    '22_MaterialReceipts',
    '24_ProjectMaterialSpecs',
    '25_MaterialNeedCalculations',
    '30_ProjectInformation',
    '31_ProjectInformationHistory',
    '35_EventFormData',
    '38_ProjectReferenceSyncLog',
    'PMS_PerformanceDiagnostics'
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sourceSS = SpreadsheetApp.openById(SOURCE_ID);
    const targetSS = SpreadsheetApp.openById(TARGET_ID);

    if (sourceSS.getId() === targetSS.getId()) {
      throw new Error('شناسه فایل مبدا و مقصد یکسان است؛ عملیات متوقف شد.');
    }

    // آماده‌سازی و اعتبارسنجی کامل قبل از اولین تغییر
    const preparedConfig = configSheets.map(function(name) {
      const sourceSheet = sourceSS.getSheetByName(name);
      if (!sourceSheet) throw new Error('شیت تنظیمات در مبدا پیدا نشد: ' + name);

      const values = sourceSheet.getDataRange().getValues();
      if (!values.length || !values[0].length) {
        throw new Error('سرستون شیت تنظیمات خالی است: ' + name);
      }
      return { name: name, values: values };
    });

    const preparedStructure = projectDataSheets.map(function(name) {
      const sourceSheet = sourceSS.getSheetByName(name);
      if (!sourceSheet) return { name: name, existsInSource: false };

      const lastCol = sourceSheet.getLastColumn();
      if (!lastCol) return { name: name, existsInSource: true, headers: [] };

      const headers = sourceSheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const targetSheet = targetSS.getSheetByName(name);
      if (targetSheet && targetSheet.getLastRow() > 1) {
        const targetLastCol = targetSheet.getLastColumn();
        const targetHeaders = targetLastCol
          ? targetSheet.getRange(1, 1, 1, targetLastCol).getValues()[0]
          : [];
        if (JSON.stringify(headers) !== JSON.stringify(targetHeaders)) {
          throw new Error(
            'سرستون شیت عملیاتی ' + name +
            ' با مقصد متفاوت است و داده عملیاتی دارد؛ برای جلوگیری از جابه‌جایی ستون‌ها عملیات متوقف شد.'
          );
        }
      }
      return { name: name, existsInSource: true, headers: headers };
    });

    // نسخه پشتیبان کامل از فایل مقصد، قبل از هرگونه تغییر
    const backupName = 'PMS-PRODUCTION-BACKUP-BEFORE-MIGRATION-' +
      new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = DriveApp.getFileById(TARGET_ID).makeCopy(backupName);

    const configResults = [];
    preparedConfig.forEach(function(item) {
      let targetSheet = targetSS.getSheetByName(item.name);
      if (!targetSheet) targetSheet = targetSS.insertSheet(item.name);

      targetSheet.clearContents();
      const values = item.values;
      if (values.length && values[0].length) {
        targetSheet.getRange(1, 1, values.length, values[0].length).setValues(values);
      }
      configResults.push({ sheet: item.name, rowsCopied: Math.max(0, values.length - 1) });
    });

    const structureResults = [];
    preparedStructure.forEach(function(item) {
      if (!item.existsInSource) {
        structureResults.push({ sheet: item.name, status: 'NOT_IN_SOURCE' });
        return;
      }

      let targetSheet = targetSS.getSheetByName(item.name);
      if (!targetSheet) targetSheet = targetSS.insertSheet(item.name);

      if (item.headers.length) {
        // فقط سرستون نوشته می‌شود؛ محتوای ردیف‌های عملیاتی دست‌نخورده می‌ماند.
        targetSheet.getRange(1, 1, 1, item.headers.length).setValues([item.headers]);
      }
      structureResults.push({ sheet: item.name, status: 'HEADERS_SYNCED_DATA_PRESERVED' });
    });

    const sheet1 = targetSS.getSheetByName('Sheet1');
    if (sheet1 && targetSS.getSheets().length > 1 && sheet1.getLastRow() <= 1 &&
        sheet1.getLastColumn() <= 1 && !sheet1.getRange(1, 1).getValue()) {
      targetSS.deleteSheet(sheet1);
    }

    SpreadsheetApp.flush();

    const result = {
      success: true,
      sourceSpreadsheetId: SOURCE_ID,
      targetSpreadsheetId: TARGET_ID,
      backupUrl: backupFile.getUrl(),
      configurationSheets: configResults,
      operationalSheets: structureResults,
      totalConfigurationRowsCopied: configResults.reduce(function(sum, item) {
        return sum + item.rowsCopied;
      }, 0),
      sourceModified: false,
      operationalDataDeleted: false
    };

    Logger.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}
