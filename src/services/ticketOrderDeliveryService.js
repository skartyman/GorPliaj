const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
const prisma = require('../lib/prisma');

const PDF_CACHE_DIR = path.join(__dirname, '..', '..', 'ticket-pdfs');
const { generateTicketOrderPdf } = require('./ticketOrderPdfService');
const {
  getBaseUrl,
  localizedText,
  escapeHtml,
  formatDate,
  formatTime,
  formatMoney
} = require('../utils/deliveryPresentation');
const { getLogoPath, loadImageBuffer } = require('../utils/pdfBranding');

function ensureCacheDir() {
  if (!fs.existsSync(PDF_CACHE_DIR)) {
    fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
  }
}

function pdfCachePath(orderNumber) {
  return path.join(PDF_CACHE_DIR, `${orderNumber}.pdf`);
}

function cachedPdfExists(orderNumber) {
  return fs.existsSync(pdfCachePath(orderNumber));
}

function isMailConfigured() {
  return Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_PORT || '') === '465',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

async function getOrderForDelivery(orderId) {
  return prisma.ticketOrder.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      eventSession: true,
      tickets: {
        orderBy: { id: 'asc' },
        include: { ticketType: { include: { eventSession: true } }, eventSession: true }
      }
    }
  });
}

function getDownloadUrl(order) {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/ticket-orders/${encodeURIComponent(order.orderNumber)}/pdf?token=${encodeURIComponent(order.downloadToken)}`;
}

function getSessionForOrder(order) {
  return order.eventSession || order.tickets[0]?.eventSession || order.tickets[0]?.ticketType?.eventSession || null;
}

function formatSessionLabel(session, fallbackStartAt, fallbackEndAt) {
  const startsAt = session?.startsAt || fallbackStartAt;
  const endsAt = session?.endsAt || fallbackEndAt;
  if (!startsAt) return '';

  const dateLabel = formatDate(startsAt);
  const startTime = formatTime(startsAt);
  const endTime = endsAt ? formatTime(endsAt) : '';
  return endTime ? `${dateLabel}, ${startTime} - ${endTime}` : `${dateLabel}, ${startTime}`;
}

function buildTicketChips(order) {
  return order.tickets.slice(0, 6).map((ticket) => `
    <span style="display:inline-block;padding:9px 11px;border-radius:9px;background:#ffffff;border:1px solid #b9d8d3;color:#173d43;font-weight:700;font-size:13px;margin:0 7px 7px 0;">
      ${escapeHtml(ticket.code)}
    </span>
  `).join('');
}

function buildOrderMailHtml(order, downloadUrl, { logoSrc = '', posterSrc = '' } = {}) {
  const eventTitle = localizedText(order.event?.title) || `Подія #${order.eventId}`;
  const session = getSessionForOrder(order);
  const sessionLabel = formatSessionLabel(session, order.event?.startAt, order.event?.endAt);
  const moreCount = Math.max(0, order.tickets.length - 6);

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Квитки Горпляж</title>
  <style>
    @media only screen and (max-width: 640px) {
      .mail-outer { padding: 0 !important; }
      .mail-shell { width: 100% !important; border-radius: 0 !important; }
      .mail-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .mail-column { display: block !important; width: 100% !important; padding: 0 0 10px !important; }
      .mail-logo { display: none !important; }
      .mail-button { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#e9f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#173d43;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Ваші квитки на подію ${escapeHtml(eventTitle)} готові.</div>
  <table class="mail-outer" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#e9f5f3;padding:28px 12px;">
    <tr>
      <td align="center">
        <table class="mail-shell" width="640" cellpadding="0" cellspacing="0" role="presentation" style="width:640px;max-width:100%;background:#ffffff;border:1px solid #d5e8e5;border-radius:20px;overflow:hidden;box-shadow:0 16px 42px rgba(25,76,82,0.10);">
          <tr>
            <td class="mail-pad" style="background:#123f47;padding:26px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td valign="middle">
                    <div style="font-size:11px;letter-spacing:2.2px;text-transform:uppercase;color:#b9ded8;font-weight:700;">Горпляж · Одеса</div>
                    <h1 style="margin:9px 0 0;font-size:27px;line-height:1.18;font-weight:750;color:#ffffff;">Ваші квитки готові</h1>
                    <div style="font-size:13px;color:#dcecea;margin-top:8px;">Замовлення <strong style="color:#f1d08a;">${escapeHtml(order.orderNumber)}</strong></div>
                  </td>
                  ${logoSrc ? `<td class="mail-logo" align="right" valign="middle" style="width:76px;"><div style="display:inline-block;padding:8px 10px;border-radius:12px;background:#ffffff;"><img src="${escapeHtml(logoSrc)}" alt="Горпляж" width="54" style="display:block;width:54px;height:auto;" /></div></td>` : ''}
                </tr>
              </table>
            </td>
          </tr>
          ${posterSrc ? `
          <tr>
            <td class="mail-pad" style="padding:20px 32px 0;">
              <img src="${escapeHtml(posterSrc)}" alt="${escapeHtml(eventTitle)}" style="display:block;width:100%;max-width:576px;max-height:260px;object-fit:cover;border-radius:14px;" />
            </td>
          </tr>` : ''}
          <tr>
            <td class="mail-pad" style="padding:24px 32px 10px;">
              <div style="font-size:25px;line-height:1.24;font-weight:750;color:#173d43;">${escapeHtml(eventTitle)}</div>
              ${sessionLabel ? `<div style="font-size:14px;line-height:1.6;color:#55777b;margin-top:7px;">${escapeHtml(sessionLabel)}</div>` : ''}
              <p style="margin:16px 0 0;color:#365d62;font-size:14px;line-height:1.65;">Збережіть PDF у телефоні та покажіть QR-коди на вході. Для кожного гостя у файлі є окремий квиток.</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:18px;">
                <tr>
                  <td class="mail-column" style="width:50%;padding-right:6px;vertical-align:top;">
                    <div style="background:#edf7f5;border-radius:14px;padding:17px 18px;">
                      <div style="font-size:12px;color:#668589;">Кількість квитків</div>
                      <div style="font-size:27px;font-weight:750;color:#173d43;margin-top:5px;">${order.tickets.length}</div>
                    </div>
                  </td>
                  <td class="mail-column" style="width:50%;padding-left:6px;vertical-align:top;">
                    <div style="background:#fff6df;border-radius:14px;padding:17px 18px;">
                      <div style="font-size:12px;color:#80652d;">Сплачено</div>
                      <div style="font-size:27px;font-weight:750;color:#5c471f;margin-top:5px;">${escapeHtml(formatMoney(order.amount, order.currency))}</div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;line-height:1.6;color:#55777b;margin-top:14px;">
                Покупець: <strong style="color:#173d43;">${escapeHtml(order.customerName)}</strong>
              </div>
              <div style="background:#f7fbfa;border:1px solid #d5e8e5;border-radius:14px;padding:18px 18px;margin-top:18px;">
                <div style="font-size:12px;color:#55777b;font-weight:700;margin-bottom:12px;">Коди квитків</div>
                ${buildTicketChips(order)}
                ${moreCount ? `<div style="font-size:13px;color:#55777b;margin-top:8px;">Ще ${moreCount} квитків є у прикріпленому PDF.</div>` : ''}
              </div>
              <div style="padding-top:20px;">
                <a class="mail-button" href="${escapeHtml(downloadUrl)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#123f47;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Завантажити квитки PDF</a>
              </div>
            </td>
          </tr>
          <tr>
            <td class="mail-pad" style="padding:12px 32px 28px;color:#55777b;font-size:12px;line-height:1.65;">
              Кожен QR-код дійсний для одного проходу. Не надсилайте його стороннім. Якщо квитків кілька, можна передати PDF гостям або показати всі коди з одного телефона.
            </td>
          </tr>
        </table>
        <div style="padding-top:14px;font-size:11px;color:#55777b;">Горпляж · пляж Отрада, Одеса · ${escapeHtml(getBaseUrl())}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function deliverPaidOrder(orderId) {
  const order = await getOrderForDelivery(orderId);
  if (!order || order.status !== 'PAID') return { sent: false, reason: 'order_not_paid' };

  const pdf = await generateTicketOrderPdf(order);
  ensureCacheDir();
  fs.writeFileSync(pdfCachePath(order.orderNumber), pdf);
  const downloadUrl = getDownloadUrl(order);

  if (!isMailConfigured()) {
    console.log(`[ticket-order-mail] Mail not configured for ${order.orderNumber}.`);
    return { sent: false, reason: 'mail_not_configured', pdf, downloadUrl };
  }

  const logoPath = getLogoPath();
  const posterSourceBuffer = await loadImageBuffer(order.event?.posterImage);
  const posterBuffer = posterSourceBuffer
    ? await sharp(posterSourceBuffer)
      .rotate()
      .resize({ width: 1200, height: 700, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 84, progressive: true })
      .toBuffer()
      .catch(() => null)
    : null;
  const logoCid = `ticket-logo-${order.orderNumber}@gorpliaj`;
  const posterCid = `ticket-poster-${order.orderNumber}@gorpliaj`;
  const attachments = [{
    filename: `gorpliaj-${order.orderNumber}.pdf`,
    content: pdf,
    contentType: 'application/pdf'
  }];

  if (logoPath && fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'gorpliaj-logo.png',
      path: logoPath,
      cid: logoCid,
      contentDisposition: 'inline'
    });
  }

  if (posterBuffer) {
    attachments.push({
      filename: `gorpliaj-event-${order.orderNumber}.jpg`,
      content: posterBuffer,
      contentType: 'image/jpeg',
      cid: posterCid,
      contentDisposition: 'inline'
    });
  }

  await createTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: order.customerEmail,
    subject: `Горпляж - квитки ${order.orderNumber}`,
    html: buildOrderMailHtml(order, downloadUrl, {
      logoSrc: logoPath && fs.existsSync(logoPath) ? `cid:${logoCid}` : '',
      posterSrc: posterBuffer ? `cid:${posterCid}` : ''
    }),
    attachments
  });

  return { sent: true, downloadUrl };
}

module.exports = {
  deliverPaidOrder,
  buildOrderMailHtml,
  generateTicketOrderPdf,
  getOrderForDelivery,
  getDownloadUrl,
  cachedPdfExists,
  pdfCachePath,
  ensureCacheDir
};
