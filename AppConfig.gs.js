const AppConfig = {
  APP_NAME: 'Production Management System',
  VERSION: '1.0.0',
  ENVIRONMENT: 'PRODUCTION',
  PERFORMANCE_LOG_TO_CONSOLE: false,
  DATABASE: { SPREADSHEET_ID: '' },
  API: { DEFAULT_PAGE: 1, DEFAULT_PAGE_SIZE: 20, MAX_PAGE_SIZE: 100 },
  AUTH: { SESSION_DURATION_HOURS: 0 },
  FILES: {
    MAX_SIZE_MB: 10,
    // Shared destination for new project and event attachments.
    GOOGLE_DRIVE_FOLDER_ID: '1E-nYv5GF8wPn9diOZlfiGXnWQH-2WSmB',
    ALLOWED_MIME_TYPES: [
      'image/jpeg','image/png','image/webp','image/gif','application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  }
};

function getConfiguredDatabaseSpreadsheetId_() {
  const propertyId = PropertiesService.getScriptProperties().getProperty('PMS_DATABASE_SPREADSHEET_ID');
  const configuredId = propertyId || AppConfig.DATABASE.SPREADSHEET_ID || '';
  if (AppConfig.ENVIRONMENT === 'PRODUCTION' && !String(configuredId).trim()) {
    throw new Error('شناسه دیتابیس نسخه عملیاتی در Script Properties تنظیم نشده است.');
  }
  return String(configuredId).trim();
}
