const { Telegraf } = require('telegraf');
const { getOptionalEnv } = require('../config/env');

const WAITER_BOT_TOKEN = getOptionalEnv('WAITER_BOT_TOKEN', '');
const bot = WAITER_BOT_TOKEN ? new Telegraf(WAITER_BOT_TOKEN) : null;

if (!WAITER_BOT_TOKEN) {
  console.warn('WAITER_BOT_TOKEN not set. Waiter Telegram notifications are disabled.');
}

function getBot() {
  return bot;
}

async function notifyWaiterNewOrder(waiter, order, tableId) {
  if (!bot || !waiter.telegramChatId) return;
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

  try {
    await bot.telegram.sendMessage(waiter.telegramChatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Прийняти', callback_data: `order_accept:${order.id}` }]
        ]
      }
    });
  } catch (err) {
    console.error('Waiter Telegram notify error:', err.message);
  }
}

async function notifyWaiterNewCall(waiter, tableId, customerName) {
  if (!bot || !waiter.telegramChatId) return;

  const text = [
    `📞 Гість викликає офіціанта!`,
    `📍 Стіл: ${tableId}`,
    customerName ? `👤 ${customerName}` : ''
  ].filter(Boolean).join('\n');

  try {
    await bot.telegram.sendMessage(waiter.telegramChatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Прийняти', callback_data: `call_respond:${waiter.id}` }]
        ]
      }
    });
  } catch (err) {
    console.error('Waiter Telegram call notify error:', err.message);
  }
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

  bot.action(/order_accept:(\d+)/, async (ctx) => {
    const orderId = parseInt(ctx.match[1], 10);
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
  notifyWaiterNewOrder,
  notifyWaiterNewCall,
  setupWaiterBotWebhook
};
