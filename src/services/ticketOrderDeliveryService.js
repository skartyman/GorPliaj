const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
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
const { getLogoPath } = require('../utils/pdfBranding');

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
    <span style="display:inline-block;padding:10px 12px;border-radius:14px;background:#ffffff;border:1px solid #e4d4c1;color:#2f2219;font-weight:700;font-size:13px;margin:0 8px 8px 0;">
      ${escapeHtml(ticket.code)}
    </span>
  `).join('');
}

function buildOrderMailHtml(order, downloadUrl) {
  const eventTitle = localizedText(order.event?.title) || `Подія #${order.eventId}`;
  const session = getSessionForOrder(order);
  const sessionLabel = formatSessionLabel(session, order.event?.startAt, order.event?.endAt);
  const moreCount = Math.max(0, order.tickets.length - 6);
  const posterUrl = order.event?.posterImage ? escapeHtml(order.event.posterImage) : '';
  const logoCid = 'gorpliaj-logo';

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Квитки GorPliaj</title>
</head>
<body style="margin:0;padding:0;background:#f2e8dc;font-family:Arial,Helvetica,sans-serif;color:#2f2219;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2e8dc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fffdf9;border-radius:30px;overflow:hidden;box-shadow:0 16px 40px rgba(76,52,31,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#231814 0%,#5a3523 55%,#cf9949 100%);padding:28px 34px 22px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top">
                    <div style="display:inline-block;background:rgba(255,248,238,0.96);border-radius:18px;padding:10px 14px;">
                      <img src="cid:${logoCid}" alt="GorPliaj" style="display:block;width:54px;height:54px;object-fit:contain;" />
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <div style="display:inline-block;padding:10px 16px;border-radius:16px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.16);color:#ffffff;font-size:13px;font-weight:700;">
                      Замовлення ${escapeHtml(order.orderNumber)}
                    </div>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;letter-spacing:0.22em;text-transform:uppercase;color:#f7e8cf;margin-top:18px;">Квитки готові</div>
              <div style="font-size:30px;line-height:1.18;font-weight:700;color:#ffffff;margin-top:8px;">Ваші QR-квитки вже в листі</div>
              <div style="font-size:15px;line-height:1.6;color:#f3dfca;margin-top:12px;max-width:560px;">
                Зберігайте PDF у телефоні або відкрийте цей лист перед входом. Усі квитки на подію вже прикріплені нижче одним файлом.
              </div>
            </td>
          </tr>
          ${posterUrl ? `
          <tr>
            <td style="padding:20px 34px 0;">
              <img src="${posterUrl}" alt="${escapeHtml(eventTitle)}" style="display:block;width:100%;max-width:612px;height:auto;border-radius:24px;" />
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:24px 34px 10px;">
              <div style="font-size:30px;line-height:1.2;font-weight:700;color:#2f2219;">${escapeHtml(eventTitle)}</div>
              ${sessionLabel ? `<div style="font-size:15px;line-height:1.6;color:#7a6450;margin-top:8px;">${escapeHtml(sessionLabel)}</div>` : ''}
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                <tr>
                  <td style="width:50%;padding-right:8px;vertical-align:top;">
                    <div style="background:#3d2417;border-radius:24px;padding:22px;">
                      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d9c0a0;">Квитків</div>
                      <div style="font-size:32px;font-weight:700;color:#ffffff;margin-top:10px;">${order.tickets.length}</div>
                    </div>
                  </td>
                  <td style="width:50%;padding-left:8px;vertical-align:top;">
                    <div style="background:#f6eee4;border-radius:24px;padding:22px;">
                      <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8f6a44;">Сума</div>
                      <div style="font-size:32px;font-weight:700;color:#402719;margin-top:10px;">${escapeHtml(formatMoney(order.amount, order.currency))}</div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;line-height:1.6;color:#6d5948;margin-top:14px;">
                Покупець: ${escapeHtml(order.customerName)} · Усі коди та QR зібрані в одному PDF
              </div>
              <div style="background:#fbf6ef;border:1px solid #eadbca;border-radius:24px;padding:22px 24px;margin-top:20px;">
                <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8f6a44;margin-bottom:14px;">Коди квитків</div>
                ${buildTicketChips(order)}
                ${moreCount ? `<div style="font-size:13px;color:#7c6b59;margin-top:8px;">Ще ${moreCount} квитків є у вкладеному PDF.</div>` : ''}
              </div>
              <div style="padding-top:22px;">
                <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;padding:15px 24px;border-radius:18px;background:#402719;color:#fff;text-decoration:none;font-weight:700;font-size:15px;">Завантажити PDF з квитками</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 34px 30px;color:#8a745f;font-size:12px;line-height:1.7;">
              На вході достатньо показати QR-код з екрана телефону. Кожен квиток дійсний для одноразового проходу. Якщо купували кілька квитків, передайте PDF гостям або відкрийте його на вході.
            </td>
          </tr>
        </table>
        <div style="padding-top:16px;font-size:11px;color:#a8947f;">GorPliaj • Odesa • ${escapeHtml(getBaseUrl())}</div>
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
  const attachments = [{
    filename: `gorpliaj-${order.orderNumber}.pdf`,
    content: pdf,
    contentType: 'application/pdf'
  }];

  if (logoPath && fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'gorpliaj-logo.png',
      path: logoPath,
      cid: 'gorpliaj-logo'
    });
  }

  await createTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: order.customerEmail,
    subject: `GorPliaj - квитки ${order.orderNumber}`,
    html: buildOrderMailHtml(order, downloadUrl),
    attachments
  });

  return { sent: true, downloadUrl };
}

module.exports = {
  deliverPaidOrder,
  generateTicketOrderPdf,
  getOrderForDelivery,
  getDownloadUrl,
  cachedPdfExists,
  pdfCachePath,
  ensureCacheDir
};
