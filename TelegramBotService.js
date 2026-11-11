/**
 * Telegram Bot integration for PMS.
 *
 * Script Properties required:
 * TELEGRAM_BOT_TOKEN: token from BotFather (never commit it).
 * TELEGRAM_WEBHOOK_SECRET: long random secret used in the webhook URL.
 * TELEGRAM_TENANT_CHAT_IDS: JSON object mapping TenantID to an array of chat IDs,
 * e.g. {"TENANT_ID":["123456789"]}. Only configured chats receive project notifications.
 */
const TelegramBotService = {
  _properties_: function() {
    return PropertiesService.getScriptProperties();
  },

  _getToken_: function() {
    return String(this._properties_().getProperty('TELEGRAM_BOT_TOKEN') || '').trim();
  },

  _getWebhookSecret_: function() {
    return String(this._properties_().getProperty('TELEGRAM_WEBHOOK_SECRET') || '').trim();
  },

  _json_: function(value) {
    return ContentService.createTextOutput(JSON.stringify(value))
      .setMimeType(ContentService.MimeType.JSON);
  },

  handleWebhook: function(e) {
    const suppliedSecret = String(e && e.parameter && e.parameter.telegramSecret || '');
    const expectedSecret = this._getWebhookSecret_();
    if (!expectedSecret || suppliedSecret !== expectedSecret) return this._json_({ ok: false });
    let update;
    try {
      update = JSON.parse(String(e && e.postData && e.postData.contents || '{}'));
    } catch (error) {
      return this._json_({ ok: false });
    }
    this._processUpdate_(update);
    return this._json_({ ok: true });
  },

  // Polling mode avoids reliance on Google's anonymous inbound POST endpoint.
  _processUpdate_: function(update) {
    const message = update && (update.message || update.edited_message);
    if (!message || !message.chat || !message.chat.id) return { ok: true, ignored: true };
    const chatId = String(message.chat.id);
    const text = String(message.text || '').trim();
    const firstName = String(message.from && message.from.first_name || 'دوست');
    if (/^\/(start|help)(@\w+)?$/i.test(text)) {
      const props = this._properties_();
      const pendingTenantId = String(props.getProperty('TELEGRAM_PENDING_TENANT_ID') || '').trim();
      const expiresAt = Number(props.getProperty('TELEGRAM_PENDING_REGISTRATION_EXPIRES_AT') || 0);
      if (pendingTenantId && expiresAt > Date.now() && String(message.chat.type || '') === 'private') {
        const tenantRows = GoogleSheetsRepository.getAll('01_Tenants') || [];
        const activeTenants = tenantRows.filter(function(row) {
          return String(row.Status || '').trim().toUpperCase() === 'ACTIVE' &&
            String(row.ID || '').trim();
        });
        const matchedTenant = activeTenants.length === 1 &&
          String(activeTenants[0].ID) === pendingTenantId ? activeTenants[0] : null;
        if (!matchedTenant) {
          props.deleteProperty('TELEGRAM_PENDING_TENANT_ID');
          props.deleteProperty('TELEGRAM_PENDING_REGISTRATION_EXPIRES_AT');
          this.sendMessage(chatId, 'اتصال انجام نشد؛ وضعیت شرکت فعال تغییر کرده است. مدیر سامانه باید فرایند اتصال را دوباره آغاز کند.');
          return { ok: false, reason: 'TENANT_STATE_CHANGED' };
        }
        this.registerTenantChat(pendingTenantId, chatId);
        props.deleteProperty('TELEGRAM_PENDING_TENANT_ID');
        props.deleteProperty('TELEGRAM_PENDING_REGISTRATION_EXPIRES_AT');
        this.sendMessage(chatId,
          'سلام ' + firstName + '، اتصال این گفت‌وگو به شرکت «' +
          String(matchedTenant.Name || matchedTenant.Code || 'شرکت عملیاتی') +
          '» با موفقیت انجام شد. از این پس اعلان‌های مجاز سامانه در همین گفت‌وگو ارسال می‌شوند.');
        return { ok: true, registered: true };
      }
      if (pendingTenantId && expiresAt <= Date.now()) {
        props.deleteProperty('TELEGRAM_PENDING_TENANT_ID');
        props.deleteProperty('TELEGRAM_PENDING_REGISTRATION_EXPIRES_AT');
      }
      if (pendingTenantId && String(message.chat.type || '') !== 'private') {
        this.sendMessage(chatId, 'برای اتصال امن، ربات را در گفت‌وگوی خصوصی باز کنید و /start بفرستید.');
        return { ok: false, reason: 'PRIVATE_CHAT_REQUIRED' };
      }
      this.sendMessage(chatId,
        'سلام ' + firstName + '، ربات اطلاع‌رسانی سامانه مدیریت تولید آماده است.\n' +
        'شناسه گفت‌وگوی شما: ' + chatId + '\n\n' +
        'برای اتصال این گفت‌وگو، مدیر سامانه باید ابتدا تابع runTelegramTenantRegistration را اجرا کند.\n' +
        'فرمان‌ها: /chatid ، /help');
    } else if (/^\/chatid(@\w+)?$/i.test(text)) {
      this.sendMessage(chatId, 'شناسه گفت‌وگوی شما: ' + chatId);
    } else {
      this.sendMessage(chatId, 'فرمان شناخته نشد. برای راهنما /help را بفرستید.');
    }
    return { ok: true };
  },

  setupPolling: function() {
    const token = this._getToken_();
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN تنظیم نشده است.');
    // Telegram does not allow getUpdates while a webhook is configured.
    const deleteResponse = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/deleteWebhook', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ drop_pending_updates: false }),
      muteHttpExceptions: true
    });
    const deleted = JSON.parse(deleteResponse.getContentText() || '{}');
    if (deleteResponse.getResponseCode() < 200 || deleteResponse.getResponseCode() >= 300 || !deleted.ok) {
      throw new Error('حذف وب‌هوک قبلی تلگرام ناموفق بود؛ اتصال ربات را بررسی کنید.');
    }
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'runTelegramPolling') ScriptApp.deleteTrigger(trigger);
    });
    ScriptApp.newTrigger('runTelegramPolling').timeBased().everyMinutes(1).create();
    return { ok: true, mode: 'polling', intervalMinutes: 1, description: 'Telegram polling configured' };
  },

  pollUpdates: function() {
    const token = this._getToken_();
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN تنظیم نشده است.');
    const props = this._properties_();
    const offset = Number(props.getProperty('TELEGRAM_UPDATE_OFFSET') || 0);
    const url = 'https://api.telegram.org/bot' + token + '/getUpdates';
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ offset: offset, timeout: 0, allowed_updates: ['message'] }),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText() || '{}');
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !result.ok) {
      console.warn('Telegram getUpdates failed with HTTP ' + response.getResponseCode());
      return { ok: false, reason: 'TELEGRAM_API_ERROR' };
    }
    let nextOffset = offset;
    (result.result || []).forEach(function(update) {
      // Advance only after handling this update so transient failures can be retried.
      TelegramBotService._processUpdate_(update);
      nextOffset = Math.max(nextOffset, Number(update.update_id || 0) + 1);
      props.setProperty('TELEGRAM_UPDATE_OFFSET', String(nextOffset));
    });
    return { ok: true, processed: (result.result || []).length, nextOffset: nextOffset };
  },

  sendMessage: function(chatId, text) {
    const token = this._getToken_();
    if (!token || !chatId) return { ok: false, reason: 'NOT_CONFIGURED' };

    const response = UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + token + '/sendMessage',
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: String(chatId),
          text: String(text || '').slice(0, 4000),
          disable_web_page_preview: true
        }),
        muteHttpExceptions: true
      }
    );

    const code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      console.warn('Telegram sendMessage failed with HTTP ' + code);
      return { ok: false, reason: 'HTTP_' + code };
    }
    let result;
    try { result = JSON.parse(response.getContentText()); } catch (error) { result = null; }
    return result && result.ok ? { ok: true } : { ok: false, reason: 'TELEGRAM_REJECTED' };
  },

  /**
   * Arm a short-lived, one-time pairing window for the sole active Production tenant.
   * The first private /start received during this window is registered automatically.
   */
  armTenantRegistration: function() {
    if (!this._getToken_()) throw new Error('ابتدا اتصال ربات تلگرام را تنظیم کنید.');
    if (typeof GoogleSheetsRepository === 'undefined' ||
        typeof GoogleSheetsRepository.getAll !== 'function') {
      throw new Error('دسترسی به مخزن دیتابیس فراهم نیست.');
    }
    const tenants = (GoogleSheetsRepository.getAll('01_Tenants') || []).filter(function(row) {
      return String(row.Status || '').trim().toUpperCase() === 'ACTIVE' &&
        String(row.ID || '').trim();
    });
    if (tenants.length !== 1) {
      throw new Error(tenants.length
        ? 'برای اتصال خودکار باید فقط یک Tenant فعال وجود داشته باشد؛ برای جلوگیری از اتصال اشتباه، هیچ تغییری انجام نشد.'
        : 'هیچ Tenant فعالی در شیت 01_Tenants پیدا نشد.');
    }
    const props = this._properties_();
    const tenant = tenants[0];
    props.setProperty('TELEGRAM_PENDING_TENANT_ID', String(tenant.ID));
    props.setProperty('TELEGRAM_PENDING_REGISTRATION_EXPIRES_AT', String(Date.now() + 10 * 60 * 1000));
    return {
      ok: true,
      tenantName: String(tenant.Name || tenant.Code || 'شرکت فعال'),
      expiresInMinutes: 10
    };
  },

  registerTenantChat: function(tenantId, chatId) {
    tenantId = String(tenantId || '').trim();
    chatId = String(chatId || '').trim();
    if (!tenantId || !chatId || !/^-?\d+$/.test(chatId)) {
      throw new Error('TenantID یا شناسه گفت‌وگوی تلگرام معتبر نیست.');
    }
    const props = this._properties_();
    let mapping;
    try { mapping = JSON.parse(props.getProperty('TELEGRAM_TENANT_CHAT_IDS') || '{}'); }
    catch (error) { throw new Error('تنظیم TELEGRAM_TENANT_CHAT_IDS معتبر نیست؛ مقدار قبلی حفظ شد.'); }
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      throw new Error('تنظیم TELEGRAM_TENANT_CHAT_IDS باید یک شیء JSON باشد.');
    }
    const recipients = Array.isArray(mapping[tenantId]) ? mapping[tenantId].map(String) : [];
    if (recipients.indexOf(chatId) < 0) recipients.push(chatId);
    mapping[tenantId] = recipients;
    props.setProperty('TELEGRAM_TENANT_CHAT_IDS', JSON.stringify(mapping));
    return { ok: true, tenantId: tenantId, registered: true };
  },

  _formatNotificationDate_: function(value) {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    const date = value instanceof Date ? value : new Date(value);
    if (!isFinite(date.getTime())) return String(value);
    let local;
    try {
      local = Utilities.formatDate(date, 'Asia/Tehran', 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      return String(value);
    }
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::\d{2})?$/.exec(local);
    if (!match) return String(value);
    const gy = Number(match[1]), gm = Number(match[2]), gd = Number(match[3]);
    const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) -
      Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
    let jy = -1595 + 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    let jm, jd;
    if (days < 186) {      jm = 1 + Math.floor(days / 31);      jd = 1 + (days % 31);
    } else {
      jm = 7 + Math.floor((days - 186) / 30);
      jd = 1 + ((days - 186) % 30);
    }
    const pad = function(number) { return String(number).padStart(2, '0'); };
    return jy + '/' + pad(jm) + '/' + pad(jd) + ' ' + match[4] + ':' + match[5];
  },

  _parseNotificationJson_: function(value, fallback) {
    if (value === undefined || value === null || String(value).trim() === '') return fallback;
    try { return JSON.parse(String(value)); } catch (error) { return fallback; }
  },

  _notificationAttachmentLabel_: function(value, tenantId, projectId) {
    const references = Array.isArray(value) ? value : [value];
    return references.map(function(reference) {
      if (!reference || typeof reference !== 'object') return String(reference || '').trim();
      const attachmentId = String(reference.AttachmentID || reference.ID || '').trim();
      if (!attachmentId || typeof AttachmentRepository === 'undefined' ||
          typeof AttachmentRepository.findById !== 'function') {
        return String(reference.FileName || 'پیوست ثبت‌شده').trim();
      }
      const attachment = AttachmentRepository.findById(attachmentId);
      if (!attachment ||
          String(attachment.TenantID) !== String(tenantId) ||
          String(attachment.Status || '').toUpperCase() === 'DELETED' ||
          (projectId && String(attachment.EntityType) === 'PROJECT' &&
            String(attachment.EntityID) !== String(projectId))) {
        return 'پیوست ثبت‌شده';
      }
      return String(attachment.FileName || 'پیوست ثبت‌شده').trim();
    }).filter(Boolean).join('، ');
  },

  _formatNotificationValue_: function(value, dataType, tenantId, projectId) {
    if (value === undefined || value === null || value === '') return '';
    const type = String(dataType || '').toLowerCase();
    if (type === 'image' || type === 'file') {
      return this._notificationAttachmentLabel_(value, tenantId, projectId);
    }
    if (Array.isArray(value)) {
      return value.map(function(item, index) {
        const formatted = this._formatNotificationValue_(item, '', tenantId, projectId);
        return formatted ? (index + 1) + ') ' + formatted : '';
      }, this).filter(Boolean).join('\n');
    }
    if (typeof value === 'object') {
      if (value.AttachmentID || value.ID && (value.FileName || value.MimeType)) {
        return this._notificationAttachmentLabel_(value, tenantId, projectId);
      }
      return Object.keys(value).map(function(key) {
        const formatted = this._formatNotificationValue_(value[key], '', tenantId, projectId);
        return formatted ? key + ': ' + formatted : '';
      }, this).filter(Boolean).join('؛ ');
    }
    return String(value).trim();
  },

  _formatNotificationForms_: function(event, tenantId) {
    if (typeof FormRepository === 'undefined' ||
        typeof FormRepository.findResponsesByEvent !== 'function') return [];
    const responses = FormRepository.findResponsesByEvent(event.ID) || [];
    const projectId = String(event.ProjectID || '');
    return responses.filter(function(row) {
      return String(row.TenantID) === String(tenantId) &&
        String(row.EventID) === String(event.ID);
    }).map(function(row) {
      const definition = this._parseNotificationJson_(row.DefinitionSnapshotJSON, {});
      const values = this._parseNotificationJson_(row.ResponseJSON, {});
      const fields = Array.isArray(definition.Fields) ? definition.Fields : [];
      const lines = [];
      fields.forEach(function(field) {
        const info = field.InformationType || {};
        const key = String(field.InformationTypeID || info.ID || '');
        if (!key || !Object.prototype.hasOwnProperty.call(values, key)) return;
        const value = values[key];
        if (value === undefined || value === null || value === '' ||
            (Array.isArray(value) && !value.length)) return;
        const label = String(field.LabelOverride || info.Name || info.Code || 'فیلد');
        const columns = Array.isArray(info.Columns)
          ? info.Columns.filter(function(column) {
              return String(column.Status || 'ACTIVE').toUpperCase() === 'ACTIVE';
            })
          : [];
        if (columns.length) {
          const cardinality = String(info.Cardinality || 'SINGLE').toUpperCase();
          const rows = cardinality === 'MULTIPLE'
            ? (Array.isArray(value) ? value : [])
            : (value && typeof value === 'object' ? [value] : []);
          if (!rows.length) return;
          lines.push(label + ':');
          rows.forEach(function(dataRow, index) {
            const cells = columns.map(function(column) {
              const cell = dataRow ? dataRow[String(column.Code)] : '';
              const formatted = this._formatNotificationValue_(
                cell, column.DataType, tenantId, projectId
              );
              return formatted ? String(column.Name || column.Code) + ': ' + formatted : '';
            }, this).filter(Boolean);
            if (cells.length) lines.push('  ردیف ' + (index + 1) + ' — ' + cells.join(' | '));
          }, this);
          return;
        }
        const formatted = this._formatNotificationValue_(
          value, info.DataType, tenantId, projectId
        );
        if (formatted) lines.push(label + ': ' + formatted);
      }, this);
      if (!lines.length && Object.keys(values).length) {
        Object.keys(values).forEach(function(key) {
          const formatted = this._formatNotificationValue_(values[key], '', tenantId, projectId);
          if (formatted) lines.push(key + ': ' + formatted);
        }, this);
      }
      return {
        name: String(definition.Name || definition.Code || 'فرم اطلاعات'),
        lines: lines
      };
    }, this).filter(function(form) { return form.lines.length > 0; });
  },

  _splitNotificationMessage_: function(text, limit) {
    limit = Math.max(500, Number(limit) || 3800);
    const chunks = [];
    let current = '';
    String(text || '').split('\n').forEach(function(line) {
      line = String(line);
      while (line.length > limit) {
        if (current) { chunks.push(current); current = ''; }
        chunks.push(line.slice(0, limit));
        line = line.slice(limit);
      }
      if (!line) return;
      if (current && current.length + line.length + 1 > limit) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    });
    if (current) chunks.push(current);
    return chunks;
  },

  _formatInformationValue_: function(value, info, tenantId, projectId) {
    info = info || {};
    const columns = Array.isArray(info.Columns)
      ? info.Columns.filter(function(column) {
          return String(column.Status || 'ACTIVE').toUpperCase() === 'ACTIVE';
        })
      : [];
    if (!columns.length) {
      return this._formatNotificationValue_(value, info.DataType, tenantId, projectId);
    }
    const rows = String(info.Cardinality || 'SINGLE').toUpperCase() === 'MULTIPLE'
      ? (Array.isArray(value) ? value : [])
      : (value && typeof value === 'object' ? [value] : []);
    return rows.map(function(dataRow, index) {
      const cells = columns.map(function(column) {
        const cell = dataRow ? dataRow[String(column.Code)] : '';
        const formatted = this._formatNotificationValue_(
          cell, column.DataType, tenantId, projectId
        );
        return formatted ? String(column.Name || column.Code) + ': ' + formatted : '';
      }, this).filter(Boolean);
      return cells.length ? 'ردیف ' + (index + 1) + ' — ' + cells.join(' | ') : '';
    }, this).filter(Boolean).join('\n');
  },

  _formatNotificationCentralInformation_: function(event, project, tenantId) {
    if (!event || !project || typeof ProjectInformationRepository === 'undefined' ||
        typeof ProjectInformationRepository.findByProject !== 'function') return [];
    const rows = ProjectInformationRepository.findByProject(project.ID) || [];
    return rows.filter(function(row) {
      return String(row.TenantID) === String(tenantId) &&
        String(row.SourceEventID || '') === String(event.ID) &&
        String(row.Status || 'ACTIVE').toUpperCase() === 'ACTIVE';
    }).map(function(row) {
      const type = typeof InformationTypeRepository !== 'undefined' &&
        InformationTypeRepository.findById
        ? InformationTypeRepository.findById(row.InformationTypeID)
        : null;
      if (!type || String(type.TenantID) !== String(tenantId)) return '';
      const info = Object.assign({}, type, {
        Columns: typeof InformationTypeRepository.findColumns === 'function'
          ? InformationTypeRepository.findColumns(type.ID)
          : []
      });
      const value = this._parseNotificationJson_(row.ValueJSON, null);
      const formatted = this._formatInformationValue_(
        value, info, tenantId, project.ID
      );
      return formatted ? String(type.Name || type.Code || 'اطلاعات مرکزی') + ': ' + formatted : '';
    }, this).filter(Boolean);
  },

  _formatLegacyEventData_: function(event, tenantId, projectId) {
    if (!event || typeof EventDataRepository === 'undefined' ||
        typeof EventDataRepository.findByEventId !== 'function') return [];
    const stored = EventDataRepository.findByEventId(event.ID);
    if (!stored || (stored.TenantID && String(stored.TenantID) !== String(tenantId))) return [];
    const data = this._parseNotificationJson_(stored.DataJSON, {});
    const definitions = typeof EventFieldRepository !== 'undefined' &&
      typeof EventFieldRepository.getAll === 'function'
      ? (EventFieldRepository.getAll() || []).filter(function(field) {
          return (!field.TenantID || String(field.TenantID) === String(tenantId)) &&
            String(field.EventTypeID || '') === String(event.EventTypeID || '');
        })
      : [];
    const getField = function(code) {
      return definitions.find(function(field) {
        return String(field.Code || field.FieldCode || field.ID || '') === String(code || '');
      }) || null;
    };
    const entries = Array.isArray(data)
      ? data.map(function(item, index) {
          item = item && typeof item === 'object' ? item : { Value: item };
          const code = item.Code || item.FieldCode || item.EventFieldID || '';
          const definition = getField(code);
          const value = item.Value !== undefined ? item.Value : item.FieldValue;
          const label = item.Name || item.FieldName || item.Label ||
            (definition && (definition.Name || definition.Label)) || code || ('فیلد ' + (index + 1));
          const formatted = this._formatNotificationValue_(
            value, definition && definition.DataType, tenantId, projectId
          );
          return formatted ? String(label) + ': ' + formatted : '';
        }, this)
      : (data && typeof data === 'object' ? Object.keys(data).map(function(code) {
          const item = data[code];
          const definition = getField(code);
          const value = item && typeof item === 'object' && !Array.isArray(item)
            ? (item.Value !== undefined ? item.Value :
              (item.FieldValue !== undefined ? item.FieldValue : item))
            : item;
          const label = item && typeof item === 'object'
            ? (item.Name || item.FieldName || item.Label ||
              (definition && (definition.Name || definition.Label)) || code)
            : ((definition && (definition.Name || definition.Label)) || code);
          const formatted = this._formatNotificationValue_(
            value, definition && definition.DataType, tenantId, projectId
          );
          return formatted ? String(label) + ': ' + formatted : '';
        }, this) : []);
    return entries.filter(Boolean);
  },

  _collectNotificationAttachments_: function(event, project, tenantId) {
    const ids = Object.create(null);    const collect = function(value, depth) {
      if (depth > 12 || value === null || value === undefined) return;      if (Array.isArray(value)) {
        value.forEach(function(item) { collect(item, depth + 1); });
        return;
      }
      if (typeof value !== 'object') return;
      const id = String(value.AttachmentID ||
        (value.ID && (value.FileName || value.MimeType) ? value.ID : '') || '').trim();
      if (id) ids[id] = true;
      Object.keys(value).forEach(function(key) {
        if (key !== 'AttachmentID' && key !== 'ID') collect(value[key], depth + 1);
      });
    };

    if (typeof FormRepository !== 'undefined' &&
        typeof FormRepository.findResponsesByEvent === 'function') {
      (FormRepository.findResponsesByEvent(event.ID) || []).forEach(function(row) {
        if (String(row.TenantID) !== String(tenantId) ||
            String(row.EventID) !== String(event.ID)) return;
        collect(this._parseNotificationJson_(row.ResponseJSON, {}), 0);
      }, this);
    }

    if (project && typeof ProjectInformationRepository !== 'undefined' &&
        typeof ProjectInformationRepository.findByProject === 'function') {
      (ProjectInformationRepository.findByProject(project.ID) || []).forEach(function(row) {
        if (String(row.TenantID) !== String(tenantId) ||
            String(row.SourceEventID || '') !== String(event.ID) ||
            String(row.Status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return;
        collect(this._parseNotificationJson_(row.ValueJSON, null), 0);
      }, this);
    }

    if (typeof AttachmentRepository === 'undefined' ||
        typeof AttachmentRepository.findById !== 'function') return [];
    if (typeof AttachmentRepository.findByEntity === 'function') {
      (AttachmentRepository.findByEntity('EVENT', event.ID) || []).forEach(function(item) {
        if (item && String(item.TenantID) === String(tenantId)) ids[String(item.ID)] = true;
      });
    }

    const maxBytes = typeof AppConfig !== 'undefined' && AppConfig.FILES
      ? Number(AppConfig.FILES.MAX_SIZE_MB || 10) * 1024 * 1024
      : 10 * 1024 * 1024;
    return Object.keys(ids).map(function(id) {
      return AttachmentRepository.findById(id);
    }).filter(function(attachment) {
      if (!attachment || String(attachment.TenantID) !== String(tenantId) ||
          ['DELETED', 'VOID'].indexOf(String(attachment.Status || 'ACTIVE').toUpperCase()) !== -1 ||
          !String(attachment.StorageKey || '').trim() ||
          Number(attachment.FileSize || 0) > maxBytes) return false;
      const entityType = String(attachment.EntityType || '').toUpperCase();
      const entityId = String(attachment.EntityID || '');
      return (entityType === 'EVENT' && entityId === String(event.ID)) ||
        (entityType === 'PROJECT' && project &&
          entityId === String(project.ID) && String(event.ProjectID || '') === String(project.ID));
    });
  },

  _collectProjectNotificationAttachments_: function(project, tenantId) {
    if (!project || !project.ID || typeof AttachmentRepository === 'undefined' ||
        typeof AttachmentRepository.findByEntity !== 'function') return [];
    const maxBytes = typeof AppConfig !== 'undefined' && AppConfig.FILES
      ? Number(AppConfig.FILES.MAX_SIZE_MB || 10) * 1024 * 1024
      : 10 * 1024 * 1024;
    return (AttachmentRepository.findByEntity('PROJECT', project.ID) || []).filter(function(item) {
      return item &&
        String(item.TenantID) === String(tenantId) &&
        String(item.EntityType || '').toUpperCase() === 'PROJECT' &&
        String(item.EntityID) === String(project.ID) &&
        ['DELETED', 'VOID'].indexOf(String(item.Status || 'ACTIVE').toUpperCase()) === -1 &&
        String(item.StorageKey || '').trim() &&
        Number(item.FileSize || 0) <= maxBytes;
    });
  },

  _sendNotificationAttachment_: function(chatId, attachment) {
    const token = this._getToken_();
    if (!token || !chatId || !attachment || !attachment.StorageKey ||
        typeof StorageRepository === 'undefined' ||
        typeof StorageRepository.getFile !== 'function') {
      return { ok: false, reason: 'NOT_CONFIGURED' };
    }
    try {
      const file = StorageRepository.getFile(attachment.StorageKey);
      let blob = file.getBlob();
      if (blob && typeof blob.setName === 'function') {
        blob = blob.setName(String(attachment.FileName || file.getName() || 'attachment'));
      }
      // Send the original binary as a document to preserve image quality and file contents.
      const method = 'sendDocument';
      const payload = {
        chat_id: String(chatId),
        document: blob,
        caption: String(attachment.FileName || 'پیوست سامانه').slice(0, 900)
      };
      const response = UrlFetchApp.fetch(
        'https://api.telegram.org/bot' + token + '/' + method,
        { method: 'post', payload: payload, muteHttpExceptions: true }
      );
      const code = response.getResponseCode();
      let result = null;
      try { result = JSON.parse(response.getContentText() || '{}'); } catch (parseError) {}
      return code >= 200 && code < 300 && result && result.ok
        ? { ok: true, method: method }
        : { ok: false, reason: 'HTTP_' + code };
    } catch (error) {
      console.warn('Telegram attachment delivery failed: ' +
        String(error && error.message || error));
      return { ok: false, reason: 'ATTACHMENT_SEND_FAILED' };
    }
  },

  notifyProject: function(project, createdByUser, tenantId) {
    if (!project || !tenantId || String(project.TenantID) !== String(tenantId)) {
      return { sent: 0, status: 'NOT_APPLICABLE' };
    }
    if (String(project.NotifyEnabled).toLowerCase() === 'false' ||
        String(project.NotifyEnabled) === '0') {
      return { sent: 0, status: 'PROJECT_NOTIFICATIONS_DISABLED' };
    }
    const props = this._properties_();
    let mapping;
    try { mapping = JSON.parse(props.getProperty('TELEGRAM_TENANT_CHAT_IDS') || '{}'); }
    catch (error) { return { sent: 0, status: 'INVALID_CHAT_MAPPING' }; }
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      return { sent: 0, status: 'INVALID_CHAT_MAPPING' };
    }
    const recipients = Array.isArray(mapping[String(tenantId)])
      ? mapping[String(tenantId)].map(String).filter(Boolean)
      : [];
    if (!recipients.length || !this._getToken_()) {
      return { sent: 0, status: 'NOT_CONFIGURED' };
    }
    let workflowName = '';
    let stepName = '';
    try {
      const workflow = project.WorkflowID && typeof WorkflowRepository !== 'undefined'
        ? WorkflowRepository.findById(project.WorkflowID) : null;
      const step = project.CurrentStepID && typeof WorkflowStepRepository !== 'undefined'
        ? WorkflowStepRepository.findById(project.CurrentStepID) : null;
      workflowName = String(workflow && (workflow.Name || workflow.Code) || '');
      stepName = String(step && (step.Name || step.Code) || '');
    } catch (lookupError) {}
    const lines = [
      '🆕 پروژه جدید در سامانه مدیریت تولید ثبت شد',
      'نام پروژه: ' + String(project.Title || project.Name || '-'),
      'کد پروژه: ' + String(project.ProjectCode || (String(project.RecordState).toUpperCase() === 'DRAFT' ? 'هنوز تعیین نشده' : project.ID) || '-'),
      project.Quantity !== undefined && project.Quantity !== null && String(project.Quantity) !== ''
        ? 'تعداد: ' + project.Quantity : '',
      'وضعیت ثبت: ' + (String(project.RecordState || 'ACTIVE').toUpperCase() === 'DRAFT' ? 'پیش‌نویس' : 'فعال'),
      project.Status && String(project.Status).trim().toUpperCase() !== 'ACTIVE'
        ? 'وضعیت پروژه: ' + project.Status : '',
      workflowName ? 'گردش‌کار: ' + workflowName : '',
      stepName ? 'مرحله فعلی: ' + stepName : '',
      createdByUser && (createdByUser.Name || createdByUser.Username)
        ? 'ثبت‌کننده: ' + (createdByUser.Name || createdByUser.Username) : '',
      project.CreatedAt ? '🕒 زمان ثبت: ' + this._formatNotificationDate_(project.CreatedAt) : '',
      String(project.Description || '').trim()
        ? '📝 توضیحات: ' + String(project.Description).trim() : '',
    ].filter(Boolean);
    const attachments = this._collectProjectNotificationAttachments_(project, tenantId);
    if (attachments.length) {
      lines.push('📎 فایل‌های پروژه: ' + attachments.map(function(item) {
        return String(item.FileName || 'فایل');
      }).join('، '));
    }
    const chunks = this._splitNotificationMessage_(lines.join('\n'), 3800);
    let sent = 0;
    let failed = 0;
    let mediaSent = 0;
    let mediaFailed = 0;
    recipients.forEach(function(chatId) {
      chunks.forEach(function(chunk, index) {
        const result = TelegramBotService.sendMessage(
          chatId, (chunks.length > 1 ? '[' + (index + 1) + '/' + chunks.length + ']\n' : '') + chunk
        );
        if (result && result.ok) sent += 1;
        else failed += 1;
      });
      attachments.forEach(function(attachment) {
        const result = TelegramBotService._sendNotificationAttachment_(chatId, attachment);
        if (result && result.ok) mediaSent += 1;
        else mediaFailed += 1;
      });
    });
    const hasFailure = failed > 0 || mediaFailed > 0;
    const hasSuccess = sent > 0 || mediaSent > 0;
    return { sent: sent, failed: failed, mediaSent: mediaSent, mediaFailed: mediaFailed,
      attachments: attachments.length, chunks: chunks.length,
      status: hasSuccess && !hasFailure ? 'SENT' : (hasSuccess ? 'PARTIAL' : 'FAILED') };
  },

  notifyEvent: function(event, project, eventType, department, performedUser, tenantId) {
    if (!event || !tenantId) return { sent: 0, status: 'NOT_APPLICABLE' };
    if (event.ProjectID && !project) return { sent: 0, status: 'PROJECT_NOT_AVAILABLE' };
    if (project && (String(project.NotifyEnabled).toLowerCase() === 'false' ||
        String(project.NotifyEnabled) === '0')) {
      return { sent: 0, status: 'PROJECT_NOTIFICATIONS_DISABLED' };
    }

    const props = this._properties_();
    let mapping;
    try { mapping = JSON.parse(props.getProperty('TELEGRAM_TENANT_CHAT_IDS') || '{}'); }
    catch (error) { return { sent: 0, status: 'INVALID_CHAT_MAPPING' }; }
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      return { sent: 0, status: 'INVALID_CHAT_MAPPING' };
    }

    const recipients = Array.isArray(mapping[String(tenantId)])
      ? mapping[String(tenantId)].map(String).filter(Boolean)
      : [];
    if (!recipients.length || !this._getToken_()) {
      return { sent: 0, status: 'NOT_CONFIGURED' };
    }

    const projectCode = project
      ? String(project.ProjectCode || project.ID || '-')
      : '';
    const projectTitle = project ? String(project.Title || project.Name || '') : '';
    const eventName = String(eventType && (eventType.Name || eventType.Code) || 'رویداد');
    const departmentName = String(department && (department.Name || department.Code) || '');
    const performerName = String(performedUser && (performedUser.Name || performedUser.Username) || '');
    const variants = this._parseNotificationJson_(event.VariantDetailsJSON, []);
    const variantLines = Array.isArray(variants) ? variants.map(function(item, index) {
      const parts = [];
      if (item.Color) parts.push('رنگ: ' + item.Color);
      if (item.Size) parts.push('سایز: ' + item.Size);
      if (item.VariantQuantity !== undefined && item.VariantQuantity !== null &&
          String(item.VariantQuantity) !== '') parts.push('تعداد: ' + item.VariantQuantity);
      return parts.length ? 'ردیف ' + (index + 1) + ': ' + parts.join(' | ') : '';
    }).filter(Boolean) : [];
    const lines = [
      '🔔 🏭 ثبت رویداد جدید در سامانه مدیریت تولید',
      '🧵 پروژه: ' + (project
        ? projectCode + (projectTitle ? ' — ' + projectTitle : '')
        : 'رویداد مستقل (بدون پروژه)'),
      '📌 نوع رویداد: ' + eventName,
      departmentName ? '🏢 واحد: ' + departmentName : '',
      performerName ? '👤 ثبت‌کننده/انجام‌دهنده: ' + performerName : '',
      event.OccurredAt ? '🕒 زمان وقوع: ' + this._formatNotificationDate_(event.OccurredAt) : '',
      event.CreatedAt ? '🗓️ زمان ثبت: ' + this._formatNotificationDate_(event.CreatedAt) : '',
      String(event.Description || '').trim() ? '📝 توضیحات: ' + String(event.Description).trim() : ''
    ].filter(Boolean);
    if (variantLines.length) lines.push('ترکیب رنگ/سایز:\n' + variantLines.join('\n'));
    else {
      if (event.Color) lines.push('رنگ: ' + event.Color);
      if (event.Size) lines.push('سایز: ' + event.Size);
      if (event.VariantQuantity !== undefined && event.VariantQuantity !== null &&          String(event.VariantQuantity) !== '') lines.push('تعداد: ' + event.VariantQuantity);
    }
    const centralLines = this._formatNotificationCentralInformation_(event, project, tenantId);
    if (centralLines.length) {
      // Form responses are mirrored into central information; show the event-linked
      // central snapshot once instead of repeating the same values from each form.
      lines.push('🧾اطلاعات مرکزی ثبت‌شده توسط این رویداد:\n' + centralLines.join('\n'));
    } else {
      // Preserve details for independent/legacy events that have no central snapshot.
      const dynamicLines = this._formatLegacyEventData_(event, tenantId, project ? project.ID : '');
      if (dynamicLines.length) lines.push('اطلاعات اختصاصی رویداد:\n' + dynamicLines.join('\n'));
      const forms = this._formatNotificationForms_(event, tenantId);
      forms.forEach(function(form) {
        lines.push('📋 فرم: ' + form.name + '\n' + form.lines.join('\n'));
      });
    }
    const attachments = this._collectNotificationAttachments_(event, project, tenantId);
    if (attachments.length) {
      lines.push('📎 فایل‌های پیوست‌شده: ' + attachments.map(function(item) {
        return String(item.FileName || 'فایل');
      }).join('، '));
    }
    const message = lines.join('\n');
    const chunks = this._splitNotificationMessage_(message, 3800);

    let sent = 0;
    let failed = 0;
    let mediaSent = 0;
    let mediaFailed = 0;
    recipients.forEach(function(chatId) {
      chunks.forEach(function(chunk, index) {
        try {
          if (TelegramBotService.sendMessage(chatId,
              (chunks.length > 1 ? '[' + (index + 1) + '/' + chunks.length + ']\n' : '') + chunk).ok) {
            sent += 1;
          } else {
            failed += 1;
          }
        } catch (error) {
          failed += 1;
          console.warn('Telegram notification failed: ' + String(error && error.message || error));
        }
      });
      attachments.forEach(function(attachment) {
        const result = TelegramBotService._sendNotificationAttachment_(chatId, attachment);
        if (result && result.ok) mediaSent += 1;
        else mediaFailed += 1;
      });
    });
    const hasFailure = failed > 0 || mediaFailed > 0;
    const hasSuccess = sent > 0 || mediaSent > 0;
    return { sent: sent, failed: failed, mediaSent: mediaSent, mediaFailed: mediaFailed,
      attachments: attachments.length, chunks: chunks.length,
      status: hasSuccess && !hasFailure ? 'SENT' : (hasSuccess ? 'PARTIAL' : 'FAILED') };
  },

  setWebhook: function() {
    const token = this._getToken_();
    const secret = this._getWebhookSecret_();
    const url = ScriptApp.getService().getUrl();
    if (!token || !secret || !url) {
      throw new Error('برای راه‌اندازی وب‌هوک، TELEGRAM_BOT_TOKEN و TELEGRAM_WEBHOOK_SECRET را در Script Properties تنظیم و اسکریپت را به‌عنوان Web App منتشر کنید.');
    }
    const webhookUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') +
      'telegramSecret=' + encodeURIComponent(secret);
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/setWebhook', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] }),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText() || '{}');
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !result.ok) {
      throw new Error('ثبت وب‌هوک تلگرام ناموفق بود؛ تنظیمات توکن و آدرس Web App را بررسی کنید.');
    }
    return { ok: true, description: result.description || 'Webhook configured' };
  },

  getWebhookInfo: function() {
    const token = this._getToken_();
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN تنظیم نشده است.');
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getWebhookInfo', {
      muteHttpExceptions: true
    });
    return JSON.parse(response.getContentText() || '{}');
  }
};