const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const {
  localizedText,
  formatDate,
  formatTime,
  formatMoney,
  getBaseUrl
} = require('../utils/deliveryPresentation');
const { getLogoPath, registerPdfFonts } = require('../utils/pdfBranding');

async function toQrBuffer(value, width = 360) {
  if (!value) return null;
  try {
    return await QRCode.toBuffer(value, {
      type: 'png',
      width,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#102f35', light: '#ffffff' }
    });
  } catch {
    return null;
  }
}

function drawFact(doc, fonts, { x, y, width, label, value, height = 54 }) {
  doc.roundedRect(x, y, width, height, 10).fill('#f1f8f7');
  doc.fillColor('#668589').font(fonts.regular).fontSize(8.5)
    .text(label, x + 12, y + 10, { width: width - 24, characterSpacing: 0.35 });
  doc.fillColor('#173d43').font(fonts.bold).fontSize(11.5)
    .text(String(value || '-'), x + 12, y + 27, { width: width - 24, height: height - 31, ellipsis: true });
}

function drawQrCard(doc, fonts, { x, y, width, qr, label }) {
  const height = 176;
  doc.roundedRect(x, y, width, height, 12).fillAndStroke('#ffffff', '#d5e8e5');
  const size = Math.min(126, width - 24);
  if (qr) {
    doc.image(qr, x + (width - size) / 2, y + 12, { width: size, height: size });
  }
  doc.fillColor('#365d62').font(fonts.bold).fontSize(9)
    .text(label, x + 8, y + 145, { width: width - 16, align: 'center' });
}

async function generateTicketPdf({
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
  rentalAmount,
  depositAmount,
  totalPaid,
  entryTicketsAmount,
  status,
  paymentStatus,
  verifyUrl,
  statusUrl,
  depositVerifyUrl
}) {
  const rental = Number(rentalAmount || 0);
  const deposit = Number(depositAmount || 0);
  const entry = Number(entryTicketsAmount || 0);
  const total = Number(totalPaid || rental + deposit + entry || 0);
  const hasDeposit = deposit > 0;
  const hasPayment = total > 0;
  const isConfirmed = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';

  const doc = new PDFDocument({ size: [420, 760], margin: 0, autoFirstPage: false });
  doc.addPage({ size: [420, 760], margin: 0 });
  const fonts = registerPdfFonts(doc);
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  const [verifyQrBuffer, depositQrBuffer] = await Promise.all([
    toQrBuffer(verifyUrl),
    hasDeposit ? toQrBuffer(depositVerifyUrl || statusUrl) : Promise.resolve(null)
  ]);

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = 420;
    const margin = 18;
    const cardWidth = pageWidth - margin * 2;
    const innerX = margin + 20;
    const innerWidth = cardWidth - 40;
    const gap = 10;
    const half = (innerWidth - gap) / 2;
    const eventName = localizedText(eventTitle);
    const position = localizedText(tableName) || '-';
    const zone = localizedText(zoneName) || '-';
    const logoPath = getLogoPath();

    doc.rect(0, 0, 420, 760).fill('#e9f5f3');
    doc.roundedRect(margin, 14, cardWidth, 732, 18).fill('#ffffff');
    doc.roundedRect(margin, 14, cardWidth, 126, 18).fill('#123f47');

    if (logoPath) {
      try {
        doc.image(logoPath, innerX, 31, { fit: [58, 74], align: 'center', valign: 'center' });
      } catch {}
    }

    doc.fillColor('#b9ded8').font(fonts.bold).fontSize(8.5)
      .text('ГОРПЛЯЖ · ОДЕСА', innerX + 76, 38, { width: innerWidth - 76, characterSpacing: 1.1 });
    doc.fillColor('#ffffff').font(fonts.bold).fontSize(17)
      .text(eventName ? 'Бронювання на подію' : 'Підтвердження бронювання', innerX + 76, 56, { width: innerWidth - 76, lineBreak: false });
    doc.fillColor('#dcecea').font(fonts.regular).fontSize(9.5)
      .text(isConfirmed ? 'Місце закріплено за вами' : 'Очікує завершення оплати', innerX + 76, 82, { width: innerWidth - 76 });
    doc.fillColor('#f1d08a').font(fonts.bold).fontSize(10)
      .text(ticketCode, innerX + 76, 102, { width: innerWidth - 76, characterSpacing: 1.2 });

    let y = 158;
    doc.fillColor('#173d43').font(fonts.bold).fontSize(15).text('Деталі візиту', innerX, y);
    y += 27;

    drawFact(doc, fonts, { x: innerX, y, width: half, label: 'ДАТА', value: formatDate(reservationDate) });
    drawFact(doc, fonts, { x: innerX + half + gap, y, width: half, label: 'ЧАС', value: [formatTime(timeFrom), formatTime(timeTo)].filter(Boolean).join(' - ') });
    y += 64;
    drawFact(doc, fonts, { x: innerX, y, width: half, label: 'МІСЦЕ', value: position });
    drawFact(doc, fonts, { x: innerX + half + gap, y, width: half, label: 'ГОСТЕЙ', value: `${guests || 0}` });
    y += 64;
    drawFact(doc, fonts, { x: innerX, y, width: eventName ? half : innerWidth, label: 'ЗОНА', value: zone });
    if (eventName) drawFact(doc, fonts, { x: innerX + half + gap, y, width: half, label: 'ПОДІЯ', value: eventName });
    y += 68;

    doc.roundedRect(innerX, y, innerWidth, 62, 11).fill(hasPayment ? '#fff6df' : '#edf7f5');
    doc.fillColor(hasPayment ? '#80652d' : '#55777b').font(fonts.regular).fontSize(8.5)
      .text('ОПЛАТА', innerX + 14, y + 11, { characterSpacing: 0.4 });
    doc.fillColor(hasPayment ? '#5c471f' : '#173d43').font(fonts.bold).fontSize(16)
      .text(hasPayment ? formatMoney(total) : 'Оплата не потрібна', innerX + 14, y + 27, { width: innerWidth - 28 });
    const breakdown = [
      rental > 0 ? `оренда ${formatMoney(rental)}` : '',
      deposit > 0 ? `депозит ${formatMoney(deposit)}` : '',
      entry > 0 ? `квитки ${formatMoney(entry)}` : ''
    ].filter(Boolean).join(' · ');
    if (breakdown) {
      doc.fillColor('#80652d').font(fonts.regular).fontSize(7.5)
        .text(breakdown, innerX + 138, y + 31, { width: innerWidth - 152, align: 'right' });
    }
    y += 78;

    const hasDepositQr = Boolean(depositQrBuffer && hasDeposit);
    const qrWidth = hasDepositQr ? half : innerWidth;
    drawQrCard(doc, fonts, {
      x: innerX,
      y,
      width: qrWidth,
      qr: verifyQrBuffer,
      label: eventName ? 'QR для входу на подію' : 'QR бронювання для входу'
    });
    if (hasDepositQr) {
      drawQrCard(doc, fonts, {
        x: innerX + half + gap,
        y,
        width: half,
        qr: depositQrBuffer,
        label: 'QR депозиту'
      });
    }

    const footerY = y + 191;
    doc.fillColor('#365d62').font(fonts.bold).fontSize(9.5)
      .text(customerName || 'Гість Горпляж', innerX, footerY, { width: innerWidth, align: 'center' });
    if (customerPhone) {
      doc.fillColor('#668589').font(fonts.regular).fontSize(8)
        .text(customerPhone, innerX, footerY + 15, { width: innerWidth, align: 'center' });
    }
    doc.fillColor('#78979a').font(fonts.regular).fontSize(7.5)
      .text(`Збережіть цей PDF у телефоні та покажіть QR на вході. · ${getBaseUrl()}`, innerX, 717, { width: innerWidth, align: 'center' });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
