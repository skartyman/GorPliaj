const { Telegraf } = require('telegraf');
const { getOptionalEnv } = require('../config/env');
const waiterService = require('./waiterService');

const WAITER_BOT_TOKEN = getOptionalEnv('WAITER_BOT_TOKEN', '');
const WAITER_ADMIN_CHAT_ID = getOptionalEnv('WAITER_ADMIN_CHAT_ID', '');
const bot = WAITER_BOT_TOKEN ? new Telegraf(WAITER_BOT_TOKEN) : null;
let botUsernamePromise = null;

if (!WAITER_BOT_TOKEN) {
  console.warn('WAITER_BOT_TOKEN not set. Waiter Telegram notifications are disabled.');
}

function getBot() {
  return bot;
}

async function sendTelegramMessage(chatId, text, options = {}, logLabel = 'Telegram notify') {
  if (!bot || !chatId) return;
  try {
    await bot.telegram.sendMessage(chatId, text, options);
  } catch (err) {
    console.error(`${logLabel} error:`, err.message);
  }
}

async function getWaiterBotLink(startToken) {
  if (!bot) return null;
  if (!botUsernamePromise) {
    botUsernamePromise = bot.telegram.getMe().then((me) => me.username);
  }
  const username = await botUsernamePromise;
  if (!username) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(startToken)}`;
}

async function notifyWaiterNewOrder(waiter, order, tableId) {
  if (!bot) return;
  const itemsText = order.items
    .map(i => `  ${i.quantity}x ${i.name || `#${i.menuItemId}`}`)
    .join('\n');

  const text = [
    `🔔 Нове замовлення #${order.id}`,
    `📍 Стіл: ${tableId}`,
    order.customerName ? `👤 ${order.customerName}` : '',
    order.customerPhone ? `📞 ${order.customerPhone}` : '',
    '',
    itemsText,
    order.notes ? `\n💬 ${order.notes}` : ''
  ].filter(Boolean).join('\n');

  await Promise.all([
    sendTelegramMessage(waiter.telegramChatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Прийняти', callback_data: `order_accept:${order.id}` }]
        ]
      }
    }, 'Waiter Telegram order notify'),
    sendTelegramMessage(
      WAITER_ADMIN_CHAT_ID,
      [`👀 Адмін-дубль`, waiter?.name ? `👤 Офіціант: ${waiter.name}` : '', text].filter(Boolean).join('\n'),
      {},
      'Admin Telegram order notify'
    )
  ]);
}

async function notifyWaiterNewCall(waiter, tableId, customerName) {
  if (!bot) return;

  const text = [
    `📞 Гість викликає офіціанта!`,
    `📍 Стіл: ${tableId}`,
    customerName ? `👤 ${customerName}` : ''
  ].filter(Boolean).join('\n');

  await Promise.all([
    sendTelegramMessage(waiter.telegramChatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Прийняти', callback_data: `call_respond:${waiter.id}` }]
        ]
      }
    }, 'Waiter Telegram call notify'),
    sendTelegramMessage(
      WAITER_ADMIN_CHAT_ID,
      [`👀 Адмін-дубль`, waiter?.name ? `👤 Офіціант: ${waiter.name}` : '', text].filter(Boolean).join('\n'),
      {},
      'Admin Telegram call notify'
    )
  ]);
}

function setupWaiterBotWebhook(app) {
  if (!bot) return;

  app.use('/webhooks/waiter-bot', (req, res) => {
    bot.handleUpdate(req.body, res);
  });

  const { APP_BASE_URL } = require('../config/env');
  if (APP_BASE_URL) {
    setTimeout(async () => {
      try {
        await bot.telegram.setWebhook(`${APP_BASE_URL}/webhooks/waiter-bot`);
        console.log('Waiter bot webhook set.');
      } catch (err) {
        console.error('Failed to set waiter bot webhook:', err.message);
      }
    }, 1000);
  }

  bot.start(async (ctx) => {
    const payload = ctx.startPayload || String(ctx.message?.text || '').split(/\s+/)[1] || '';
    const verified = waiterService.verifyTelegramLinkToken(payload);
    if (!verified) {
      await ctx.reply('Посилання недійсне або застаріло. Відкрийте кабінет офіціанта і натисніть "Додати Telegram" ще раз.');
      return;
    }

    try {
      const waiter = await waiterService.setWaiterTelegramChatId(verified.waiterId, ctx.chat.id);
      await ctx.reply(`✅ Telegram підключено для офіціанта ${waiter.name}. Нові замовлення і виклики будуть приходити сюди.`);
    } catch (err) {
      console.error('Waiter Telegram link error:', err.message);
      await ctx.reply('Не вдалося підключити Telegram. Спробуйте ще раз з кабінету офіціанта.');
    }
  });

  bot.action(/order_accept:(\d+)/, async (ctx) => {
    const orderId = parseInt(ctx.match[1], 10);
    try {
      const waiter = await waiterService.getWaiterByTelegramChatId(ctx.from?.id || ctx.chat?.id);
      if (!waiter) {
        await ctx.answerCbQuery('\u0422elegram \u043d\u0435 \u043f\u0456\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043e \u0434\u043e \u043e\u0444\u0456\u0446\u0456\u0430\u043d\u0442\u0430', { show_alert: true });
        return;
      }

      const tableOrderService = require('./tableOrderService');
      await tableOrderService.acceptOrder(orderId, waiter.id);
      await ctx.answerCbQuery(`\u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f #${orderId} \u043f\u0440\u0438\u0439\u043d\u044f\u0442\u043e`);
      await ctx.editMessageText(`\u2705 \u0417\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f #${orderId} \u043f\u0440\u0438\u0439\u043d\u044f\u0442\u043e`);
    } catch (err) {
      console.error('Waiter Telegram order accept error:', err.message);
      await ctx.answerCbQuery('\u041d\u0435 \u0432\u0434\u0430\u043b\u043e\u0441\u044f \u043f\u0440\u0438\u0439\u043d\u044f\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f', { show_alert: true });
    }
    return;
    await ctx.answerCbQuery(`Замовлення #${orderId} прийнято`);
    await ctx.editMessageText(`✅ Замовлення #${orderId} прийнято`);
  });

  bot.action(/call_respond:(\d+)/, async (ctx) => {
    const waiterId = parseInt(ctx.match[1], 10);
    await ctx.answerCbQuery('Виклик прийнято');
    await ctx.editMessageText('✅ Виклик прийнято — ви йдете до гостя');
  });
}

module.exports = {
  getBot,
  getWaiterBotLink,
  notifyWaiterNewOrder,
  notifyWaiterNewCall,
  setupWaiterBotWebhook
};
