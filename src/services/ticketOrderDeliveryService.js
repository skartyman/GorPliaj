const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { generateTicketOrderPdf } = require('./ticketOrderPdfService');
const {
  getBaseUrl,
  localizedText,
  escapeHtml,
  formatDateTime,
  formatMoney
} = require('../utils/deliveryPresentation');

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

function buildOrderMailHtml(order, downloadUrl) {
  const eventTitle = localizedText(order.event?.title) || `Event #${order.eventId}`;
  const session = order.eventSession || order.tickets[0]?.eventSession || order.tickets[0]?.ticketType?.eventSession;
  const ticketCodes = order.tickets.slice(0, 6).map((ticket) => ticket.code);
  const moreCount = Math.max(0, order.tickets.length - ticketCodes.length);

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GorPliaj Tickets</title>
</head>
<body style="margin:0;padding:0;background:#f4ede2;font-family:Arial,Helvetica,sans-serif;color:#2f2219;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede2;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffdf9;border-radius:28px;overflow:hidden;box-shadow:0 16px 40px rgba(76,52,31,0.12);">
          <tr>
            <td style="padding:32px 34px 28px;background:linear-gradient(135deg,#231814 0%,#513120 55%,#c89241 100%);">
              <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#f7e8cf;">GorPliaj</div>
              <div style="font-size:31px;line-height:1.15;font-weight:700;color:#ffffff;margin-top:10px;">Ваші квитки готові</div>
              <div style="font-size:15px;line-height:1.6;color:#f2dfcd;margin-top:12px;">Замовлення оплачено. PDF з усіма QR-квитками вже прикріплено до цього листа.</div>
              <div style="margin-top:22px;display:inline-block;padding:12px 18px;border-radius:16px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.18);color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.08em;">
                ${escapeHtml(order.orderNumber)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 34px 16px;">
              <div style="font-size:26px;font-weight:700;color:#2f2219;">${escapeHtml(eventTitle)}</div>
              ${session?.startsAt ? `<div style="font-size:15px;color:#7c6b59;line-height:1.6;margin-top:8px;">${escapeHtml(formatDateTime(session.startsAt))}${session?.endsAt ? ` • до ${escapeHtml(new Date(session.endsAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }))}` : ''}</div>` : ''}
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                <tr>
                  <td style="width:50%;padding-right:8px;vertical-align:top;">
                    <div style="background:#3f2416;border-radius:22px;padding:20px 22px;min-height:124px;">
                      <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#d8bf9e;">Квитків</div>
                      <div style="font-size:30px;font-weight:700;color:#ffffff;margin-top:10px;">${order.tickets.length}</div>
                      <div style="font-size:13px;line-height:1.6;color:#f0dfcf;margin-top:10px;">Усі QR-квитки зібрані в одному PDF.</div>
                    </div>
                  </td>
                  <td style="width:50%;padding-left:8px;vertical-align:top;">
                    <div style="background:#f5efe6;border-radius:22px;padding:20px 22px;min-height:124px;">
                      <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8f6a44;">Сума</div>
                      <div style="font-size:30px;font-weight:700;color:#402719;margin-top:10px;">${escapeHtml(formatMoney(order.amount, order.currency))}</div>
                      <div style="font-size:13px;line-height:1.6;color:#6d5948;margin-top:10px;">Покупець: ${escapeHtml(order.customerName)}</div>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="background:#fbf6ef;border:1px solid #eadbca;border-radius:22px;padding:22px 24px;margin-top:20px;">
                <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#8f6a44;margin-bottom:14px;">Коди квитків</div>
                ${ticketCodes.map((code) => `<div style="display:inline-block;padding:10px 12px;border-radius:14px;background:#ffffff;border:1px solid #e4d4c1;color:#2f2219;font-weight:700;font-size:13px;margin:0 8px 8px 0;">${escapeHtml(code)}</div>`).join('')}
                ${moreCount ? `<div style="font-size:13px;color:#7c6b59;margin-top:8px;">Ще ${moreCount} квитків будуть у PDF-вкладенні.</div>` : ''}
              </div>
              <div style="padding-top:22px;">
                <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#402719;color:#fff;text-decoration:none;font-weight:700;">Завантажити PDF</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 34px 28px;color:#8a745f;font-size:12px;line-height:1.6;">
              На вході достатньо показати QR-код з PDF на екрані телефону. Кожен квиток дійсний для одноразового проходу.
            </td>
          </tr>
        </table>
        <div style="padding-top:16px;font-size:11px;color:#a8947f;">GorPliaj • Otrada, Odesa • ${escapeHtml(getBaseUrl())}</div>
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
  const downloadUrl = getDownloadUrl(order);

  if (!isMailConfigured()) {
    console.log(`[ticket-order-mail] Mail not configured for ${order.orderNumber}.`);
    return { sent: false, reason: 'mail_not_configured', pdf, downloadUrl };
  }

  await createTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: order.customerEmail,
    subject: `GorPliaj - квитки ${order.orderNumber}`,
    html: buildOrderMailHtml(order, downloadUrl),
    attachments: [{
      filename: `gorpliaj-${order.orderNumber}.pdf`,
      content: pdf,
      contentType: 'application/pdf'
    }]
  });

  return { sent: true, downloadUrl };
}

module.exports = {
  deliverPaidOrder,
  generateTicketOrderPdf,
  getOrderForDelivery,
  getDownloadUrl
};
