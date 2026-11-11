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
 * Interactive one-time setup for the dedicated Production Telegram bot.
 * Run this function from the Apps Script editor; the token is entered in a prompt,
 * validated against Telegram, then stored in Script Properties automatically.
 */
function runTelegramBotSetup() {
  const token = Browser.inputBox(
    'اتصال ربات تلگرام نسخه عملیاتی',
    'توکن ربات @PRS_Production_Notifications_Bot را از BotFather وارد کنید. توکن در کد یا گزارش اجرا نمایش داده نمی‌شود.',
    Browser.Buttons.OK_CANCEL
  );
  if (String(token).toLowerCase() === 'cancel') return { ok: false, cancelled: true };
  const result = TelegramBotService.configureBotToken(token);
  Browser.msgBox('اتصال اولیه ربات با موفقیت تنظیم شد. اکنون در تلگرام به @PRS_Production_Notifications_Bot پیام /start بدهید.');
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
 * Telegram tenant/chat registration is intentionally not preconfigured in Production.
 * Configure a production-specific tenant and chat only after Telegram credentials are added.
 */
