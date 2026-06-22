const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { generateTicketPdf } = require('./ticketPdfService');
const {
  getBaseUrl,
  escapeHtml,
  localizedText,
  formatDate,
  formatTime,
  formatMoney
} = require('../utils/deliveryPresentation');

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

function renderFactRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;color:#8a745f;font-size:13px;vertical-align:top;width:132px;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#2f2219;font-size:14px;font-weight:600;">${escapeHtml(value || '—')}</td>
    </tr>
  `;
}

function buildTicketHtml({
  ticketCode,
  customerName,
  customerPhone,
  reservationDate,
  timeFrom,
  timeTo,
  guests,
  tableName,
  zoneName,
  eventTitle,
  depositAmount,
  totalPaid,
  entryTicketsAmount,
  qrDataUrl,
  depositQrDataUrl,
  status,
  paymentStatus,
  statusUrl,
  downloadUrl
}) {
  const isPaid = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';
  const hasDeposit = Number(depositAmount || 0) > 0;
  const hasEntry = Number(entryTicketsAmount || 0) > 0;
  const appBaseUrl = getBaseUrl();

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GorPliaj Booking</title>
</head>
<body style="margin:0;padding:0;background:#f4ede2;font-family:Arial,Helvetica,sans-serif;color:#2f2219;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede2;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffdf9;border-radius:28px;overflow:hidden;box-shadow:0 16px 40px rgba(76,52,31,0.12);">
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,#3f2416 0%,#6d4328 55%,#c89241 100%);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 34px 26px;">
                    <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#f7e8cf;opacity:0.92;">GorPliaj</div>
                    <div style="font-size:32px;line-height:1.15;font-weight:700;color:#ffffff;margin-top:10px;">Ваше бронювання підтверджено</div>
                    <div style="font-size:15px;line-height:1.6;color:#f6e8d8;margin-top:12px;">
                      Показуйте цей лист або PDF на вході. Депозит вже зафіксований у бронюванні та зараховується у фінальний рахунок закладу.
                    </div>
                    <div style="margin-top:22px;display:inline-block;padding:12px 18px;border-radius:16px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.18);color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.12em;">
                      ${escapeHtml(ticketCode)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 34px 10px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 18px;">
                    <div style="background:#fbf6ef;border:1px solid #eadbca;border-radius:22px;padding:22px 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        ${renderFactRow('Гість', customerName)}
                        ${renderFactRow('Телефон', customerPhone || '—')}
                        ${renderFactRow('Позиція', localizedText(tableName) || '—')}
                        ${renderFactRow('Зона', localizedText(zoneName) || '—')}
                        ${eventTitle ? renderFactRow('Подія', localizedText(eventTitle)) : ''}
                        ${renderFactRow('Дата', formatDate(reservationDate))}
                        ${renderFactRow('Час', `${formatTime(timeFrom)} - ${formatTime(timeTo)}`)}
                        ${renderFactRow('Гостей', String(guests))}
                        ${renderFactRow('Статус оплати', isPaid ? 'Оплачено' : 'Очікує оплати')}
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;padding-right:8px;vertical-align:top;">
                          <div style="background:#3f2416;border-radius:22px;padding:20px 22px;min-height:126px;">
                            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#d8bf9e;">Депозит</div>
                            <div style="font-size:28px;font-weight:700;color:#ffffff;margin-top:10px;">${formatMoney(depositAmount || 0)}</div>
                            <div style="font-size:13px;line-height:1.6;color:#f0dfcf;margin-top:10px;">${hasDeposit ? 'Зараховується у фінальний рахунок.' : 'Для цієї позиції депозит не встановлено.'}</div>
                          </div>
                        </td>
                        <td style="width:50%;padding-left:8px;vertical-align:top;">
                          <div style="background:#f5efe6;border-radius:22px;padding:20px 22px;min-height:126px;">
                            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8f6a44;">Онлайн-оплата</div>
                            <div style="font-size:28px;font-weight:700;color:#402719;margin-top:10px;">${formatMoney(totalPaid || 0)}</div>
                            <div style="font-size:13px;line-height:1.6;color:#6d5948;margin-top:10px;">${hasEntry ? `Включно з вхідними квитками: ${formatMoney(entryTicketsAmount || 0)}.` : 'Без додаткових вхідних квитків.'}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;padding-right:8px;vertical-align:top;text-align:center;">
                          <div style="background:#fff;border:1px solid #eadbca;border-radius:22px;padding:18px 18px 14px;">
                            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR вхід" width="146" height="146" style="display:block;margin:0 auto;border-radius:16px;" />` : ''}
                            <div style="font-size:14px;font-weight:700;color:#2f2219;margin-top:14px;">QR для входу</div>
                            <div style="font-size:12px;line-height:1.5;color:#8a745f;margin-top:6px;">Скан для перевірки бронювання, гостей та статусу.</div>
                          </div>
                        </td>
                        <td style="width:50%;padding-left:8px;vertical-align:top;text-align:center;">
                          <div style="background:#fff;border:1px solid #eadbca;border-radius:22px;padding:18px 18px 14px;">
                            ${depositQrDataUrl ? `<img src="${depositQrDataUrl}" alt="QR депозит" width="146" height="146" style="display:block;margin:0 auto;border-radius:16px;" />` : ''}
                            <div style="font-size:14px;font-weight:700;color:#2f2219;margin-top:14px;">QR депозиту</div>
                            <div style="font-size:12px;line-height:1.5;color:#8a745f;margin-top:6px;">Окремий QR для підтвердження суми депозиту та факту оплати.</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0 4px;">
                    ${downloadUrl ? `<a href="${escapeHtml(downloadUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#402719;color:#fff;text-decoration:none;font-weight:700;margin-right:10px;">Завантажити PDF</a>` : ''}
                    ${statusUrl ? `<a href="${escapeHtml(statusUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#f4ede2;color:#402719;text-decoration:none;font-weight:700;border:1px solid #ddc8ae;">Перевірити статус бронювання</a>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 34px 28px;color:#8a745f;font-size:12px;line-height:1.6;">
              Бронювання дійсне на дату та кількість гостей, вказані у цьому листі. Якщо у вас зміняться деталі візиту, повідомте адміністрацію заздалегідь.
            </td>
          </tr>
        </table>
        <div style="padding-top:16px;font-size:11px;color:#a8947f;">GorPliaj • Otrada, Odesa • ${escapeHtml(appBaseUrl)}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendTicketEmail({
  to,
  ticketCode,
  customerName,
  customerPhone,
  reservationDate,
  timeFrom,
  timeTo,
  guests,
  tableName,
  zoneName,
  eventTitle,
  depositAmount,
  totalPaid,
  entryTicketsAmount,
  qrDataUrl,
  verifyUrl,
  statusUrl,
  downloadUrl,
  depositQrUrl,
  status,
  paymentStatus
}) {
  if (!isMailConfigured()) {
    console.log(`[mail] Not configured. Would send ticket ${ticketCode} to ${to}`);
    return { sent: false, reason: 'mail_not_configured' };
  }

  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: 'mail_transport_failed' };
  }

  let depositQrDataUrl = null;
  if (depositQrUrl) {
    try {
      depositQrDataUrl = await QRCode.toDataURL(depositQrUrl, { width: 300, margin: 2 });
    } catch {}
  }

  const html = buildTicketHtml({
    ticketCode,
    customerName,
    customerPhone,
    reservationDate,
    timeFrom,
    timeTo,
    guests,
    tableName,
    zoneName,
    eventTitle,
    depositAmount,
    totalPaid,
    entryTicketsAmount,
    qrDataUrl,
    depositQrDataUrl,
    status,
    paymentStatus,
    statusUrl,
    downloadUrl
  });

  const attachments = [];

  try {
    const pdfBuffer = await generateTicketPdf({
      ticketCode,
      customerName,
      customerPhone,
      guests,
      reservationDate,
      timeFrom,
      timeTo,
      tableName,
      zoneName,
      eventTitle,
      depositAmount,
      totalPaid,
      entryTicketsAmount,
      status,
      paymentStatus,
      verifyUrl,
      statusUrl,
      downloadUrl,
      depositVerifyUrl: depositQrUrl
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
      subject: `GorPliaj - бронювання ${ticketCode}`,
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
