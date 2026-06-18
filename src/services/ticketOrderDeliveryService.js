const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');
const { generateTicketOrderPdf } = require('./ticketOrderPdfService');
const { normalizeLocalizedField } = require('../utils/localization');

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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function getOrderForDelivery(orderId) {
  return prisma.ticketOrder.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      tickets: {
        orderBy: { id: 'asc' },
        include: { ticketType: true }
      }
    }
  });
}

function getDownloadUrl(order) {
  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  return `${baseUrl}/api/ticket-orders/${encodeURIComponent(order.orderNumber)}/pdf?token=${encodeURIComponent(order.downloadToken)}`;
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

  const title = normalizeLocalizedField(order.event.title);
  const eventTitle = title.ua || title.ru || title.en || `Event #${order.eventId}`;
  await createTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to: order.customerEmail,
    subject: `GorPliaj - tickets ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2c1810">
        <h1>Your GorPliaj tickets</h1>
        <p><strong>${escapeHtml(eventTitle)}</strong></p>
        <p>Order: ${escapeHtml(order.orderNumber)}</p>
        <p>Tickets: ${order.tickets.length}</p>
        <p><a href="${downloadUrl}">Download tickets as PDF</a></p>
        <p>The PDF is also attached to this email.</p>
      </div>
    `,
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
