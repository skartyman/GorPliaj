const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const fs = require('fs');
const { generateTicketPdf } = require('./ticketPdfService');
const { getLogoPath } = require('../utils/pdfBranding');
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
  downloadUrl,
  logoSrc
}) {
  const isConfirmed = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';
  const rental = Number(rentalAmount || 0);
  const deposit = Number(depositAmount || 0);
  const entry = Number(entryTicketsAmount || 0);
  const hasRental = rental > 0;
  const hasDeposit = deposit > 0;
  const hasEntry = entry > 0;
  const appBaseUrl = getBaseUrl();
  const statusLabel = isConfirmed ? 'Підтверджено' : 'Очікує оплати';
  const totalLabel = hasRental || hasDeposit || hasEntry
    ? formatMoney(totalPaid || rental + deposit + entry)
    : 'Оплата не потрібна';
  const timeLabel = [formatTime(timeFrom), formatTime(timeTo)].filter(Boolean).join(' - ');

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Бронювання у Горпляж</title>
  <style>
    @media only screen and (max-width: 640px) {
      .mail-outer { padding: 0 !important; }
      .mail-shell { width: 100% !important; border-radius: 0 !important; }
      .mail-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .mail-stack { display: block !important; width: 100% !important; padding-right: 0 !important; }
      .mail-qr { display: block !important; width: 100% !important; padding-top: 20px !important; }
      .mail-logo { display: none !important; }
      .mail-button { display: block !important; margin: 0 0 10px !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#e9f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#173d43;line-height:1.5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${isConfirmed ? 'Ваше бронювання підтверджено.' : 'Бронювання створено та очікує оплати.'} Код ${escapeHtml(ticketCode)}.</div>
  <table class="mail-outer" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#e9f5f3;padding:28px 12px;">
    <tr>
      <td align="center">
        <table class="mail-shell" width="640" cellpadding="0" cellspacing="0" role="presentation" style="width:640px;max-width:100%;background:#ffffff;border:1px solid #d5e8e5;border-radius:20px;overflow:hidden;box-shadow:0 16px 42px rgba(25,76,82,0.10);">
          <tr>
            <td class="mail-pad" style="padding:26px 32px 24px;background:#123f47;color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:#b9ded8;font-weight:700;">Горпляж · Одеса</div>
                    <h1 style="margin:9px 0 0;font-size:27px;line-height:1.18;font-weight:750;letter-spacing:0;">${isConfirmed ? 'Бронювання підтверджено' : 'Бронювання очікує оплати'}</h1>
                    <p style="margin:9px 0 0;color:#dcecea;font-size:14px;">Код бронювання: <strong style="color:#f1d08a;">${escapeHtml(ticketCode)}</strong></p>
                  </td>
                  ${logoSrc ? `<td class="mail-logo" align="right" style="width:76px;vertical-align:middle;"><div style="display:inline-block;padding:8px 10px;border-radius:12px;background:#ffffff;"><img src="${escapeHtml(logoSrc)}" alt="Горпляж" width="54" style="display:block;width:54px;height:auto;" /></div></td>` : ''}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mail-pad" style="padding:26px 32px 10px;">
              <p style="margin:0 0 18px;color:#365d62;font-size:15px;line-height:1.65;">Вітаємо, <strong style="color:#173d43;">${escapeHtml(customerName || 'гостю')}</strong>. Нижче зібрали все необхідне для вашого візиту.</p>
              <div style="margin-bottom:20px;padding:12px 14px;border-radius:12px;background:${isConfirmed ? '#e7f5ef' : '#fff5dc'};color:${isConfirmed ? '#17624f' : '#795715'};font-size:14px;font-weight:700;">${isConfirmed ? 'Місце закріплено за вами' : 'Завершіть оплату, щоб закріпити місце'} · ${escapeHtml(statusLabel)}</div>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="mail-stack" style="vertical-align:top;padding-right:22px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${renderFactRow('Дата', formatDate(reservationDate))}
                      ${renderFactRow('Час', timeLabel)}
                      ${renderFactRow('Гостей', guests)}
                      ${renderFactRow('Місце', localizedText(tableName))}
                      ${renderFactRow('Зона', localizedText(zoneName))}
                      ${eventTitle ? renderFactRow('Подія', localizedText(eventTitle)) : ''}
                      ${customerPhone ? renderFactRow('Телефон', customerPhone) : ''}
                    </table>
                  </td>
                  <td class="mail-qr" style="vertical-align:top;width:184px;text-align:center;">
                    ${qrDataUrl ? `<div style="padding:11px;border:1px solid #d5e8e5;border-radius:14px;background:#f8fcfb;"><img src="${escapeHtml(qrDataUrl)}" alt="QR-код бронювання" width="150" height="150" style="display:block;width:150px;height:150px;margin:0 auto;" /><div style="font-size:11px;color:#55777b;font-weight:700;margin-top:8px;">Покажіть на вході</div></div>` : ''}
                    ${depositQrDataUrl ? `<div style="padding:10px;border:1px solid #d5e8e5;border-radius:14px;background:#f8fcfb;margin-top:12px;"><img src="${escapeHtml(depositQrDataUrl)}" alt="QR-код депозиту" width="120" height="120" style="display:block;width:120px;height:120px;margin:0 auto;" /><div style="font-size:11px;color:#55777b;font-weight:700;margin-top:8px;">QR депозиту</div></div>` : ''}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;background:#f1f8f7;border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:12px;color:#668589;margin-bottom:5px;">Оплата</div>
                    <div style="font-size:20px;color:#173d43;font-weight:750;">${escapeHtml(totalLabel)}</div>
                    <div style="font-size:12px;color:#55777b;margin-top:6px;line-height:1.5;">${[
                      hasRental ? `Оренда: ${formatMoney(rental)}` : '',
                      hasDeposit ? `Депозит: ${formatMoney(deposit)}` : '',
                      hasEntry ? `Вхідні квитки: ${formatMoney(entry)}` : ''
                    ].filter(Boolean).map(escapeHtml).join(' · ') || 'Додаткових платежів немає'}</div>
                  </td>
                </tr>
              </table>
              <div style="padding:20px 0 4px;">
                ${downloadUrl ? `<a class="mail-button" href="${escapeHtml(downloadUrl)}" style="display:inline-block;padding:13px 19px;border-radius:10px;background:#123f47;color:#ffffff;text-decoration:none;font-weight:700;margin:0 8px 10px 0;">Завантажити PDF</a>` : ''}
                ${statusUrl ? `<a class="mail-button" href="${escapeHtml(statusUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#ffffff;color:#123f47;text-decoration:none;font-weight:700;border:1px solid #9fc9c3;margin-bottom:10px;">Перевірити бронювання</a>` : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td class="mail-pad" style="padding:12px 32px 28px;color:#55777b;font-size:12px;line-height:1.65;">
              Бронювання діє для зазначених дати, часу, місця та кількості гостей. Якщо ваші плани змінилися, будь ласка, завчасно зв'яжіться з адміністрацією закладу.
            </td>
          </tr>
        </table>
        <div style="padding-top:14px;font-size:11px;color:#55777b;">Горпляж · пляж Отрада, Одеса · ${escapeHtml(appBaseUrl)}</div>
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
  const logoCid = `booking-logo-${ticketCode}@gorpliaj`;
  const logoPath = getLogoPath();
  const hasLogo = Boolean(logoPath && fs.existsSync(logoPath));

  const attachments = [];

  if (hasLogo) {
    attachments.push({
      filename: 'gorpliaj-logo.png',
      path: logoPath,
      cid: logoCid,
      contentDisposition: 'inline'
    });
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
    qrDataUrl: qrBuffer ? `cid:${qrCid}` : null,
    depositQrDataUrl: depositQrBuffer ? `cid:${depositQrCid}` : null,
    status,
    paymentStatus,
    statusUrl,
    downloadUrl,
    logoSrc: hasLogo ? `cid:${logoCid}` : null
  });

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
      subject: `Горпляж - бронювання ${ticketCode}`,
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
