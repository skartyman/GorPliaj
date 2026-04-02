const { TELEGRAM_BOT_TOKEN, TELEGRAM_MANAGER_CHAT_ID } = process.env;

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    return;
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  });
}

class TelegramNotifierService {
  async notifyCreated({ client, equipment, request }) {
    const managerText = [
      '🛠 <b>Новая сервисная заявка</b>',
      '',
      `<b>Client:</b> ${client?.name || request.clientId}`,
      `<b>Phone:</b> ${client?.phone || '—'}`,
      `<b>Equipment:</b> ${equipment.name}`,
      `<b>Internal/Serial:</b> ${equipment.internalNumber} / ${equipment.serialNumber}`,
      `<b>Category:</b> ${request.category}`,
      `<b>Urgency:</b> ${request.urgency}`,
      `<b>Can operate now:</b> ${request.canOperateNow ? 'Yes' : 'No'}`,
      `<b>Description:</b> ${request.description}`,
      `<b>Attachments count:</b> ${request.attachments.length}`,
      `<b>Request ID:</b> <code>${request.id}</code>`
    ].join('\n');

    const clientText = [
      '✅ <b>Заявка создана</b>',
      `Номер: <code>${request.id}</code>`,
      `Статус: ${request.status}`,
      'Мы свяжемся с вами после триажа.'
    ].join('\n');

    await Promise.all([
      sendTelegramMessage(TELEGRAM_MANAGER_CHAT_ID, managerText),
      sendTelegramMessage(client?.managerChatId, clientText)
    ]);
  }

  async notifyStatusChanged({ request }) {
    return sendTelegramMessage(
      TELEGRAM_MANAGER_CHAT_ID,
      `ℹ️ Статус заявки <code>${request.id}</code> обновлен: <b>${request.status}</b>`
    );
  }
}

module.exports = { TelegramNotifierService };
