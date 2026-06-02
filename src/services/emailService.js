const nodemailer = require('nodemailer');
const { generateTicketPdf } = require('./ticketPdfService');

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

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function buildTicketHtml({ ticketCode, customerName, customerPhone, reservationDate, timeFrom, timeTo, guests, tableName, zoneName, qrDataUrl, status, paymentStatus }) {
  const dateStr = formatDate(reservationDate);
  const fromStr = formatTime(timeFrom);
  const toStr = formatTime(timeTo);
  const isPaid = paymentStatus === 'PAID' || status === 'PAID';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:2px solid #c89241;">
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              <h1 style="color:#5c3a1e;margin:0;font-size:28px;font-weight:700;">ГоРПляж</h1>
              <p style="color:#c89241;margin:4px 0 0;font-size:13px;letter-spacing:1px;">BEACH RESORT</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;text-align:center;">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" width="160" height="160" style="border-radius:12px;border:2px solid #e8dcc8;" />` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;text-align:center;">
              <div style="font-size:26px;font-weight:700;color:#c89241;letter-spacing:3px;font-family:monospace;">${ticketCode}</div>
              <div style="font-size:11px;color:#999999;margin-top:4px;">Код квитка</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;">
              <div style="background:#faf8f4;border-radius:12px;padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${[
                    ['Гість', customerName],
                    ['Телефон', customerPhone],
                    ['Стіл', tableName || '—'],
                    ['Зона', zoneName || '—'],
                    ['Гостей', String(guests)],
                    ['Дата', dateStr],
                    ['Час', `${fromStr} — ${toStr}`],
                    ['Статус оплати', isPaid ? 'Оплачено ✅' : 'Очікує оплати']
                  ].map(([label, value]) => `
                    <tr>
                      <td style="padding:4px 12px;color:#888888;font-size:13px;white-space:nowrap;width:110px;">${label}</td>
                      <td style="padding:4px 12px;color:#5c3a1e;font-size:14px;font-weight:600;">${value}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;">
              <hr style="border:none;border-top:1px solid #e8dcc8;margin:0 0 16px;" />
              <p style="font-size:12px;color:#aaaaaa;text-align:center;line-height:1.5;margin:0;">
                Пред'явіть цей квиток на вході (у паперовому або електронному вигляді).<br>
                Для підтвердження достатньо назвати код квитка або показати QR-код.
              </p>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#bbbbbb;margin-top:16px;">ГоРПляж Beach Resort • От raда, Одеса • https://gorpliaj.fly.dev</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendTicketEmail({ to, ticketCode, customerName, customerPhone, reservationDate, timeFrom, timeTo, guests, tableName, zoneName, qrDataUrl, verifyUrl, status, paymentStatus }) {
  if (!isMailConfigured()) {
    console.log(`[mail] Not configured. Would send ticket ${ticketCode} to ${to}`);
    return { sent: false, reason: 'mail_not_configured' };
  }

  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: 'mail_transport_failed' };
  }

  const html = buildTicketHtml({
    ticketCode, customerName, customerPhone, reservationDate, timeFrom, timeTo, guests, tableName, zoneName, qrDataUrl, status, paymentStatus
  });

  const attachments = [];

  try {
    const pdfBuffer = await generateTicketPdf({
      ticketCode, customerName, customerPhone, guests, reservationDate, timeFrom, timeTo, tableName, zoneName, status, paymentStatus, verifyUrl
    });
    attachments.push({
      filename: `gorpliaj-ticket-${ticketCode.toLowerCase()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });
  } catch (pdfError) {
    console.error(`[mail] Failed to generate PDF for ticket ${ticketCode}:`, pdfError.message);
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject: `ГоРПляж — ваш квиток #${ticketCode}`,
      html,
      attachments
    });

    console.log(`[mail] Ticket ${ticketCode} sent to ${to}${attachments.length ? ' with PDF' : ' (no PDF)'}`);
    return { sent: true };
  } catch (error) {
    console.error(`[mail] Failed to send ticket ${ticketCode} to ${to}:`, error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { isMailConfigured, sendTicketEmail, buildTicketHtml };
