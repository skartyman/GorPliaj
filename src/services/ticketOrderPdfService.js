const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const {
  localizedText,
  formatDateTime,
  formatMoney,
  getBaseUrl
} = require('../utils/deliveryPresentation');

function getTicketDateLabel(order, ticket) {
  const session = ticket.eventSession || order.eventSession || ticket.ticketType?.eventSession;
  if (session?.startsAt) {
    return formatDateTime(session.startsAt);
  }
  return formatDateTime(order.event?.startAt);
}

async function generateTicketOrderPdf(order) {
  const document = new PDFDocument({ size: 'A5', margin: 0, autoFirstPage: false });
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));

  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  const baseUrl = getBaseUrl();
  const eventTitle = localizedText(order.event?.title) || `Event #${order.eventId}`;

  for (const ticket of order.tickets) {
    document.addPage();
    const verifyUrl = `${baseUrl}/api/admin/tickets/verify/${encodeURIComponent(ticket.code)}`;
    const qr = await QRCode.toBuffer(verifyUrl, { width: 280, margin: 2 });
    const ticketTypeName = localizedText(ticket.ticketType?.name) || 'Entry ticket';
    const holderName = ticket.holderName || order.customerName || '-';
    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const margin = 26;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    document.rect(0, 0, pageWidth, pageHeight).fill('#f4ede2');
    document.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 26).fill('#fffdf9');

    document.save();
    document.roundedRect(margin, margin, contentWidth, 124, 26).clip();
    const headerGradient = document.linearGradient(margin, margin, margin + contentWidth, margin + 124);
    headerGradient.stop(0, '#231814').stop(0.58, '#5d3824').stop(1, '#c89241');
    document.rect(margin, margin, contentWidth, 124).fill(headerGradient);
    document.restore();

    y += 24;
    document.fillColor('#f7e8cf').font('Helvetica').fontSize(11)
      .text('GORPLIAJ', margin + 22, y, { characterSpacing: 3 });
    y += 18;
    document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
      .text('Event Ticket', margin + 22, y, { width: contentWidth - 44 });
    y += 28;
    document.fillColor('#f2dfcd').font('Helvetica').fontSize(10)
      .text(ticketTypeName, margin + 22, y, { width: contentWidth - 44 });

    y = margin + 144;
    document.fillColor('#2f2219').font('Helvetica-Bold').fontSize(19)
      .text(eventTitle, margin + 24, y, { width: contentWidth - 48, align: 'center' });
    y += 28;
    document.fillColor('#7c6b59').font('Helvetica').fontSize(10)
      .text(getTicketDateLabel(order, ticket), margin + 24, y, { width: contentWidth - 48, align: 'center' });

    y += 24;
    document.roundedRect(margin + 46, y, contentWidth - 92, 132, 22).fill('#faf6f1');
    document.image(qr, (pageWidth - 116) / 2, y + 10, { width: 116, height: 116 });

    y += 146;
    document.fillColor('#c89241').font('Helvetica-Bold').fontSize(18)
      .text(ticket.code, margin + 24, y, { width: contentWidth - 48, align: 'center' });

    y += 34;
    document.roundedRect(margin + 24, y, contentWidth - 48, 116, 18).fill('#fbf6ef');
    const rows = [
      ['Order', order.orderNumber],
      ['Holder', holderName],
      ['Type', ticketTypeName],
      ['Date', getTicketDateLabel(order, ticket)],
      ['Price', formatMoney(ticket.ticketType?.price || order.amount / Math.max(order.tickets.length, 1), ticket.ticketType?.currency || order.currency)],
      ['Status', ticket.status]
    ];
    rows.forEach(([label, value], index) => {
      const rowY = y + 14 + index * 16;
      document.fillColor('#8a745f').font('Helvetica').fontSize(8.4).text(label, margin + 40, rowY, { width: 60 });
      document.fillColor('#2f2219').font('Helvetica-Bold').fontSize(9.2).text(String(value), margin + 106, rowY, { width: contentWidth - 138 });
    });

    y += 134;
    document.fillColor('#7f7165').font('Helvetica').fontSize(7.5)
      .text('Show this QR code at the entrance. Each ticket is valid for one check-in only.', margin + 38, y, {
        align: 'center',
        width: contentWidth - 76
      });
  }

  document.end();
  return finished;
}

module.exports = { generateTicketOrderPdf };
