/**
 * Central reusable print-template library and project data resolver.
 * Template definitions never contain project values; values are resolved per output request.
 */
const PrintTemplateService = {
  _user: function(params) { return AccessControlService.getCurrentUser(params || {}); },
  _parse: function(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(String(value)); } catch (error) { return fallback; }
  },
  _id: function() { return 'PT_' + Utilities.getUuid().replace(/-/g, ''); },
  _now: function() { return new Date().toISOString(); },
  _template: function(id, tenantId) {
    const row = PrintTemplateRepository.findById(id);
    if (!row || String(row.TenantID) !== String(tenantId) || String(row.Status || 'ACTIVE') === 'DELETED') {
      throw ErrorHandler.create(Constants.ERROR.NOT_FOUND, 'قالب موردنظر پیدا نشد.');
    }
    return row;
  },
  _definition: function(row) {
    return PrintTemplateValidator.parseDefinition(row.DefinitionJSON);
  },
  _public: function(row) {
    return {
      ID: row.ID, Code: row.Code, Name: row.Name, Description: row.Description || '',
      Status: row.Status || 'ACTIVE', Version: Number(row.Version || 1),
      Definition: this._definition(row),
      Pdf: row.PdfStorageKey ? {
        HasFile: true, FileName: row.PdfFileName || '', MimeType: row.PdfMimeType || 'application/pdf',
        FileSize: Number(row.PdfFileSize || 0), PageCount: Number(row.PdfPageCount || 0)
      } : null,
      Images: this._imageAssets(row).map(function(asset) {
        return { ID: asset.ID, FileName: asset.FileName, MimeType: asset.MimeType,
          FileSize: Number(asset.FileSize || 0), CreatedAt: asset.CreatedAt || '' };
      }),
      CreatedAt: row.CreatedAt || '', UpdatedAt: row.UpdatedAt || ''
    };
  },
  list: function(params) {
    const user = this._user(params);
    const rows = PrintTemplateRepository.getAll().filter(function(row) {
      return String(row.TenantID) === String(user.TenantID) &&
        String(row.Status || 'ACTIVE') === 'ACTIVE';
    }).sort(function(a,b) {
      return String(a.Name || '').localeCompare(String(b.Name || ''), 'fa');
    });
    return Response.success(rows.map(function(row) { return this._public(row); }, this));
  },
  get: function(id, params) {
    const user = this._user(params);
    return Response.success(this._public(this._template(id, user.TenantID)));
  },
  sources: function(params) {
    const user = this._user(params);
    const projectFields = [
      ['ID','شناسه داخلی پروژه'],['ProjectCode','کد پروژه'],['Title','نام پروژه'],
      ['Description','توضیحات'],['Status','وضعیت'],['Quantity','تعداد'],
      ['CreatedAt','تاریخ ایجاد'],['UpdatedAt','آخرین ویرایش'],['RecordState','وضعیت پرونده']
    ].map(function(item) { return { field: item[0], label: item[1], sourceType: 'PROJECT_FIELD' }; });
    const informationTypes = InformationTypeRepository.findByTenant(user.TenantID).filter(function(type) {
      return String(type.Status || 'ACTIVE') === 'ACTIVE';
    }).map(function(type) {
      return { ID: type.ID, Code: type.Code, Name: type.Name, DataType: type.DataType, Cardinality: type.Cardinality,
        Columns: InformationTypeRepository.findColumns(type.ID).filter(function(column) {
          return String(column.TenantID) === String(user.TenantID) && String(column.Status || 'ACTIVE') === 'ACTIVE';
        }).map(function(column) { return { ID: column.ID, Code: column.Code, Name: column.Name, DataType: column.DataType }; }) };
    });
    const forms = FormRepository.getForms().filter(function(form) {
      return String(form.TenantID) === String(user.TenantID) && String(form.Status || 'ACTIVE') === 'ACTIVE';
    }).map(function(form) {
      const fields = FormRepository.findFieldsByForm(form.ID).filter(function(field) {
        return String(field.TenantID) === String(user.TenantID) && String(field.Status || 'ACTIVE') === 'ACTIVE';
      }).map(function(field) {
        const type = InformationTypeRepository.findById(field.InformationTypeID);
        if (!type || String(type.TenantID) !== String(user.TenantID)) return null;
        return { ID: field.ID, InformationTypeID: type.ID, Code: type.Code, Name: field.LabelOverride || type.Name,
          DataType: type.DataType, Cardinality: type.Cardinality, GroupName: field.GroupName || '' };
      }).filter(Boolean);
      return { ID: form.ID, Code: form.Code, Name: form.Name, Version: Number(form.Version || 1), Fields: fields };
    });
    const eventFields = [
      ['EventTypeName','نوع رویداد'],['OccurredAt','تاریخ و ساعت وقوع'],['CreatedAt','زمان ثبت'],
      ['Description','توضیحات'],['CreatorName','ثبت‌کننده'],['PerformedByName','اجراکننده'],
      ['DepartmentName','واحد'],['Status','وضعیت رویداد']
    ].map(function(item) { return { field: item[0], label: item[1], sourceType: 'EVENT_FIELD' }; });
    const eventTypes = EventTypeRepository.getAll().filter(function(type) {
      return String(type.TenantID) === String(user.TenantID) && String(type.Status || 'ACTIVE').toUpperCase() === 'ACTIVE' &&
        String(type.ConnectionType || 'PROJECT').toUpperCase() !== 'INDEPENDENT';
    }).map(function(type) {
      return { ID: type.ID, Code: type.Code, Name: type.Name || type.Code, Category: type.Category || '',
        Fields: eventFields };
    }).sort(function(a,b) { return String(a.Name || '').localeCompare(String(b.Name || ''), 'fa'); });
    return Response.success({ projectFields: projectFields, informationTypes: informationTypes, forms: forms,
      eventTypes: eventTypes });
  },
  create: function(data, params) {
    const user = this._user(params);
    data = data || {};
    PrintTemplateValidator.validateMetadata(data, false);
    const code = String(data.Code).trim();
    const duplicate = PrintTemplateRepository.getAll().some(function(row) {
      return String(row.TenantID) === String(user.TenantID) &&
        String(row.Code || '').toLowerCase() === code.toLowerCase() &&
        String(row.Status || 'ACTIVE') !== 'DELETED';
    });
    if (duplicate) throw ErrorHandler.create(Constants.ERROR.DUPLICATE, 'کد قالب قبلاً استفاده شده است.');
    const now = this._now();
    const row = {
      ID: this._id(), TenantID: user.TenantID, Code: code, Name: String(data.Name).trim(),
      Description: String(data.Description || ''), Status: String(data.Status || 'ACTIVE').toUpperCase(),
      Version: 1, DefinitionJSON: JSON.stringify(PrintTemplateValidator.parseDefinition(data.Definition)),
      CreatedBy: user.ID, CreatedAt: now, UpdatedBy: user.ID, UpdatedAt: now
    };
    const created = PrintTemplateRepository.insert(row);
    AuditService.log({ TenantID: user.TenantID, UserID: user.ID, Action: Constants.ACTION.CREATE,
      EntityType: 'PRINT_TEMPLATE', EntityID: created.ID, NewData: this._public(row), Reason: 'ایجاد قالب چاپ مرکزی' });
    return Response.success(this._public(row), { message: 'قالب ایجاد شد.' });
  },
  update: function(id, data, params) {
    const user = this._user(params);
    data = data || {};
    const existing = this._template(id, user.TenantID);
    const previous = Object.assign({}, existing);
    PrintTemplateValidator.validateMetadata(data, true);
    if (data.Code !== undefined) {
      const code = String(data.Code).trim();
      const duplicate = PrintTemplateRepository.getAll().some(function(row) {
        return String(row.ID) !== String(id) && String(row.TenantID) === String(user.TenantID) &&
          String(row.Code || '').toLowerCase() === code.toLowerCase() && String(row.Status || 'ACTIVE') !== 'DELETED';
      });
      if (duplicate) throw ErrorHandler.create(Constants.ERROR.DUPLICATE, 'کد قالب قبلاً استفاده شده است.');
    }
    const patch = { UpdatedBy: user.ID, UpdatedAt: this._now(), Version: Number(existing.Version || 1) + 1 };
    ['Code','Name','Description','Status'].forEach(function(key) {
      if (data[key] !== undefined) patch[key] = key === 'Code' || key === 'Name' ? String(data[key]).trim() : data[key];
    });
    if (data.Definition !== undefined || data.DefinitionJSON !== undefined) {
      patch.DefinitionJSON = JSON.stringify(PrintTemplateValidator.parseDefinition(
        data.Definition !== undefined ? data.Definition : data.DefinitionJSON
      ));
    }
    const updated = PrintTemplateRepository.update(id, patch);
    const current = Object.assign({}, existing, patch);
    AuditService.log({ TenantID: user.TenantID, UserID: user.ID, Action: Constants.ACTION.UPDATE,
      EntityType: 'PRINT_TEMPLATE', EntityID: id, OldData: this._public(previous), NewData: this._public(current),
      Reason: 'ویرایش قالب چاپ مرکزی' });
    return Response.success(this._public(current), { message: 'قالب به‌روزرسانی شد.' });
  },
  _imageAssets: function(row) {
    const assets = this._parse(row && row.ImageAssetsJSON, []);
    return Array.isArray(assets) ? assets : [];
  },
  uploadImage: function(id, data, params) {
    const user = this._user(params);
    const existing = this._template(id, user.TenantID);
    data = data || {};
    const fileName = String(data.fileName || '').trim();
    const mimeType = String(data.mimeType || '').trim().toLowerCase();
    const base64 = String(data.base64 || '').replace(/^data:[^,]*;base64,/i, '').replace(/\s/g, '');
    const extensions = { 'image/jpeg': ['jpg','jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };
    const extension = fileName.indexOf('.') >= 0 ? fileName.split('.').pop().toLowerCase() : '';
    if (!extensions[mimeType] || extensions[mimeType].indexOf(extension) < 0 ||
        (AppConfig.FILES.ALLOWED_MIME_TYPES || []).indexOf(mimeType) < 0) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'فقط تصاویر JPG، PNG و WebP با پسوند معتبر قابل بارگذاری هستند.');
    }
    if (!fileName || fileName.length > 180 || /[\\/\\\\\u0000-\u001f\u007f]/.test(fileName)) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'نام فایل تصویر معتبر نیست.');
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'محتوای تصویر معتبر نیست.');
    }
    const maxBytes = Number(AppConfig.FILES.MAX_SIZE_MB || 10) * 1024 * 1024;
    if (base64.length > Math.ceil(maxBytes * 4 / 3) + 8) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'حجم تصویر بیشتر از حد مجاز است.');
    }
    let bytes;
    try { bytes = Utilities.base64Decode(base64); }
    catch (error) { throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'محتوای تصویر قابل خواندن نیست.'); }
    if (!bytes.length || bytes.length > maxBytes) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'حجم تصویر خالی یا بیشتر از حد مجاز است.');
    }
    const byte = function(index) { return (Number(bytes[index]) + 256) % 256; };
    const isJpeg = mimeType === 'image/jpeg' && bytes.length >= 3 && byte(0) === 255 && byte(1) === 216 && byte(2) === 255;
    const pngSignature = [137,80,78,71,13,10,26,10];
    const isPng = mimeType === 'image/png' && bytes.length >= 8 &&
      pngSignature.every(function(value, index) { return byte(index) === value; });
    const isWebp = mimeType === 'image/webp' && bytes.length >= 12 &&
      String.fromCharCode(byte(0),byte(1),byte(2),byte(3)) === 'RIFF' &&
      String.fromCharCode(byte(8),byte(9),byte(10),byte(11)) === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'محتوای فایل با فرمت اعلام‌شده تصویر مطابقت ندارد.');
    }
    const assets = this._imageAssets(existing);
    if (assets.length >= 100) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'هر قالب حداکثر می‌تواند ۱۰۰ تصویر داشته باشد.');
    }
    const stored = GoogleDriveStorage.uploadBase64ToTenant({
      fileName: fileName, mimeType: mimeType, base64: base64
    }, user.TenantID);
    const asset = {
      ID: 'IMG_' + Utilities.getUuid().replace(/-/g, ''),
      FileName: stored.fileName || fileName, MimeType: mimeType,
      FileSize: Number(stored.fileSize || bytes.length), StorageKey: stored.storageKey,
      CreatedAt: this._now()
    };
    const nextAssets = assets.concat([asset]);
    const patch = { ImageAssetsJSON: JSON.stringify(nextAssets), UpdatedBy: user.ID,
      UpdatedAt: this._now(), Version: Number(existing.Version || 1) + 1 };
    try { PrintTemplateRepository.update(id, patch); }
    catch (error) {
      try { GoogleDriveStorage.delete(stored.storageKey); } catch (cleanupError) {}
      throw error;
    }
    AuditService.log({
      TenantID: user.TenantID, UserID: user.ID, Action: Constants.ACTION.UPDATE,
      EntityType: 'PRINT_TEMPLATE', EntityID: id,
      OldData: { ImageCount: assets.length },
      NewData: { ImageCount: nextAssets.length, ImageID: asset.ID },
      Reason: 'افزودن تصویر مستقل به قالب چاپ'
    });
    return Response.success({
      ID: asset.ID, FileName: asset.FileName, MimeType: asset.MimeType,
      FileSize: asset.FileSize, CreatedAt: asset.CreatedAt
    }, { message: 'تصویر قالب ذخیره شد.' });
  },
  downloadImage: function(id, assetId, params) {
    const user = this._user(params);
    const template = this._template(id, user.TenantID);
    const asset = this._imageAssets(template).find(function(item) {
      return String(item.ID) === String(assetId);
    });
    if (!asset || !asset.StorageKey) {
      throw ErrorHandler.create(Constants.ERROR.NOT_FOUND, 'تصویر موردنظر در این قالب پیدا نشد.');
    }
    const file = GoogleDriveStorage.getFileAsBase64(asset.StorageKey);
    if (String(file.mimeType || '').toLowerCase() !== String(asset.MimeType || '').toLowerCase()) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'نوع فایل ذخیره‌شده با مشخصات تصویر مطابقت ندارد.');
    }
    return Response.success({
      ID: asset.ID, fileName: asset.FileName || file.fileName || 'template-image',
      mimeType: asset.MimeType, fileSize: Number(asset.FileSize || file.fileSize || 0),
      base64: file.base64
    });
  },
  _isStorageKeyReferenced: function(storageKey, tenantId, excludedTemplateId) {
    if (!storageKey) return false;
    return PrintTemplateRepository.getAll().some(function(row) {
      if (String(row.TenantID) !== String(tenantId)) return false;
      if (String(row.ID) !== String(excludedTemplateId || '') &&
          String(row.PdfStorageKey || '') === String(storageKey)) return true;
      return this._imageAssets(row).some(function(asset) {
        return String(asset.StorageKey || '') === String(storageKey);
      });
    }, this);
  },
  _deleteStorageKeyIfUnreferenced: function(storageKey, tenantId, excludedTemplateId) {
    if (!storageKey || this._isStorageKeyReferenced(storageKey, tenantId, excludedTemplateId)) return false;
    try {
      GoogleDriveStorage.delete(storageKey);
      return true;
    } catch (error) {
      if (typeof Logger !== 'undefined' && Logger.log) {
        Logger.log('Print template storage cleanup deferred for an unreferenced file.');
      }
      return false;
    }
  },
  uploadPdf: function(id, data, params) {
    const user = this._user(params);
    const existing = this._template(id, user.TenantID);
    data = data || {};
    const definition = PrintTemplateValidator.parseDefinition(data.Definition);
    const pageCount = Number(data.pageCount || 0);
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 50 ||
        !definition.pdf || definition.pdf.pages.length !== pageCount) {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'تعداد صفحات PDF معتبر نیست.');
    }
    if (String(data.mimeType || '').toLowerCase() !== 'application/pdf') {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'فقط فایل PDF قابل بارگذاری است.');
    }
    const fileName = String(data.fileName || 'template.pdf').replace(/[\\/\\\\]/g, '_').slice(0, 180);
    Validator.required(data.base64, 'محتوای PDF');
    const stored = GoogleDriveStorage.uploadBase64ToTenant({
      fileName: fileName, mimeType: 'application/pdf', base64: data.base64
    }, user.TenantID);
    const previousStorageKey = existing.PdfStorageKey || '';
    const patch = {
      DefinitionJSON: JSON.stringify(definition),
      PdfStorageKey: stored.storageKey,
      PdfFileName: stored.fileName,
      PdfMimeType: 'application/pdf',
      PdfFileSize: Number(stored.fileSize || 0),
      PdfPageCount: pageCount,
      UpdatedBy: user.ID,
      UpdatedAt: this._now(),
      Version: Number(existing.Version || 1) + 1
    };
    try {
      PrintTemplateRepository.update(id, patch);
    } catch (error) {
      this._deleteStorageKeyIfUnreferenced(stored.storageKey, user.TenantID, id);
      throw error;
    }
    const current = Object.assign({}, existing, patch);
    AuditService.log({
      TenantID: user.TenantID, UserID: user.ID, Action: Constants.ACTION.UPDATE,
      EntityType: 'PRINT_TEMPLATE', EntityID: id, OldData: this._public(existing),
      NewData: this._public(current), Reason: 'بارگذاری پس‌زمینه PDF قالب چاپ'
    });
    if (previousStorageKey && previousStorageKey !== stored.storageKey) {
      this._deleteStorageKeyIfUnreferenced(previousStorageKey, user.TenantID, id);
    }
    return Response.success(this._public(current), { message: 'فایل PDF قالب ذخیره شد.' });
  },
  downloadPdf: function(id, params) {
    const user = this._user(params);
    const template = this._template(id, user.TenantID);
    if (!template.PdfStorageKey) {
      throw ErrorHandler.create(Constants.ERROR.NOT_FOUND, 'برای این قالب فایل PDF ثبت نشده است.');
    }
    const file = GoogleDriveStorage.getFileAsBase64(template.PdfStorageKey);
    if (String(file.mimeType || '').toLowerCase() !== 'application/pdf') {
      throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'فایل پس‌زمینه قالب PDF معتبر نیست.');
    }
    return Response.success({
      fileName: template.PdfFileName || file.fileName || 'template.pdf',
      mimeType: 'application/pdf',
      fileSize: Number(template.PdfFileSize || file.fileSize || 0),
      pageCount: Number(template.PdfPageCount || 0),
      base64: file.base64
    });
  },
  deactivate: function(id, params) {
    const user = this._user(params);
    const existing = this._template(id, user.TenantID);
    const patch = { Status: 'DELETED', UpdatedBy: user.ID, UpdatedAt: this._now(),
      Version: Number(existing.Version || 1) + 1 };
    PrintTemplateRepository.update(id, patch);
    const updated = Object.assign({}, existing, patch);
    AuditService.log({ TenantID: user.TenantID, UserID: user.ID, Action: Constants.ACTION.DELETE,
      EntityType: 'PRINT_TEMPLATE', EntityID: id, OldData: this._public(existing), NewData: this._public(updated),
      Reason: 'غیرفعال‌سازی قالب چاپ مرکزی' });
    return Response.success({ ID: id, Status: 'DELETED' }, { message: 'قالب غیرفعال شد.' });
  },
  _resolveProjectData: function(projectId, definition, user) {
    Validator.required(projectId, 'ProjectID');
    const project = ProjectRepository.findById(projectId);
    if (!project || String(project.TenantID) !== String(user.TenantID) ||
        !ProjectService._isProjectAvailableToUser_(project, user)) {
      throw ErrorHandler.create(Constants.ERROR.NOT_FOUND, 'پروژه موردنظر پیدا نشد.');
    }
    const projectFieldAllowList = {
      ID: true, ProjectCode: true, Title: true, Description: true, Status: true,
      Quantity: true, CreatedAt: true, UpdatedAt: true, RecordState: true
    };
    const infoTypes = InformationTypeRepository.findByTenant(user.TenantID);
    const infoById = Object.create(null);
    infoTypes.forEach(function(type) {
      if (String(type.Status || 'ACTIVE') === 'ACTIVE') infoById[String(type.ID)] = type;
    });
    const informationRows = ProjectInformationRepository.findByProject(projectId).filter(function(row) {
      return String(row.TenantID) === String(user.TenantID) && String(row.Status || 'ACTIVE') === 'ACTIVE';
    });
    const informationByType = Object.create(null);
    informationRows.forEach(function(row) { informationByType[String(row.InformationTypeID)] = row; });
    const events = EventRepository.findByProjectId(projectId).filter(function(event) {
      const status = String(event.Status || '').toUpperCase();
      return String(event.TenantID) === String(user.TenantID) && status !== 'VOID' &&
        status !== 'CANCELLED' && status !== 'CANCELED';
    });
    const eventIds = Object.create(null);
    events.forEach(function(event) { eventIds[String(event.ID)] = true; });
    const responses = FormRepository.getEventResponses().filter(function(row) {
      return String(row.TenantID) === String(user.TenantID) && !!eventIds[String(row.EventID)];
    });
    const eventBindings = definition.bindings.filter(function(binding) { return binding.sourceType === 'EVENT_FIELD'; });
    const needsEventFields = eventBindings.length > 0;
    const requestedEventFields = Object.create(null);
    eventBindings.forEach(function(binding) { requestedEventFields[String(binding.field || '')] = true; });
    const eventTypeById = Object.create(null);
    const usersById = Object.create(null);
    const departmentsById = Object.create(null);
    let resolvedEvents = [];
    if (needsEventFields) {
      EventTypeRepository.getAll().forEach(function(type) {
        if (String(type.TenantID) === String(user.TenantID) && String(type.Status || 'ACTIVE').toUpperCase() === 'ACTIVE' &&
            String(type.ConnectionType || 'PROJECT').toUpperCase() !== 'INDEPENDENT') {
          eventTypeById[String(type.ID)] = type;
        }
      });
      if (requestedEventFields.CreatorName || requestedEventFields.PerformedByName) {
        (UserRepository.getAll() || []).forEach(function(item) {
          if (item && String(item.TenantID) === String(user.TenantID)) usersById[String(item.ID)] = item;
        });
      }
      if (requestedEventFields.DepartmentName) {
        (DepartmentRepository.getAll() || []).forEach(function(item) {
          if (item && String(item.TenantID) === String(user.TenantID)) departmentsById[String(item.ID)] = item;
        });
      }
      resolvedEvents = events.map(function(event) {
        const type = eventTypeById[String(event.EventTypeID || '')];
        const creator = usersById[String(event.CreatedBy || '')];
        const performer = usersById[String(event.PerformedBy || '')];
        const department = departmentsById[String(event.DepartmentID || '')];
        return {
          ID: event.ID, EventTypeID: event.EventTypeID, OccurredAt: event.OccurredAt || '',
          CreatedAt: event.CreatedAt || '', Description: event.Description || '', Status: event.Status || '',
          EventTypeName: type ? (type.Name || type.Code || '') : '',
          CreatorName: creator ? EventService.getUserDisplayName(creator) : (event.CreatedBy || ''),
          PerformedByName: performer ? EventService.getUserDisplayName(performer) : (event.PerformedBy || ''),
          DepartmentName: department ? (department.Name || department.Title || department.Code || '') : ''
        };
      });
    }
    const resolved = Object.create(null);
    definition.bindings.forEach(function(binding) {
      let value = null;
      if (binding.sourceType === 'EVENT_FIELD') {
        const typeId = String(binding.eventTypeId || '');
        if (!eventTypeById[typeId]) throw ErrorHandler.create(Constants.ERROR.NOT_FOUND, 'نوع رویداد متصل به قالب پیدا نشد یا غیرفعال است.');
        const field = String(binding.field || '');
        const allowedEventFields = ['EventTypeName','OccurredAt','CreatedAt','Description','CreatorName','PerformedByName','DepartmentName','Status'];
        if (allowedEventFields.indexOf(field) === -1) throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'فیلد رویداد برای منبع قالب مجاز نیست.');
        const matchingEvents = resolvedEvents.filter(function(event) {
          return String(event.EventTypeID) === typeId;
        }).sort(function(a,b) {
          return String(a.OccurredAt || a.CreatedAt).localeCompare(String(b.OccurredAt || b.CreatedAt));
        });
        const selection = String(binding.selection || 'LATEST').toUpperCase();
        if (selection === 'ALL') value = matchingEvents.map(function(event) { return event[field]; });
        else {
          const latest = matchingEvents.length ? matchingEvents[matchingEvents.length - 1] : null;
          value = latest ? latest[field] : null;
        }
      } else if (binding.sourceType === 'PROJECT_FIELD') {
        const field = String(binding.field || '');
        if (!projectFieldAllowList[field]) throw ErrorHandler.create(Constants.ERROR.VALIDATION_ERROR, 'فیلد پروژه در منبع قالب مجاز نیست.');
        value = project[field] !== undefined ? project[field] : null;
      } else if (binding.sourceType === 'PROJECT_INFORMATION') {
        const typeId = String(binding.informationTypeId || '');
        if (!infoById[typeId]) throw ErrorHandler.create(Constants.ERROR.NOT_FOUND, 'نوع اطلاعات متصل به قالب پیدا نشد یا غیرفعال است.');
        const row = informationByType[typeId];
        value = row ? this._parse(row.ValueJSON, null) : null;
      } else {
        const formId = String(binding.formId || '');
        const matching = responses.filter(function(row) {
          return String(row.FormID) === formId &&
            (!binding.eventId || String(row.EventID) === String(binding.eventId)) &&
            (!binding.responseId || String(row.ID) === String(binding.responseId));
        }).map(function(row) {
          const event = events.find(function(item) { return String(item.ID) === String(row.EventID); });
          return {
            ID: row.ID, EventID: row.EventID, FormID: row.FormID, FormVersion: Number(row.FormVersion || 1),
            CreatedAt: row.CreatedAt || '', EventOccurredAt: event ? (event.OccurredAt || event.CreatedAt || '') : '',
            Values: this._parse(row.ResponseJSON, {}), Definition: this._parse(row.DefinitionSnapshotJSON, {})
          };
        }, this).sort(function(a,b) { return String(a.CreatedAt).localeCompare(String(b.CreatedAt)); });
        const pickValue = function(record) {
          if (binding.sourceType === 'EVENT_FORM_RESPONSE') return { ID: record.ID, EventID: record.EventID,
            FormID: record.FormID, FormVersion: record.FormVersion, CreatedAt: record.CreatedAt,
            Values: record.Values, Definition: record.Definition };
          const fields = record.Definition && Array.isArray(record.Definition.Fields) ? record.Definition.Fields : [];
          const selectedField = fields.find(function(field) {
            return String(field.ID || '') === String(binding.fieldId || '') ||
              String(field.InformationTypeID || '') === String(binding.informationTypeId || '');
          });
          const typeId = String(binding.informationTypeId || (selectedField && selectedField.InformationTypeID) || '');
          return typeId ? (record.Values[typeId] !== undefined ? record.Values[typeId] : null) : null;
        };
        const selection = String(binding.selection || 'LATEST').toUpperCase();
        if (selection === 'ALL') value = matching.map(pickValue);
        else if (selection === 'EVENT' || selection === 'RESPONSE') value = matching.length ? pickValue(matching[matching.length - 1]) : null;
        else value = matching.length ? pickValue(matching[matching.length - 1]) : null;
      }
      resolved[String(binding.id)] = value;
    }, this);
    return {
      project: { ID: project.ID, ProjectCode: project.ProjectCode || '', Title: project.Title || '' },
      data: resolved
    };
  },
  preview: function(body, params) {
    const user = this._user(params);
    body = body || {};
    Validator.required(body.ProjectID, 'ProjectID');
    const definition = PrintTemplateValidator.parseDefinition(body.Definition);
    const resolved = this._resolveProjectData(body.ProjectID, definition, user);
    return Response.success({
      project: resolved.project,
      data: resolved.data,
      resolvedAt: this._now()
    });
  },
  resolve: function(id, body, params) {
    const user = this._user(params);
    body = body || {};
    const template = this._template(id, user.TenantID);
    if (String(template.Status || 'ACTIVE') !== 'ACTIVE') {
      throw ErrorHandler.create(Constants.ERROR.INVALID_OPERATION, 'قالب غیرفعال است و قابل استفاده برای تولید سند نیست.');
    }
    const definition = this._definition(template);
    const resolved = this._resolveProjectData(body.ProjectID, definition, user);
    return Response.success({
      template: { ID: template.ID, Code: template.Code, Name: template.Name, Version: Number(template.Version || 1) },
      project: resolved.project,
      data: resolved.data,
      resolvedAt: this._now()
    });
  }
};