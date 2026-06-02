const nodemailer = require('nodemailer');

function isMailConfigured() {
  return !!(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
}

function createTransport() {
  if (!isMailConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

function buildTicketHtml({ ticketCode, customerName, reservationDate, timeFrom, timeTo, guests, tableName, qrDataUrl, status }) {
  const dateStr = new Date(reservationDate).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const fromStr = new Date(timeFrom).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const toStr = new Date(timeTo).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  const statusText = status === 'PAID' ? 'Оплачено ✅' : 'Очікує оплати';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f0e8;">
  <div style="background: white; border-radius: 16px; padding: 32px; border: 2px solid #c89241;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #5c3a1e; margin: 0; font-size: 28px;">ГоРПляж</h1>
      <p style="color: #c89241; margin: 4px 0 0; font-size: 14px;">BEACH RESORT</p>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR-код" style="width: 180px; height: 180px; border-radius: 12px; border: 2px solid #e8dcc8;" />` : ''}
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 22px; font-weight: 700; color: #5c3a1e; letter-spacing: 2px;">${ticketCode}</div>
      <div style="font-size: 13px; color: #999; margin-top: 4px;">Код квитка</div>
    </div>

    <div style="font-size: 16px; color: #5c3a1e; line-height: 2;">
      <div><strong>Гість:</strong> ${customerName}</div>
      <div><strong>Стіл/Місце:</strong> ${tableName || '—'}</div>
      <div><strong>Гостей:</strong> ${guests}</div>
      <div><strong>Дата:</strong> ${dateStr}</div>
      <div><strong>Час:</strong> ${fromStr} — ${toStr}</div>
      <div><strong>Статус:</strong> <span style="color: ${status === 'PAID' ? '#16a34a' : '#d97706'}">${statusText}</span></div>
    </div>

    <hr style="border: none; border-top: 1px solid #e8dcc8; margin: 24px 0;" />

    <p style="font-size: 13px; color: #888; text-align: center;">
      Пред'явіть цей квиток на вході. Для підтвердження броні достатньо назвати код квитка.
    </p>
  </div>
</body>
</html>`;
}

async function sendTicketEmail({ to, ticketCode, customerName, reservationDate, timeFrom, timeTo, guests, tableName, qrDataUrl, status }) {
  if (!isMailConfigured()) {
    console.log(`[mail] Not configured. Would send ticket ${ticketCode} to ${to}`);
    return { sent: false, reason: 'mail_not_configured' };
  }

  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: 'mail_transport_failed' };
  }

  const html = buildTicketHtml({
    ticketCode, customerName, reservationDate, timeFrom, timeTo, guests, tableName, qrDataUrl, status
  });

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject: `ГоРПляж — ваш квиток #${ticketCode}`,
      html
    });

    console.log(`[mail] Ticket ${ticketCode} sent to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error(`[mail] Failed to send ticket ${ticketCode} to ${to}:`, error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { isMailConfigured, sendTicketEmail, buildTicketHtml };
