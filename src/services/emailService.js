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
  rentalAmount,
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
  const rental = Number(rentalAmount || 0);
  const deposit = Number(depositAmount || 0);
  const hasRental = rental > 0;
  const hasDeposit = deposit > 0;
  const hasEntry = Number(entryTicketsAmount || 0) > 0;
  const appBaseUrl = getBaseUrl();
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GorPliaj Booking</title>
</head>
<body style="margin:0;padding:0;background:#0E0E11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#FFFFFF;line-height:1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0E0E11;padding:40px 0;">
    <tr>
      <td align="center">
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
  rentalAmount,
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
    rentalAmount,
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
      rentalAmount,
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
