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
      ResponseJSON:JSON.stringify({I1:'خارج از tenant'}),DefinitionSnapshotJSON:'{}' }
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
        {ID:'E1',TenantID:'T1',Status:'ACTIVE'},
        {ID:'E2',TenantID:'T1',Status:'ACTIVE'},
        {ID:'E3',TenantID:'T2',Status:'ACTIVE'}
      ]
    },
    FormRepository: {
      getForms: () => [{ID:'F1',TenantID:'T1',Code:'F',Name:'فرم',Version:3,Status:'ACTIVE'}],
      findFieldsByForm: () => [{ID:'FF1',TenantID:'T1',Status:'ACTIVE',InformationTypeID:'I1'}],
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
  return {service:context.__service,templates,audits,storedFiles};
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

test('source catalog exposes active tenant information types and reusable forms',()=>{
  const h=loadPrintTemplates();
  const result=h.service.sources({});
  assert.equal(result.data.informationTypes.length,1);
  assert.equal(result.data.forms.length,1);
  assert.equal(result.data.forms[0].Fields[0].InformationTypeID,'I1');
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

test('legacy PDF background metadata is ignored and is not exposed by the template contract',()=>{
  const h=loadPrintTemplates();
  const created=h.service.create({Code:'LEGACY_BG',Name:'قالب قدیمی',Definition:{
    page:{size:'A4',orientation:'portrait'},pdf:{pageCount:1,pages:[{widthMm:210,heightMm:297}]},
    elements:[{id:'e1',type:'text',pageIndex:0,text:'متن'}],bindings:[]
  }}, {});
  assert.equal(Object.hasOwn(created.data.Definition,'pdf'),false);
  assert.equal(Object.hasOwn(created.data,'Pdf'),false);
  const source=fs.readFileSync(path.join(__dirname,'..','PrintTemplateValidator.js'),'utf8');
  assert.match(source,/Legacy background-PDF metadata is intentionally ignored/);
});

test('print-template API has no dedicated PDF background upload or download route while image asset routes remain',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','Router.js'),'utf8');
  assert.doesNotMatch(source,/printTemplatePdfMatch|printTemplatePdfUploadMatch|downloadPdf\(|uploadPdf\(/);
  assert.match(source,/printTemplateImageMatch/);
  assert.match(source,/printTemplateImageUploadMatch/);
});
