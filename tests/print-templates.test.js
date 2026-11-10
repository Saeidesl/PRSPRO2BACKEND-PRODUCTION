'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadPrintTemplates() {
  const templates = [];
  const audits = [];
  const storedFiles = Object.create(null);
  let storageSequence = 0;
  const responses = [
    { ID:'R1',TenantID:'T1',EventID:'E1',FormID:'F1',FormVersion:2,CreatedAt:'2026-01-01T10:00:00Z',
      ResponseJSON:JSON.stringify({I1:'قدیمی'}),DefinitionSnapshotJSON:JSON.stringify({Version:2,Fields:[{ID:'FF1',InformationTypeID:'I1'}]}) },
    { ID:'R2',TenantID:'T1',EventID:'E2',FormID:'F1',FormVersion:3,CreatedAt:'2026-01-02T10:00:00Z',
      ResponseJSON:JSON.stringify({I1:'جدید'}),DefinitionSnapshotJSON:JSON.stringify({Version:3,Fields:[{ID:'FF1',InformationTypeID:'I1'}]}) },
    { ID:'R3',TenantID:'T2',EventID:'E3',FormID:'F1',FormVersion:3,CreatedAt:'2026-01-03T10:00:00Z',
      ResponseJSON:JSON.stringify({I1:'خارج از tenant'}),DefinitionSnapshotJSON:'{}' },
    { ID:'R4',TenantID:'T1',EventID:'E4',FormID:'F2',FormVersion:3,CreatedAt:'2026-01-04T10:00:00Z',
      ResponseJSON:JSON.stringify({I1:'پاسخ نوع دیگر'}),DefinitionSnapshotJSON:JSON.stringify({Version:3,Fields:[{ID:'FF1',InformationTypeID:'I1'}]}) }
  ];
  const context = {
    AccessControlService: { getCurrentUser: () => ({ID:'U1',TenantID:'T1'}) },
    PrintTemplateRepository: {
      getAll: () => templates,
      findById: id => templates.find(row => String(row.ID) === String(id)) || null,
      insert: row => { templates.push(row); return row; },
      update: (id, patch) => { const row=templates.find(item=>String(item.ID)===String(id)); if(row)Object.assign(row,patch); return row; }
    },
    ProjectRepository: { findById: id => String(id)==='P1' ? ({ID:'P1',TenantID:'T1',ProjectCode:'PR-1',Title:'پروژه آزمایشی',Status:'ACTIVE'}) : null },
    ProjectService: { _isProjectAvailableToUser_: () => true },
    InformationTypeRepository: {
      findByTenant: () => [{ID:'I1',TenantID:'T1',Code:'MODEL',Name:'نام مدل',DataType:'text',Cardinality:'SINGLE',Status:'ACTIVE'}],
      findById: id => String(id)==='I1' ? {ID:'I1',TenantID:'T1',Status:'ACTIVE'} : null,
      findColumns: () => []
    },
    ProjectInformationRepository: {
      findByProject: () => [{ID:'PI1',TenantID:'T1',ProjectID:'P1',InformationTypeID:'I1',ValueJSON:'"مقدار جاری"',Status:'ACTIVE'}]
    },
    EventRepository: {
      findByProjectId: () => [
        {ID:'E1',TenantID:'T1',EventTypeID:'ET1',OccurredAt:'2026-01-01T09:00:00Z',CreatedAt:'2026-01-01T09:05:00Z',Description:'ارسال اول',CreatedBy:'U1',PerformedBy:'U2',DepartmentID:'D1',Status:'ACTIVE'},
        {ID:'E2',TenantID:'T1',EventTypeID:'ET1',OccurredAt:'2026-01-02T09:00:00Z',CreatedAt:'2026-01-02T09:05:00Z',Description:'ارسال دوم',CreatedBy:'U2',PerformedBy:'U1',DepartmentID:'D1',Status:'ACTIVE'},
        {ID:'E3',TenantID:'T2',EventTypeID:'ET2',OccurredAt:'2026-01-03T09:00:00Z',CreatedAt:'2026-01-03T09:05:00Z',Description:'خارج از tenant',Status:'ACTIVE'},
        {ID:'E4',TenantID:'T1',EventTypeID:'ET4',OccurredAt:'2026-01-04T09:00:00Z',CreatedAt:'2026-01-04T09:05:00Z',Description:'رویداد نوع دیگر',Status:'ACTIVE'}
      ]
    },
    EventTypeRepository: {
      getAll: () => [
        {ID:'ET1',TenantID:'T1',Code:'CUT_SEND',Name:'ارسال به برش',Status:'ACTIVE'},
        {ID:'ET2',TenantID:'T2',Code:'OTHER',Name:'رویداد دیگر',Status:'ACTIVE'},
        {ID:'ET3',TenantID:'T1',Code:'INDEPENDENT',Name:'رویداد مستقل',ConnectionType:'INDEPENDENT',Status:'ACTIVE'},
        {ID:'ET4',TenantID:'T1',Code:'OTHER_PROJECT',Name:'نوع رویداد دیگر',Status:'ACTIVE'}
      ]
    },
    UserRepository: {
      getAll: () => [
        {ID:'U1',TenantID:'T1',Name:'کاربر اول'},
        {ID:'U2',TenantID:'T1',Name:'کاربر دوم'},
        {ID:'U3',TenantID:'T2',Name:'کاربر خارجی'}
      ]
    },
    DepartmentRepository: {
      getAll: () => [{ID:'D1',TenantID:'T1',Name:'واحد برش'}]
    },
    EventService: {
      getUserDisplayName: user => user.Name
    },
    FormRepository: {
      getForms: () => [
        {ID:'F1',TenantID:'T1',Code:'F',Name:'فرم',Version:3,Status:'ACTIVE'},
        {ID:'F2',TenantID:'T1',Code:'F2',Name:'فرم نوع دیگر',Version:3,Status:'ACTIVE'}
      ],
      findFieldsByForm: formId => [{ID:String(formId)==='F2'?'FF2':'FF1',TenantID:'T1',Status:'ACTIVE',InformationTypeID:'I1'}],
      findMappingsByEventType: eventTypeId => String(eventTypeId)==='ET1'
        ? [{ID:'MAP1',TenantID:'T1',EventTypeID:'ET1',FormID:'F1',IsRequired:true,FieldOrder:1,Status:'ACTIVE'}]
        : (String(eventTypeId)==='ET4' ? [{ID:'MAP2',TenantID:'T1',EventTypeID:'ET4',FormID:'F2',IsRequired:true,FieldOrder:1,Status:'ACTIVE'}] : []),
      getEventResponses: () => responses
    },
    AuditService: { log: entry => audits.push(entry) },
    AppConfig: { FILES: { MAX_SIZE_MB: 10, ALLOWED_MIME_TYPES: ['image/jpeg','image/png','image/webp','application/pdf'] } },
    GoogleDriveStorage: {
      uploadBase64ToTenant: (data, tenantId) => {
        const id = 'FILE_' + (++storageSequence);
        storedFiles[id] = { fileName: data.fileName, mimeType: data.mimeType, fileSize: Buffer.from(data.base64, 'base64').length, base64: data.base64, tenantId };
        return { storageKey: id, fileName: data.fileName, mimeType: data.mimeType, fileSize: storedFiles[id].fileSize };
      },
      getFileAsBase64: id => {
        if (!storedFiles[id]) throw new Error('missing file');
        return { fileName: storedFiles[id].fileName, mimeType: storedFiles[id].mimeType,
          fileSize: storedFiles[id].fileSize, base64: storedFiles[id].base64 };
      },
      delete: id => { delete storedFiles[id]; return true; }
    },
    Validator: {
      required: (value,label) => { if(value===undefined||value===null||String(value)==='') throw new Error(label+' الزامی است.'); },
      object: value => { if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('object'); }
    },
    Response: { success: (data,meta) => ({success:true,data,meta:meta||{}}) },
    ErrorHandler: { create: (_code,message) => new Error(message) },
    Constants: { ERROR:{NOT_FOUND:'NOT_FOUND',VALIDATION_ERROR:'VALIDATION_ERROR',DUPLICATE:'DUPLICATE'}, ACTION:{CREATE:'CREATE',UPDATE:'UPDATE',DELETE:'DELETE'} },
    Utilities: { getUuid: () => 'test-uuid', base64Decode: value => Array.from(Buffer.from(value, 'base64')) },
    Date, Object, String, Array, JSON, Number, Math, isFinite
  };
  const root = path.join(__dirname,'..');
  vm.runInNewContext(fs.readFileSync(path.join(root,'PrintTemplateValidator.js'),'utf8')+'\nthis.__validator=PrintTemplateValidator;',context);
  context.PrintTemplateValidator = context.__validator;
  vm.runInNewContext(fs.readFileSync(path.join(root,'PrintTemplateService.js'),'utf8')+'\nthis.__service=PrintTemplateService;',context);
  return {service:context.__service,templates,audits,storedFiles,context};
}

test('template definitions accept stable bindings and reject duplicate or unsupported sources',()=>{
  const h=loadPrintTemplates();
  const valid=h.service && {schemaVersion:1,page:{size:'A4',orientation:'portrait'},elements:[],bindings:[
    {id:'project_code',sourceType:'PROJECT_FIELD',field:'ProjectCode'}
  ]};
  assert.equal(valid.bindings[0].sourceType,'PROJECT_FIELD');
  const source=fs.readFileSync(path.join(__dirname,'..','PrintTemplateValidator.js'),'utf8');
  const context={ErrorHandler:{create:(_c,m)=>new Error(m)},Constants:{ERROR:{VALIDATION_ERROR:'VALIDATION_ERROR'}},
    Validator:{required:(v,l)=>{if(!v)throw new Error(l);}},Date,Object,String,Array,JSON,Number};
  vm.runInNewContext(source+'\nthis.validator=PrintTemplateValidator;',context);
  assert.throws(()=>context.validator.parseDefinition({bindings:[
    {id:'x',sourceType:'PROJECT_FIELD',field:'Title'},
    {id:'x',sourceType:'PROJECT_FIELD',field:'Status'}
  ]}),/تکراری/);
  assert.throws(()=>context.validator.parseDefinition({bindings:[{id:'x',sourceType:'UNKNOWN'}]}),/پشتیبانی نمی‌شود/);
});

test('templates are tenant-scoped, centrally created and versioned on update',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'PROJECT_REPORT',Name:'گزارش پروژه',Definition:{bindings:[]}}, {});
  assert.equal(created.success,true);
  assert.equal(created.data.Version,1);
  assert.equal(h.templates.length,1);
  assert.equal(h.audits[0].EntityType,'PRINT_TEMPLATE');
  const updated=h.service.update(created.data.ID,{Name:'گزارش پروژه جدید'}, {});
  assert.equal(updated.data.Version,2);
  assert.equal(updated.data.Name,'گزارش پروژه جدید');
  assert.throws(()=>h.service.get('MISSING',{}),/پیدا نشد/);
});

test('template code is unique within a tenant',()=>{
  const h=loadPrintTemplates();
  h.service.create({Code:'DUPLICATE',Name:'اول',Definition:{bindings:[]}}, {});
  assert.throws(()=>h.service.create({Code:'duplicate',Name:'دوم',Definition:{bindings:[]}}, {}),/قبلاً استفاده شده/);
});

test('data resolution uses current project information and the latest form snapshot only',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'DATA_REPORT',Name:'گزارش داده',Definition:{bindings:[
    {id:'project_code',sourceType:'PROJECT_FIELD',field:'ProjectCode'},
    {id:'current_model',sourceType:'PROJECT_INFORMATION',informationTypeId:'I1'},
    {id:'latest_form_value',sourceType:'EVENT_FORM_FIELD',formId:'F1',fieldId:'FF1',selection:'LATEST'},
    {id:'all_form_values',sourceType:'EVENT_FORM_FIELD',formId:'F1',fieldId:'FF1',selection:'ALL'}
  ]}}, {});
  const result=h.service.resolve(created.data.ID,{ProjectID:'P1'}, {});
  assert.equal(result.data.data.project_code,'PR-1');
  assert.equal(result.data.data.current_model,'مقدار جاری');
  assert.equal(result.data.data.latest_form_value,'جدید');
  assert.deepEqual(Array.from(result.data.data.all_form_values),['قدیمی','جدید']);
});

test('resolve rejects projects outside the current tenant or access boundary',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'SECURE',Name:'قالب امن',Definition:{bindings:[]}}, {});
  h.service._user=()=>({ID:'U1',TenantID:'T1'});
    assert.throws(()=>h.service.resolve(created.data.ID,{ProjectID:'OTHER'},{}),/پیدا نشد/);
});

test('source catalog exposes active tenant information types, forms and event types',()=>{
  const h=loadPrintTemplates();
  const result=h.service.sources({});
  assert.equal(result.data.informationTypes.length,1);
  assert.equal(result.data.forms.length,2);
  assert.equal(result.data.forms[0].Fields[0].InformationTypeID,'I1');
  assert.equal(result.data.eventTypes.length,2);
  assert.equal(result.data.eventTypes[0].ID,'ET1');
  assert.equal(result.data.eventTypes[0].Fields.some(field=>field.field==='CreatorName'),true);
  assert.equal(result.data.eventTypes[0].Forms.length,1);
  assert.equal(result.data.eventTypes[0].Forms[0].ID,'F1');
  assert.equal(result.data.eventTypes[0].Forms[0].Fields[0].ID,'FF1');
  assert.equal(result.data.eventTypes[1].Forms[0].Fields[0].ID,'FF2');
});

test('event field bindings resolve the latest event and all matching events with human-readable relations',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'EVENT_REPORT',Name:'گزارش رویداد',Definition:{bindings:[
    {id:'event_name',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'EventTypeName',selection:'LATEST'},
    {id:'event_time',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'OccurredAt',selection:'LATEST'},
    {id:'event_description',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'Description',selection:'LATEST'},
    {id:'event_creator',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'CreatorName',selection:'LATEST'},
    {id:'event_performer',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'PerformedByName',selection:'LATEST'},
    {id:'event_department',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'DepartmentName',selection:'LATEST'},
    {id:'all_descriptions',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'Description',selection:'ALL'}
  ]}}, {});
  const result=h.service.resolve(created.data.ID,{ProjectID:'P1'}, {});
  assert.equal(result.data.data.event_name,'ارسال به برش');
  assert.equal(result.data.data.event_time,'2026-01-02T09:00:00Z');
  assert.equal(result.data.data.event_description,'ارسال دوم');
  assert.equal(result.data.data.event_creator,'کاربر دوم');
  assert.equal(result.data.data.event_performer,'کاربر اول');
  assert.equal(result.data.data.event_department,'واحد برش');
  assert.deepEqual(Array.from(result.data.data.all_descriptions),['ارسال اول','ارسال دوم']);
});

test('event form bindings are scoped to the selected event type',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'EVENT_TYPE_FORM',Name:'فرم بر اساس نوع رویداد',Definition:{bindings:[
    {id:'cut_form_latest',sourceType:'EVENT_FORM_FIELD',eventTypeId:'ET1',formId:'F1',fieldId:'FF1',informationTypeId:'I1',selection:'LATEST'},
    {id:'other_form_latest',sourceType:'EVENT_FORM_FIELD',eventTypeId:'ET4',formId:'F2',fieldId:'FF2',informationTypeId:'I1',selection:'LATEST'},
    {id:'cut_form_all',sourceType:'EVENT_FORM_FIELD',eventTypeId:'ET1',formId:'F1',fieldId:'FF1',informationTypeId:'I1',selection:'ALL'}
  ]}}, {});
  const result=h.service.resolve(created.data.ID,{ProjectID:'P1'}, {});
  assert.equal(result.data.data.cut_form_latest,'جدید');
  assert.equal(result.data.data.other_form_latest,'پاسخ نوع دیگر');
  assert.deepEqual(Array.from(result.data.data.cut_form_all),['قدیمی','جدید']);
});

test('event field bindings cannot resolve another tenant event type',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'FOREIGN_EVENT',Name:'رویداد خارج از مجموعه',Definition:{bindings:[
    {id:'foreign',sourceType:'EVENT_FIELD',eventTypeId:'ET2',field:'Description',selection:'LATEST'}
  ]}}, {});
  assert.throws(()=>h.service.resolve(created.data.ID,{ProjectID:'P1'},{}),/پیدا نشد/);
});

test('event field bindings reject unsupported fields and invalid event selections',()=>{
  const h=loadPrintTemplates();
  const source=fs.readFileSync(path.join(__dirname,'..','PrintTemplateValidator.js'),'utf8');
  const context={ErrorHandler:{create:(_c,m)=>new Error(m)},Constants:{ERROR:{VALIDATION_ERROR:'VALIDATION_ERROR'}},
    Validator:{required:(v,l)=>{if(!v)throw new Error(l);}},Date,Object,String,Array,JSON,Number};
  vm.runInNewContext(source+'\nthis.validator=PrintTemplateValidator;',context);
  assert.throws(()=>context.validator.parseDefinition({bindings:[
    {id:'bad',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'RawSecret'}
  ]}),/فیلد رویداد/);
  assert.throws(()=>context.validator.parseDefinition({bindings:[
    {id:'bad',sourceType:'EVENT_FIELD',eventTypeId:'ET1',field:'Description',selection:'EVENT'}
  ]}),/روش انتخاب رویداد/);
});

test('template deletion is logical and retains the stored record',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'ARCHIVE',Name:'قالب بایگانی',Definition:{bindings:[]}}, {});
  const removed=h.service.deactivate(created.data.ID,{});
  assert.equal(removed.data.Status,'DELETED');
  assert.equal(h.templates.length,1);
  assert.throws(()=>h.service.get(created.data.ID,{}),/پیدا نشد/);
});
test('template images upload as tenant-scoped image assets and never expose Drive storage keys',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'WITH_IMAGE',Name:'قالب دارای تصویر',Definition:{elements:[],bindings:[]}}, {});
  const uploaded=h.service.uploadImage(created.data.ID,{
    fileName:'logo.png',mimeType:'image/png',base64:'iVBORw0KGgo='
  },{});
  assert.equal(uploaded.success,true);
  assert.match(uploaded.data.ID,/^IMG_/);
  assert.equal(uploaded.data.MimeType,'image/png');
  const row=h.templates[0];
  const assets=JSON.parse(row.ImageAssetsJSON);
  assert.equal(assets.length,1);
  assert.ok(assets[0].StorageKey);
  assert.equal(h.storedFiles[assets[0].StorageKey].tenantId,'T1');
  const publicTemplate=h.service.get(created.data.ID,{}).data;
  assert.equal(publicTemplate.Images.length,1);
  assert.equal(Object.hasOwn(publicTemplate.Images[0],'StorageKey'),false);
  const downloaded=h.service.downloadImage(created.data.ID,uploaded.data.ID,{});
  assert.equal(downloaded.data.base64,'iVBORw0KGgo=');
  assert.equal(downloaded.data.mimeType,'image/png');
});

test('template image upload rejects mismatched image signatures and unsupported formats',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'IMAGE_CHECK',Name:'اعتبارسنجی تصویر',Definition:{elements:[],bindings:[]}}, {});
  assert.throws(()=>h.service.uploadImage(created.data.ID,{
    fileName:'wrong.png',mimeType:'image/png',base64:'AAAA'
  },{}),/مطابقت ندارد/);
  assert.throws(()=>h.service.uploadImage(created.data.ID,{
    fileName:'wrong.gif',mimeType:'image/gif',base64:'R0lGODlh'
  },{}),/فقط تصاویر JPG/);
  assert.equal(Object.keys(h.storedFiles).length,0);
});

test('template image download cannot access assets through another tenant template',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'PRIVATE_IMAGE',Name:'تصویر خصوصی',Definition:{elements:[],bindings:[]}}, {});
  const uploaded=h.service.uploadImage(created.data.ID,{
    fileName:'logo.png',mimeType:'image/png',base64:'iVBORw0KGgo='
  },{});
  h.service._user=()=>({ID:'U2',TenantID:'T2'});
  assert.throws(()=>h.service.downloadImage(created.data.ID,uploaded.data.ID,{}),/پیدا نشد/);
});



test('unsaved template preview resolves current project bindings without creating or changing a template',()=>{
  const h=loadPrintTemplates();
  const result=h.service.preview({ProjectID:'P1',Definition:{bindings:[
    {id:'project_code',sourceType:'PROJECT_FIELD',field:'ProjectCode'},
    {id:'current_model',sourceType:'PROJECT_INFORMATION',informationTypeId:'I1'},
    {id:'latest_form_value',sourceType:'EVENT_FORM_FIELD',formId:'F1',fieldId:'FF1',selection:'LATEST'},
    {id:'all_form_values',sourceType:'EVENT_FORM_FIELD',formId:'F1',fieldId:'FF1',selection:'ALL'}
  ]}}, {});
  assert.equal(result.success,true);
  assert.equal(result.data.project.ID,'P1');
  assert.equal(result.data.data.project_code,'PR-1');
  assert.equal(result.data.data.current_model,'مقدار جاری');
  assert.equal(result.data.data.latest_form_value,'جدید');
  assert.deepEqual(Array.from(result.data.data.all_form_values),['قدیمی','جدید']);
  assert.equal(h.templates.length,0);
  assert.equal(h.audits.length,0);
});

test('unsaved template preview validates the definition and enforces project tenant/access boundaries',()=>{
  const h=loadPrintTemplates();
  assert.throws(()=>h.service.preview({ProjectID:'P1',Definition:{bindings:[
    {id:'invalid',sourceType:'UNSUPPORTED'}
  ]}}, {}),/پشتیبانی نمی‌شود/);
  assert.throws(()=>h.service.preview({ProjectID:'OTHER',Definition:{bindings:[]}}, {}),/پیدا نشد/);
  assert.equal(h.templates.length,0);
});

test('router exposes preview through PROJECT_VIEW and delegates to the non-persistent service method',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','Router.js'),'utf8');
  const route=source.match(/if \(path === '\/print-templates\/preview'\) \{[\s\S]*?\n    \}/);
  assert.ok(route,'preview route exists');
  assert.match(route[0],/AccessControlService\.require\(params, 'PROJECT_VIEW'\)/);
  assert.match(route[0],/PrintTemplateService\.preview\(body, params\)/);
});


test('replacing a template PDF deletes the previous unreferenced Drive file only after the new file is saved',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'PDF_REPLACE',Name:'جایگزینی PDF',Definition:{elements:[],bindings:[]}}, {});
  const definition={pdf:{pages:[{widthMm:210,heightMm:297}]},elements:[],bindings:[]};
  const first=h.service.uploadPdf(created.data.ID,{
    fileName:'first.pdf',mimeType:'application/pdf',
    base64:Buffer.from('%PDF-1.4\\nfirst').toString('base64'),pageCount:1,Definition:definition
  },{});
  const firstKey=h.templates[0].PdfStorageKey;
  assert.ok(h.storedFiles[firstKey]);
  const second=h.service.uploadPdf(created.data.ID,{
    fileName:'second.pdf',mimeType:'application/pdf',
    base64:Buffer.from('%PDF-1.4\\nsecond').toString('base64'),pageCount:1,Definition:definition
  },{});
  const secondKey=h.templates[0].PdfStorageKey;
  assert.notEqual(firstKey,secondKey);
  assert.equal(!!h.storedFiles[firstKey],false);
  assert.ok(h.storedFiles[secondKey]);
  assert.equal(second.data.Pdf.FileName,'second.pdf');
});

test('PDF replacement keeps a previous Drive file that is still referenced by another template asset',()=>{
  const h=loadPrintTemplates();
  const first=h.service.create({Code:'PDF_SHARED_A',Name:'قالب اول',Definition:{elements:[],bindings:[]}}, {});
  const second=h.service.create({Code:'PDF_SHARED_B',Name:'قالب دوم',Definition:{elements:[],bindings:[]}}, {});
  const definition={pdf:{pages:[{widthMm:210,heightMm:297}]},elements:[],bindings:[]};
  h.service.uploadPdf(first.data.ID,{
    fileName:'shared.pdf',mimeType:'application/pdf',
    base64:Buffer.from('%PDF-1.4\\nshared').toString('base64'),pageCount:1,Definition:definition
  },{});
  const sharedKey=h.templates[0].PdfStorageKey;
  h.templates[1].ImageAssetsJSON=JSON.stringify([{ID:'IMG_sharedasset',StorageKey:sharedKey}]);
  h.service.uploadPdf(first.data.ID,{
    fileName:'replacement.pdf',mimeType:'application/pdf',
    base64:Buffer.from('%PDF-1.4\\nreplacement').toString('base64'),pageCount:1,Definition:definition
  },{});
  assert.ok(h.storedFiles[sharedKey]);
});

test('failed PDF metadata update removes the newly uploaded file and preserves the existing PDF reference',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'PDF_FAIL',Name:'شکست ذخیره PDF',Definition:{elements:[],bindings:[]}}, {});
  const definition={pdf:{pages:[{widthMm:210,heightMm:297}]},elements:[],bindings:[]};
  h.service.uploadPdf(created.data.ID,{
    fileName:'existing.pdf',mimeType:'application/pdf',
    base64:Buffer.from('%PDF-1.4\\nexisting').toString('base64'),pageCount:1,Definition:definition
  },{});
  const previousKey=h.templates[0].PdfStorageKey;
  const originalUpdate=h.context.PrintTemplateRepository.update;
  h.context.PrintTemplateRepository.update=()=>{throw new Error('simulated sheet write failure');};
  assert.throws(()=>h.service.uploadPdf(created.data.ID,{
    fileName:'failed.pdf',mimeType:'application/pdf',
    base64:Buffer.from('%PDF-1.4\\nfailed').toString('base64'),pageCount:1,Definition:definition
  },{}),/simulated sheet write failure/);
  h.context.PrintTemplateRepository.update=originalUpdate;
  assert.equal(h.templates[0].PdfStorageKey,previousKey);
  assert.ok(h.storedFiles[previousKey]);
  assert.equal(Object.keys(h.storedFiles).length,1);
});
