const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const {
  localizedText,
  formatDate,
  formatTime,
  formatMoney,
  getBaseUrl
} = require('../utils/deliveryPresentation');
const {
  registerPdfFonts,
  getLogoPath,
  loadImageBuffer
} = require('../utils/pdfBranding');

function getTicketSession(order, ticket) {
  return ticket.eventSession || order.eventSession || ticket.ticketType?.eventSession || null;
}

function getTicketDateLabel(order, ticket) {
  const session = getTicketSession(order, ticket);
  if (session?.startsAt) {
    const dateLabel = formatDate(session.startsAt);
    const startTime = formatTime(session.startsAt);
    const endTime = session?.endsAt ? formatTime(session.endsAt) : '';
    return endTime ? `${dateLabel}, ${startTime} - ${endTime}` : `${dateLabel}, ${startTime}`;
  }

  if (order.event?.startAt) {
    const dateLabel = formatDate(order.event.startAt);
    const startTime = formatTime(order.event.startAt);
    const endTime = order.event?.endAt ? formatTime(order.event.endAt) : '';
    return endTime ? `${dateLabel}, ${startTime} - ${endTime}` : `${dateLabel}, ${startTime}`;
  }

  return '';
}

function getTicketPriceLabel(order, ticket) {
  return formatMoney(
    ticket.ticketType?.price || order.amount / Math.max(order.tickets.length, 1),
    ticket.ticketType?.currency || order.currency
  );
}

function drawRoundedImage(doc, imageBuffer, x, y, width, height, radius = 24) {
  doc.save();
  doc.roundedRect(x, y, width, height, radius).clip();
  doc.image(imageBuffer, x, y, {
    fit: [width, height],
    align: 'center',
    valign: 'center'
  });
  doc.restore();
}

function drawMetaPill(doc, fonts, x, y, width, label, value) {
  doc.roundedRect(x, y, width, 44, 16).fill('#f7f1e9');
  doc.fillColor('#8e7254').font(fonts.regular).fontSize(8)
    .text(label.toUpperCase(), x + 14, y + 8, { width: width - 28 });
  doc.fillColor('#241913').font(fonts.bold).fontSize(10.5)
    .text(value || '-', x + 14, y + 20, { width: width - 28 });
}

async function generateTicketOrderPdf(order) {
  const document = new PDFDocument({ size: 'A5', margin: 0, autoFirstPage: false });
  const fonts = registerPdfFonts(document);

  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));

  const finished = new Promise((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  const baseUrl = getBaseUrl();
  const logoBuffer = await loadImageBuffer(getLogoPath());
  const posterBuffer = await loadImageBuffer(order.event?.posterImage);
  const eventTitle = localizedText(order.event?.title) || `Подія #${order.eventId}`;

  for (const ticket of order.tickets) {
    const verifyUrl = `${baseUrl}/api/admin/tickets/verify/${encodeURIComponent(ticket.code)}`;
    const qr = await QRCode.toBuffer(verifyUrl, { width: 320, margin: 1 });
    const ticketTypeName = localizedText(ticket.ticketType?.name) || 'Вхідний квиток';
    const holderName = ticket.holderName || order.customerName || '-';
    document.addPage();
    const pageWidth = document.page.width;
    const pageHeight = document.page.height;
    const margin = 22;
    const cardX = margin;
    const cardY = margin;
    const cardWidth = pageWidth - margin * 2;
    const cardHeight = pageHeight - margin * 2;
    const heroHeight = 162;
    const qrSize = 118;
    const detailTop = 256;

    document.rect(0, 0, pageWidth, pageHeight).fill('#efe5d6');
    document.roundedRect(cardX, cardY, cardWidth, cardHeight, 28).fill('#fffdf9');

    if (posterBuffer) {
      drawRoundedImage(document, posterBuffer, cardX, cardY, cardWidth, heroHeight, 28);
      document.save();
      document.roundedRect(cardX, cardY, cardWidth, heroHeight, 28).clip();
      document.rect(cardX, cardY, cardWidth, heroHeight).fillOpacity(0.36).fill('#120d0b');
      document.fillOpacity(1);
      document.restore();
    } else {
      document.save();
      document.roundedRect(cardX, cardY, cardWidth, heroHeight, 28).clip();
      const gradient = document.linearGradient(cardX, cardY, cardX + cardWidth, cardY + heroHeight);
      gradient.stop(0, '#1e1511').stop(0.55, '#5b3523').stop(1, '#d29b49');
      document.rect(cardX, cardY, cardWidth, heroHeight).fill(gradient);
      document.restore();
    }

    if (logoBuffer) {
      document.roundedRect(cardX + 18, cardY + 18, 54, 54, 18).fillOpacity(0.9).fill('#fff8ee');
      document.fillOpacity(1);
      document.image(logoBuffer, cardX + 25, cardY + 25, { fit: [40, 40], align: 'center', valign: 'center' });
    }

    document.roundedRect(cardX + cardWidth - 126, cardY + 18, 108, 28, 14).fillOpacity(0.88).fill('#201612');
    document.fillOpacity(1);
    document.fillColor('#f0d6b0').font(fonts.bold).fontSize(8.5)
      .text('GorPliaj Event', cardX + cardWidth - 126, cardY + 27, { width: 108, align: 'center' });

    const headerTextX = cardX + 20;
    const headerTextWidth = cardWidth - 40;
    document.fillColor('#ffffff').font(fonts.regular).fontSize(11)
      .text('Квиток на подію', headerTextX, cardY + 86, { width: headerTextWidth });
    document.fillColor('#fff6ea').font(fonts.bold).fontSize(23)
      .text(eventTitle, headerTextX, cardY + 102, { width: headerTextWidth - 28 });

    document.roundedRect(cardX + 20, cardY + heroHeight - 36, 166, 26, 13).fillOpacity(0.9).fill('#fff4e2');
    document.fillOpacity(1);
    document.fillColor('#352117').font(fonts.bold).fontSize(10)
      .text(getTicketDateLabel(order, ticket) || 'Дата буде уточнена', cardX + 32, cardY + heroHeight - 28, {
        width: 142
      });

    document.fillColor('#241913').font(fonts.bold).fontSize(20)
      .text(ticket.code, cardX + 20, cardY + heroHeight + 24, { width: cardWidth - 40 });

    document.fillColor('#7a6450').font(fonts.regular).fontSize(10.5)
      .text('Покажіть цей QR-код на вході. Один квиток = один прохід.', cardX + 20, cardY + heroHeight + 52, {
        width: cardWidth - 170
      });

    document.roundedRect(cardX + cardWidth - 152, cardY + heroHeight + 16, 132, 132, 24).fill('#faf5ee');
    document.image(qr, cardX + cardWidth - 145, cardY + heroHeight + 23, { width: qrSize, height: qrSize });

    drawMetaPill(document, fonts, cardX + 20, detailTop, (cardWidth - 52) / 2, 'Гість', holderName);
    drawMetaPill(document, fonts, cardX + 32 + (cardWidth - 52) / 2, detailTop, (cardWidth - 52) / 2, 'Тип квитка', ticketTypeName);
    drawMetaPill(document, fonts, cardX + 20, detailTop + 56, (cardWidth - 52) / 2, 'Замовлення', order.orderNumber);
    drawMetaPill(document, fonts, cardX + 32 + (cardWidth - 52) / 2, detailTop + 56, (cardWidth - 52) / 2, 'Вартість', getTicketPriceLabel(order, ticket));

    document.roundedRect(cardX + 20, detailTop + 114, cardWidth - 40, 74, 20).fill('#f8f2ea');
    document.fillColor('#8e7254').font(fonts.regular).fontSize(8)
      .text('НАГАДУВАННЯ', cardX + 18, detailTop + 126, { width: cardWidth - 36, align: 'center' });
    document.fillColor('#2c2019').font(fonts.bold).fontSize(11.2)
      .text('Збережіть PDF або відкрийте лист перед входом - так квиток буде під рукою навіть без пошуку в пошті.', cardX + 36, detailTop + 142, {
        width: cardWidth - 72,
        align: 'center'
      });

    document.fillColor('#8a745f').font(fonts.regular).fontSize(8.5)
      .text('GorPliaj - Odesa - gorpliaj.ua', cardX + 20, cardY + cardHeight - 24, {
        width: cardWidth - 40,
        align: 'center'
      });
  }

  document.end();
  return finished;
}

module.exports = { generateTicketOrderPdf };
