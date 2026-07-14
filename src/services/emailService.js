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
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
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

function dataUrlToBuffer(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

function renderFactRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;color:#8a745f;font-size:13px;vertical-align:top;width:132px;">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#2f2219;font-size:14px;font-weight:600;">${escapeHtml(value || '-')}</td>
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
  const isConfirmed = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';
  const rental = Number(rentalAmount || 0);
  const deposit = Number(depositAmount || 0);
  const entry = Number(entryTicketsAmount || 0);
  const hasRental = rental > 0;
  const hasDeposit = deposit > 0;
  const hasEntry = entry > 0;
  const appBaseUrl = getBaseUrl();
  const statusLabel = isConfirmed ? 'Confirmed' : 'Awaiting payment';
  const totalLabel = hasRental || hasDeposit || hasEntry
    ? formatMoney(totalPaid || rental + deposit + entry)
    : 'No online payment required';

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
        <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fffdf9;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.28);">
          <tr>
            <td style="padding:30px 34px 18px;background:#402719;color:#fffdf9;">
              <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#d9bd8b;font-weight:700;">GorPliaj</div>
              <h1 style="margin:12px 0 0;font-size:28px;line-height:1.15;font-weight:800;">Booking confirmation</h1>
              <p style="margin:10px 0 0;color:#f3dcc0;font-size:15px;">Your booking code is <strong>${escapeHtml(ticketCode)}</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 34px 10px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding-right:22px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${renderFactRow('Guest', customerName)}
                      ${renderFactRow('Phone', customerPhone)}
                      ${renderFactRow('Date', formatDate(reservationDate))}
                      ${renderFactRow('Time', `${formatTime(timeFrom)} - ${formatTime(timeTo)}`)}
                      ${renderFactRow('Guests', guests)}
                      ${renderFactRow('Position', localizedText(tableName))}
                      ${renderFactRow('Zone', localizedText(zoneName))}
                      ${eventTitle ? renderFactRow('Event', localizedText(eventTitle)) : ''}
                      ${renderFactRow('Status', statusLabel)}
                      ${renderFactRow('Online payment', totalLabel)}
                      ${hasRental ? renderFactRow('Rental', formatMoney(rental)) : ''}
                      ${hasDeposit ? renderFactRow('Deposit', formatMoney(deposit)) : ''}
                      ${hasEntry ? renderFactRow('Event entry', formatMoney(entry)) : ''}
                    </table>
                  </td>
                  <td style="vertical-align:top;width:190px;text-align:center;">
                    ${qrDataUrl ? `<div style="padding:12px;border:1px solid #eadbc8;border-radius:20px;background:#ffffff;"><img src="${escapeHtml(qrDataUrl)}" alt="QR code" width="160" height="160" style="display:block;width:160px;height:160px;margin:0 auto;" /><div style="font-size:11px;color:#8a745f;font-weight:700;margin-top:8px;text-transform:uppercase;letter-spacing:1px;">Scan at entrance</div></div>` : ''}
                    ${depositQrDataUrl ? `<div style="padding:12px;border:1px solid #eadbc8;border-radius:20px;background:#ffffff;margin-top:14px;"><img src="${escapeHtml(depositQrDataUrl)}" alt="Deposit QR code" width="130" height="130" style="display:block;width:130px;height:130px;margin:0 auto;" /><div style="font-size:11px;color:#8a745f;font-weight:700;margin-top:8px;text-transform:uppercase;letter-spacing:1px;">Deposit scan</div></div>` : ''}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:22px 0 4px;">
                    ${downloadUrl ? `<a href="${escapeHtml(downloadUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#402719;color:#fff;text-decoration:none;font-weight:700;margin:0 10px 10px 0;">Download PDF</a>` : ''}
                    ${statusUrl ? `<a href="${escapeHtml(statusUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#f4ede2;color:#402719;text-decoration:none;font-weight:700;border:1px solid #ddc8ae;margin-bottom:10px;">Check booking status</a>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 34px 28px;color:#8a745f;font-size:12px;line-height:1.6;">
              The booking is valid for the date, time and guest count shown in this email. If visit details change, please contact the venue administration in advance.
            </td>
          </tr>
        </table>
        <div style="padding-top:16px;font-size:11px;color:#a8947f;">GorPliaj - Otrada, Odesa - ${escapeHtml(appBaseUrl)}</div>
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

  let qrBuffer = null;
  if (verifyUrl) {
    try {
      qrBuffer = await QRCode.toBuffer(verifyUrl, {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch {}
  }
  if (!qrBuffer) qrBuffer = dataUrlToBuffer(qrDataUrl);

  let depositQrBuffer = null;
  if (depositQrUrl) {
    try {
      depositQrBuffer = await QRCode.toBuffer(depositQrUrl, {
        type: 'png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch {}
  }

  const qrCid = `booking-qr-${ticketCode}@gorpliaj`;
  const depositQrCid = `booking-deposit-qr-${ticketCode}@gorpliaj`;

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
    qrDataUrl: qrBuffer ? `cid:${qrCid}` : null,
    depositQrDataUrl: depositQrBuffer ? `cid:${depositQrCid}` : null,
    status,
    paymentStatus,
    statusUrl,
    downloadUrl
  });

  const attachments = [];

  if (qrBuffer) {
    attachments.push({
      filename: `gorpliaj-qr-${ticketCode.toLowerCase()}.png`,
      content: qrBuffer,
      contentType: 'image/png',
      cid: qrCid,
      contentDisposition: 'inline'
    });
  }

  if (depositQrBuffer) {
    attachments.push({
      filename: `gorpliaj-deposit-qr-${ticketCode.toLowerCase()}.png`,
      content: depositQrBuffer,
      contentType: 'image/png',
      cid: depositQrCid,
      contentDisposition: 'inline'
    });
  }

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
      subject: `GorPliaj - booking ${ticketCode}`,
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
