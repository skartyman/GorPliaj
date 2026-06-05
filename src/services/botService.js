const { Telegraf, Markup } = require('telegraf');
const { getOptionalEnv, APP_BASE_URL } = require('../config/env');
const { initSheets } = require('./sheetsService');
const { extractInvoiceData } = require('./groqVisionService');

const BOT_TOKEN = getOptionalEnv('INVOICE_BOT_TOKEN', '');
const SCANNER_URL = `${APP_BASE_URL}/scanner?v=20260605`;
const IMAGE_DOCUMENT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

function scannerKeyboard(label = 'Открыть панель сканирования') {
  return Markup.inlineKeyboard([
    [Markup.button.webApp(`📱 ${label}`, SCANNER_URL)]
  ]);
}

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function downloadTelegramFile(ctx, fileId) {
  const link = await ctx.telegram.getFileLink(fileId);
  const resp = await fetch(link.href);
  if (!resp.ok) throw new Error(`Не удалось скачать файл из Telegram (${resp.status}).`);
  return Buffer.from(await resp.arrayBuffer());
}

function getInvoiceResultMessage(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  let msg = `✅ <b>Накладная распознана</b>\n\n`
    + `<b>Поставщик:</b> ${escHtml(data.supplier || '—')}\n`
    + `<b>Заклад:</b> ${escHtml(data.venue || '—')}\n`
    + `<b>№ накладной:</b> ${escHtml(data.invoice_number || '—')}\n\n`
    + `<b>Позиции (${items.length}):</b>\n`;

  for (const item of items.slice(0, 20)) {
    msg += `• ${escHtml(item.name)} — ${escHtml(item.quantity)} ${escHtml(item.unit || 'шт')}\n`;
  }

  if (items.length > 20) {
    msg += `...и ещё ${items.length - 20}\n`;
  }

  return msg;
}

async function processInvoiceImage(ctx, buffer) {
  const statusMsg = await ctx.reply(
    '🔄 <b>Обрабатываю накладную...</b>\nРаспознаю фото через AI. Это может занять до минуты.',
    { parse_mode: 'HTML' }
  );

  const data = await extractInvoiceData(buffer);
  const items = Array.isArray(data.items) ? data.items : [];

  if (!items.length) {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      null,
      `❌ <b>Не удалось распознать позиции</b>\n\n${escHtml(data.error || 'Товарные строки не найдены. Попробуйте фото крупнее, ровнее и без бликов.')}`,
      {
        parse_mode: 'HTML',
        ...scannerKeyboard('Ввести вручную')
      }
    );
    return;
  }

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    statusMsg.message_id,
    null,
    getInvoiceResultMessage(data),
    {
      parse_mode: 'HTML',
      ...scannerKeyboard('Продолжить в панели')
    }
  );
}

async function sendWelcome(ctx) {
  await ctx.reply(
    '👋 <b>Бот учёта накладных</b>\n\n'
    + 'Отправьте фото накладной на алкоголь или изображение-файл. Я распознаю позиции и количество.\n\n'
    + 'Если фото не читается, откройте панель и введите данные вручную.',
    {
      parse_mode: 'HTML',
      ...scannerKeyboard()
    }
  );
}

if (bot) {
  bot.start(async (ctx) => {
    await sendWelcome(ctx);
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text === '/start') return sendWelcome(ctx);
    await ctx.reply(
      'Отправьте фото накладной или изображение-файл. PDF пока не распознаю напрямую.',
      {
        parse_mode: 'HTML',
        ...scannerKeyboard()
      }
    );
  });

  bot.on('photo', async (ctx) => {
    try {
      const photos = ctx.message.photo || [];
      const fileId = photos[photos.length - 1]?.file_id;
      if (!fileId) throw new Error('Фото не найдено в сообщении.');

      const buffer = await downloadTelegramFile(ctx, fileId);
      await processInvoiceImage(ctx, buffer);
    } catch (err) {
      console.error('[invoice-bot] photo error:', err);
      await ctx.reply(`❌ <b>Ошибка обработки фото</b>\n\n${escHtml(err.message)}`, {
        parse_mode: 'HTML',
        ...scannerKeyboard('Открыть панель')
      }).catch(() => {});
    }
  });

  bot.on('document', async (ctx) => {
    try {
      const document = ctx.message.document;
      if (!IMAGE_DOCUMENT_MIME_TYPES.has(document?.mime_type)) {
        await ctx.reply(
          'Пока распознаю только изображения JPG/PNG/WebP. Если это PDF, сделайте фото накладной или скрин страницы.',
          {
            parse_mode: 'HTML',
            ...scannerKeyboard()
          }
        );
        return;
      }

      const buffer = await downloadTelegramFile(ctx, document.file_id);
      await processInvoiceImage(ctx, buffer);
    } catch (err) {
      console.error('[invoice-bot] document error:', err);
      await ctx.reply(`❌ <b>Ошибка обработки файла</b>\n\n${escHtml(err.message)}`, {
        parse_mode: 'HTML',
        ...scannerKeyboard('Открыть панель')
      }).catch(() => {});
    }
  });
}

async function setupBotWebhook(app) {
  if (!bot) {
    console.log('[invoice-bot] disabled - INVOICE_BOT_TOKEN not set');
    return;
  }

  try {
    await initSheets();
  } catch (e) {
    console.warn('[invoice-bot] sheets init failed:', e.message);
  }

  const webhookPath = '/webhooks/invoice-bot';
  const webhookUrl = `${APP_BASE_URL}${webhookPath}`;

  app.post(webhookPath, bot.webhookCallback(webhookPath));

  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`[invoice-bot] webhook set to ${webhookUrl}`);
  } catch (err) {
    console.error('[invoice-bot] webhook registration failed:', err.message);
  }
}

module.exports = { setupBotWebhook, bot };
