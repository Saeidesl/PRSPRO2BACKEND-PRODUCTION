function doGet(e) {
  return webAppDoGet(e);
}

function doPost(e) {
  // Telegram posts are separated from the PMS JSON API by a secret query parameter.
  // All other requests continue through the existing API router unchanged.
  if (e && e.parameter && e.parameter.telegramSecret !== undefined) {
    return TelegramBotService.handleWebhook(e);
  }
  return webAppDoPost(e);
}

/**
 * Configure reliable Telegram polling. This replaces inbound webhooks because
 * Google Apps Script's anonymous POST endpoint can currently return HTTP 401
 * before doPost executes.
 */
function runTelegramWebhookSetup() {
  return TelegramBotService.setupPolling();
}

/**
 * Start a secure 10-minute pairing window for the only active tenant.
 * Run this once, then send /start to the bot from the intended private chat.
 * The chat ID and TenantID are discovered and linked automatically.
 */
function runTelegramTenantRegistration() {
  const result = TelegramBotService.armTenantRegistration();
  Logger.log(
    'اتصال برای «' + result.tenantName + '» تا ' + result.expiresInMinutes +
    ' دقیقه فعال شد. اکنون از گفت‌وگوی خصوصی موردنظر /start را ارسال کنید.'
  );
  return result;
}

/** Poll Telegram updates. Also invoked automatically by a one-minute trigger. */
function runTelegramPolling() {
  return TelegramBotService.pollUpdates();
}

/** Inspect Telegram webhook status (polling mode normally reports no webhook). */
function runTelegramWebhookInfo() {
  return TelegramBotService.getWebhookInfo();
}

/**
 * Production tenant/chat mapping is created through the one-time
 * runTelegramTenantRegistration pairing flow; no TenantID or chat ID is hardcoded.
 */
