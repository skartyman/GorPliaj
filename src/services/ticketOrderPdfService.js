const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { normalizeLocalizedField } = require('../utils/localization');

function localizedText(value) {
  const normalized = normalizeLocalizedField(value);
  return normalized.ua || normalized.ru || normalized.en || '';
}

function formatDate(value) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getTicketDateLabel(order, ticket) {
  const session = ticket.eventSession || order.eventSession;
  if (session?.startsAt) {
    return formatDate(session.startsAt);
  }
  return formatDate(order.event.startAt);
}

async function generateTicketOrderPdf(order) {
  const document = new PDFDocument({ size: 'A5', margin: 32, autoFirstPage: false });
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));

  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  const baseUrl = process.env.APP_BASE_URL || 'https://gorpliaj.fly.dev';
  const eventTitle = localizedText(order.event?.title) || `Event #${order.eventId}`;

  for (const ticket of order.tickets) {
    document.addPage();
    const verifyUrl = `${baseUrl}/api/admin/tickets/verify/${encodeURIComponent(ticket.code)}`;
    const qr = await QRCode.toBuffer(verifyUrl, { width: 280, margin: 2 });

    document.rect(0, 0, document.page.width, document.page.height).fill('#f5f0e8');
    document.roundedRect(24, 24, document.page.width - 48, document.page.height - 48, 16).fill('#ffffff');
    document.roundedRect(28, 28, document.page.width - 56, document.page.height - 56, 14)
      .lineWidth(2)
      .stroke('#c89241');

    document.fillColor('#5c3a1e').font('Helvetica-Bold').fontSize(24)
      .text('GorPliaj', 48, 52, { align: 'center', width: document.page.width - 96 });
    document.fillColor('#c89241').fontSize(11)
      .text('EVENT TICKET', 48, 82, { align: 'center', width: document.page.width - 96 });

    document.fillColor('#5c3a1e').fontSize(18)
      .text(eventTitle, 48, 112, { align: 'center', width: document.page.width - 96 });
    document.font('Helvetica').fontSize(11)
      .text(getTicketDateLabel(order, ticket), 48, 142, { align: 'center', width: document.page.width - 96 });

    document.image(qr, (document.page.width - 150) / 2, 175, { width: 150 });
    document.fillColor('#c89241').font('Helvetica-Bold').fontSize(18)
      .text(ticket.code, 48, 335, { align: 'center', width: document.page.width - 96 });

    document.fillColor('#5c3a1e').font('Helvetica').fontSize(11);
    const details = [
      `Order: ${order.orderNumber}`,
      `Type: ${localizedText(ticket.ticketType?.name) || '-'}`,
      `Date: ${getTicketDateLabel(order, ticket)}`,
      `Holder: ${ticket.holderName || order.customerName}`,
      `Status: ${ticket.status}`
    ];
    details.forEach((line, index) => {
      document.text(line, 56, 380 + index * 20, { width: document.page.width - 112 });
    });

    document.fillColor('#888888').fontSize(8)
      .text('Show this QR code at the entrance. Each ticket can be used once.', 48, document.page.height - 70, {
        align: 'center',
        width: document.page.width - 96
      });
  }

  document.end();
  return finished;
}

module.exports = { generateTicketOrderPdf };
