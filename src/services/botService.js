const { Telegraf, Markup } = require('telegraf');
const { getOptionalEnv, APP_BASE_URL } = require('../config/env');
const { initSheets } = require('./sheetsService');
const { extractInvoiceData } = require('./groqVisionService');

const BOT_TOKEN = getOptionalEnv('INVOICE_BOT_TOKEN', '');
const SCANNER_URL = `${APP_BASE_URL}/scanner?v=20260601`;

const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

if (bot) {
  bot.start(async (ctx) => {
    await ctx.reply(
      '👋 <b>Бот обліку накладних</b>\n\n'
      + 'Я допомагаю обліковувати алкоголь за акцизними марками.\n\n'
      + 'Надішліть фото накладної або натисніть кнопку нижче 👇',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('📱 Відкрити панель керування', SCANNER_URL)]
        ])
      }
    );
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text === '/start') return bot.start(ctx);
    await ctx.reply(
      'Надішліть фото накладної або натисніть кнопку нижче 👇',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('📱 Відкрити панель керування', SCANNER_URL)]
        ])
      }
    );
  });

  bot.on('photo', async (ctx) => {
    try {
      const photos = ctx.message.photo;
      const fileId = photos[photos.length - 1].file_id;
      const link = await ctx.telegram.getFileLink(fileId);
      const resp = await fetch(link.href);
      if (!resp.ok) throw new Error('Failed to download photo');
      const buf = Buffer.from(await resp.arrayBuffer());

      const statusMsg = await ctx.reply('🔄 <b>Обробляю фото...</b>\nРозпізнаю накладну через AI...', { parse_mode: 'HTML' });

      const data = await extractInvoiceData(buf);
      const items = data.items || [];
      if (!items.length) {
        await ctx.telegram.editMessageText(
          ctx.chat.id, statusMsg.message_id, null,
          '❌ <b>Не вдалося розпізнати позиції</b>\n\nСпробуйте ще раз або введіть дані вручну через панель керування.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      let msg = `✅ <b>Накладну розпізнано!</b>\n\n`
        + `<b>Постачальник:</b> ${escHtml(data.supplier || '—')}\n`
        + `<b>Заклад:</b> ${escHtml(data.venue || '—')}\n`
        + `<b>№ накладної:</b> ${escHtml(data.invoice_number || '—')}\n\n`
        + `<b>Позиції (${items.length}):</b>\n`;
      for (const item of items.slice(0, 15)) {
        msg += `• ${escHtml(item.name)} — ${item.quantity} ${escHtml(item.unit || 'шт')}\n`;
      }
      if (items.length > 15) msg += `...та ще ${items.length - 15}\n`;

      await ctx.telegram.editMessageText(
          ctx.chat.id, statusMsg.message_id, null,
          msg,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
            [Markup.button.webApp('📱 Продовжити в панелі керування', SCANNER_URL)]
          ])
        }
      );
    } catch (err) {
      console.error('[invoice-bot] photo error:', err.message);
      await ctx.reply('❌ <b>Помилка обробки фото</b>\n\n' + escHtml(err.message), { parse_mode: 'HTML' }).catch(() => {});
    }
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function setupBotWebhook(app) {
  if (!bot) {
    console.log('[invoice-bot] disabled — INVOICE_BOT_TOKEN not set');
    return;
  }

  try {
    await initSheets();
  } catch (e) {
    console.warn('[invoice-bot] sheets init failed:', e.message);
  }

  const webhookPath = `/webhooks/invoice-bot`;
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
