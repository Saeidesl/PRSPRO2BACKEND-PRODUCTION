/**
 * PMS Google Sheets Editor Add-on.
 * Kept outside the operational web-app root so the existing clasp workflow
 * cannot accidentally push this project into the production PMS script.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('PMS | مدیریت تولید')
    .addItem('اتصال به PMS و انتخاب پروژه', 'showPmsSidebar')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showPmsSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('اتصال به سامانه مدیریت تولید');
  SpreadsheetApp.getUi().showSidebar(html);
}

function pmsGetConnectionState() {
  var token = PropertiesService.getUserProperties().getProperty('PMS_SESSION_TOKEN');
  if (!token) return { connected: false };
  try {
    var me = pmsApiRequest_('GET', '/auth/me', null, token);
    return { connected: true, user: me };
  } catch (error) {
    PropertiesService.getUserProperties().deleteProperty('PMS_SESSION_TOKEN');
    return { connected: false, message: 'نشست قبلی معتبر نیست؛ دوباره وارد شوید.' };
  }
}

function pmsLogin(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  if (!username || !password) throw new Error('نام کاربری و رمز عبور را وارد کنید.');
  var result = pmsApiRequest_('POST', '/auth/login', {
    username: username,
    password: password
  }, '');
  var token = result && result.token;
  if (!token) throw new Error('ورود موفق بود اما توکن نشست دریافت نشد.');
  PropertiesService.getUserProperties().setProperty('PMS_SESSION_TOKEN', String(token));
  return { connected: true, user: result.user || null };
}

function pmsLogout() {
  var token = PropertiesService.getUserProperties().getProperty('PMS_SESSION_TOKEN');
  try {
    if (token) pmsApiRequest_('POST', '/auth/logout', {}, token);
  } finally {
    PropertiesService.getUserProperties().deleteProperty('PMS_SESSION_TOKEN');
  }
  return { connected: false };
}

function pmsListProjects() {
  var token = pmsRequireToken_();
  var response = pmsApiRequest_('GET', '/projects', null, token);
  var projects = Array.isArray(response) ? response :
    (response && Array.isArray(response.items) ? response.items :
    (response && Array.isArray(response.projects) ? response.projects : []));
  return projects.map(function(project) {
    return {
      id: String(project.ID || project.Id || ''),
      title: String(project.Title || project.Name || 'بدون عنوان'),
      code: String(project.ProjectCode || ''),
      status: String(project.Status || ''),
      recordState: String(project.RecordState || '')
    };
  }).filter(function(project) { return !!project.id; });
}

function pmsGenerateProjectCopy(projectId) {
  projectId = String(projectId || '').trim();
  if (!projectId) throw new Error('ابتدا یک پروژه انتخاب کنید.');
  var token = pmsRequireToken_();
  var source = SpreadsheetApp.getActiveSpreadsheet();
  if (!source) throw new Error('فایل قالب فعال پیدا نشد.');

  var project = pmsApiRequest_('GET', '/projects/' + encodeURIComponent(projectId), null, token);
  var infoResponse = pmsApiRequest_('GET', '/projects/' + encodeURIComponent(projectId) + '/information', null, token);
  var infoRows = Array.isArray(infoResponse) ? infoResponse :
    (infoResponse && Array.isArray(infoResponse.items) ? infoResponse.items : []);

  // Fail before creating a Drive copy if the source template has no usable PMS mapping.
  var sourceMappings = source.getNamedRanges().filter(function(namedRange) {
    return namedRange.getName().indexOf('PMS_') === 0;
  });
  var hasSupportedMapping = sourceMappings.some(function(namedRange) {
    var name = namedRange.getName();
    var range = namedRange.getRange();
    return range.getNumRows() === 1 && range.getNumColumns() === 1 &&
      (/^PMS_PROJECT_(ID|CODE|TITLE|DESCRIPTION|STATUS|QUANTITY|CREATED_AT|UPDATED_AT)$/.test(name) ||
       /^PMS_INFO_[A-Za-z0-9_]+$/.test(name));
  });
  if (!hasSupportedMapping) {
    throw new Error('در قالب هیچ Named Range معتبر PMS پیدا نشد. ابتدا نگاشت سلول‌ها را تعریف کنید.');
  }

  var sourceFile = DriveApp.getFileById(source.getId());
  var parents = sourceFile.getParents();
  var folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var projectLabel = String(project.ProjectCode || project.Title || projectId)
    .replace(/[\\/:*?"<>|#%{}~&]/g, '-').slice(0, 80);
  var copyName = source.getName() + ' - ' + projectLabel;
  var copyFile = sourceFile.makeCopy(copyName, folder);
  var target = SpreadsheetApp.openById(copyFile.getId());

  var values = {
    PMS_PROJECT_ID: project.ID || projectId,
    PMS_PROJECT_CODE: project.ProjectCode || '',
    PMS_PROJECT_TITLE: project.Title || '',
    PMS_PROJECT_DESCRIPTION: project.Description || '',
    PMS_PROJECT_STATUS: project.Status || '',
    PMS_PROJECT_QUANTITY: project.Quantity === undefined ? '' : project.Quantity,
    PMS_PROJECT_CREATED_AT: project.CreatedAt || '',
    PMS_PROJECT_UPDATED_AT: project.UpdatedAt || ''
  };

  infoRows.forEach(function(row) {
    var raw = row.ValueJSON !== undefined ? row.ValueJSON : row.Value;
    var value = raw;
    if (typeof raw === 'string') {
      try { value = JSON.parse(raw); } catch (ignore) {}
    }
    if (value !== null && typeof value === 'object') return;
    var id = String(row.InformationTypeID || '');
    var code = String(row.Code || row.InformationTypeCode || '');
    if (id) values['PMS_INFO_' + id] = value === undefined ? '' : value;
    if (code) values['PMS_INFO_' + code.replace(/[^A-Za-z0-9_]/g, '_')] = value === undefined ? '' : value;
  });

  var written = [];
  var skipped = [];
  target.getNamedRanges().forEach(function(namedRange) {
    var name = namedRange.getName();
    if (name.indexOf('PMS_') !== 0) return;
    var range = namedRange.getRange();
    if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) {
      skipped.push(name + ': محدوده باید فقط یک سلول باشد.');
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      skipped.push(name + ': داده متناظر در PMS پیدا نشد.');
      return;
    }
    range.setValue(values[name] === null ? '' : values[name]);
    written.push(name);
  });

  SpreadsheetApp.flush();
  return {
    url: copyFile.getUrl(),
    name: copyName,
    written: written,
    skipped: skipped,
    message: 'نسخه مستقل قالب ساخته شد؛ فایل اصلی بدون تغییر باقی ماند.'
  };
}

function pmsRequireToken_() {
  var token = PropertiesService.getUserProperties().getProperty('PMS_SESSION_TOKEN');
  if (!token) throw new Error('ابتدا با حساب PMS وارد شوید.');
  return token;
}

function pmsApiRequest_(method, path, body, token) {
  var baseUrl = 'https://script.google.com/macros/s/AKfycbwxuzgcxw6fIGxWzeSwExvCIlrCXSTCq8y5sb2rtF7yPNhuC5XWbdJzesc2plXh_CB2/exec';
  var query = 'path=' + encodeURIComponent(path);
  if (token && method === 'GET') query += '&token=' + encodeURIComponent(token);
  var options = {
    method: method.toLowerCase(),
    contentType: 'application/json',
    muteHttpExceptions: true,
    followRedirects: true
  };
  if (body !== null && body !== undefined) {
    if (token && method !== 'GET') body.token = token;
    options.payload = JSON.stringify(body);
  }
  var response = UrlFetchApp.fetch(baseUrl + '?' + query, options);
  var status = response.getResponseCode();
  var text = response.getContentText();
  var parsed;
  try { parsed = JSON.parse(text); } catch (error) {
    throw new Error('پاسخ PMS قابل خواندن نیست. کد پاسخ: ' + status);
  }
  if (status < 200 || status >= 300 || parsed.success === false) {
    var message = parsed && parsed.error && parsed.error.message
      ? parsed.error.message : 'ارتباط با PMS ناموفق بود.';
    throw new Error(message);
  }
  return parsed && parsed.success === true && Object.prototype.hasOwnProperty.call(parsed, 'data')
    ? parsed.data : parsed;
}
