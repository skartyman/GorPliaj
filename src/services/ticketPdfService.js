const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const {
  localizedText,
  formatDate,
  formatTime,
  formatMoney,
  getBaseUrl
} = require('../utils/deliveryPresentation');

const fontPath = path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf');
const fontBoldPath = path.join(__dirname, '..', 'fonts', 'Roboto-Bold.ttf');

async function toQrBuffer(value, width = 320) {
  if (!value) return null;
  try {
    return await QRCode.toBuffer(value, { width, margin: 2 });
  } catch {
    return null;
  }
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
  depositAmount,
  totalPaid,
  entryTicketsAmount,
  entryTicketCount,
  entryTicketPrice,
  status,
  paymentStatus,
  verifyUrl,
  statusUrl,
  downloadUrl,
  depositVerifyUrl
}) {
  const deposit = Number(depositAmount || 0);
  const hasDeposit = deposit > 0;

  const doc = new PDFDocument({ size: [420, 760], margin: 24, autoFirstPage: false });
  doc.addPage({ size: [420, 760], margin: 24 });

  doc.registerFont('Roboto', fontPath);
  doc.registerFont('Roboto-Bold', fontBoldPath);

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
    const pageHeight = 760;
    const margin = 24;
    const contentWidth = pageWidth - margin * 2;
    const gold = '#c89241';
    const dark = '#2f2219';
    const deep = '#4b2f1f';
    const muted = '#7c6b59';
    const soft = '#fbf6ef';
    const line = '#eadbca';
    const isPaid = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';
    const paidTotal = Number(totalPaid || deposit || 0);
    const entryAmount = Number(entryTicketsAmount || 0);
    const reservationPosition = localizedText(tableName) || '-';
    const reservationZone = localizedText(zoneName) || '-';
    const eventName = localizedText(eventTitle);
    const appBaseUrl = getBaseUrl();
    let y = margin;

    doc.rect(0, 0, pageWidth, pageHeight).fill('#f4ede2');
    doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 28).fill('#fffdf9');

    doc.save();
    doc.roundedRect(margin, margin, contentWidth, 140, 28).clip();
    const headerGradient = doc.linearGradient(margin, margin, margin + contentWidth, margin + 140);
    headerGradient.stop(0, '#3f2416').stop(0.55, '#6d4328').stop(1, '#c89241');
    doc.rect(margin, margin, contentWidth, 140).fill(headerGradient);
    doc.restore();

    y += 16;
    doc.fillColor('#f7e8cf').font('Roboto').fontSize(10)
      .text('GORPLIAJ', margin + 24, y, { characterSpacing: 3 });
    y += 15;
    doc.fillColor('#ffffff').font('Roboto-Bold').fontSize(18)
      .text('Підтвердження бронювання', margin + 24, y, { width: contentWidth - 48 });
    y += 22;
    doc.fillColor('#f2dfcd').font('Roboto').fontSize(9.5)
      .text(hasDeposit ? 'Бронювання місця та квитанція про депозит' : 'Бронювання місця', margin + 24, y, { width: contentWidth - 48 });
    y += 18;
    doc.fillColor('#ffffff').font('Roboto-Bold').fontSize(17)
      .text(ticketCode, margin + 24, y);
    y += 16;
    doc.fillColor('#f2dfcd').font('Roboto').fontSize(8)
      .text(isPaid ? 'Оплачено та готово до пред\'явлення на вході' : 'Очікує підтвердження оплати', margin + 24, y);

    y = margin + 156;
    doc.fillColor(dark).font('Roboto-Bold').fontSize(14)
      .text(customerName, margin + 24, y, { width: contentWidth - 48 });
    y += 18;
    doc.fillColor(muted).font('Roboto').fontSize(9)
      .text(`${formatDate(reservationDate)}  •  ${formatTime(timeFrom)} - ${formatTime(timeTo)}  •  ${guests} гостей`, margin + 24, y, { width: contentWidth - 48 });
    y += 22;

    doc.roundedRect(margin + 18, y, contentWidth - 36, 138, 16).fill(soft);
    y += 14;

    const labelX = margin + 32;
    const valueX = margin + 140;
    const fields = [
      ['Гість', customerName],
      ['Телефон', customerPhone || '-'],
      ['Місце', reservationPosition],
      ['Зона', reservationZone],
      ...(eventName ? [['Подія', eventName]] : []),
      ['Дата', formatDate(reservationDate)],
      ['Час', `${formatTime(timeFrom)} - ${formatTime(timeTo)}`],
      ['Статус оплати', isPaid ? 'Оплачено' : 'Очікує оплати']
    ];

    fields.forEach(([label, value], index) => {
      const rowY = y + index * 14;
      doc.font('Roboto').fontSize(8).fillColor('#8a745f').text(label, labelX, rowY, { width: 100 });
      doc.font('Roboto-Bold').fontSize(8.5).fillColor(dark).text(String(value), valueX, rowY, { width: contentWidth - 164 });
    });

    y += 150;
    if (hasDeposit) {
      const cardWidth = (contentWidth - 52) / 2;

      doc.roundedRect(margin + 18, y, cardWidth, 92, 16).fill(deep);
      doc.fillColor('#d8bf9e').font('Roboto').fontSize(8.5).text('Депозит', margin + 32, y + 14);
      doc.fillColor('#ffffff').font('Roboto-Bold').fontSize(22).text(formatMoney(deposit), margin + 32, y + 30, { width: cardWidth - 28 });
      doc.fillColor('#f0dfcf').font('Roboto').fontSize(9)
        .text('Враховується у рахунку в закладі.', margin + 32, y + 60, { width: cardWidth - 28 });

      doc.roundedRect(margin + 34 + cardWidth, y, cardWidth, 92, 16).fill('#f3ede5');
      doc.fillColor('#8f6a44').font('Roboto').fontSize(8.5).text('Онлайн-оплата', margin + 48 + cardWidth, y + 14);
      doc.fillColor(dark).font('Roboto-Bold').fontSize(22).text(formatMoney(paidTotal), margin + 48 + cardWidth, y + 30, { width: cardWidth - 28 });
      doc.fillColor('#6d5948').font('Roboto').fontSize(9)
        .text(entryAmount > 0 ? `Вхідні квитки: ${formatMoney(entryAmount)}.` : 'Тільки депозит, без вхідних квитків.', margin + 48 + cardWidth, y + 60, { width: cardWidth - 28 });
    } else {
      const cardWidth = contentWidth - 36;
      doc.roundedRect(margin + 18, y, cardWidth, 92, 16).fill('#f3ede5');
      doc.fillColor('#8f6a44').font('Roboto').fontSize(8.5).text('Онлайн-оплата', margin + 32, y + 14);
      doc.fillColor(dark).font('Roboto-Bold').fontSize(22).text(formatMoney(paidTotal), margin + 32, y + 30, { width: cardWidth - 28 });

      let paymentDesc = '';
      if (entryAmount > 0) {
        paymentDesc = `Вхідні квитки: ${formatMoney(entryAmount)}.`;
      } else {
        paymentDesc = 'Оплата за послуги пляжу (без додаткового депозиту).';
      }
      doc.fillColor('#6d5948').font('Roboto').fontSize(9)
        .text(paymentDesc, margin + 32, y + 60, { width: cardWidth - 28 });
    }

    y += 108;
    if (entryAmount > 0) {
      doc.roundedRect(margin + 18, y, contentWidth - 36, 42, 14).fill('#faf6f1');
      doc.fillColor(dark).font('Roboto-Bold').fontSize(9)
        .text('Деталі платежу', margin + 32, y + 10);

      const detailsText = hasDeposit
        ? `Депозит: ${formatMoney(deposit)}   •   Вхідні: ${entryTicketCount || guests} x ${formatMoney(entryTicketPrice)} = ${formatMoney(entryAmount)}`
        : `Вхідні квитки: ${entryTicketCount || guests} x ${formatMoney(entryTicketPrice)} = ${formatMoney(entryAmount)}`;

      doc.fillColor(muted).font('Roboto').fontSize(8)
        .text(detailsText, margin + 32, y + 24, { width: contentWidth - 64 });
      y += 54;
    }

    const hasDepositQr = Boolean(depositQrBuffer && hasDeposit);
    const qrBlockWidth = hasDepositQr ? (contentWidth - 52) / 2 : contentWidth - 36;
    const qrBlockSize = hasDepositQr ? 130 : 130;
    const qrImageSize = 90;
    const qrTop = y;

    if (verifyQrBuffer) {
      doc.roundedRect(margin + 18, qrTop, qrBlockWidth, qrBlockSize, 16).strokeColor(line).lineWidth(1).stroke();
      doc.image(verifyQrBuffer, margin + 18 + (qrBlockWidth - qrImageSize) / 2, qrTop + 14, { width: qrImageSize, height: qrImageSize });
      doc.fillColor(dark).font('Roboto-Bold').fontSize(10)
        .text('QR-код для входу', margin + 24, qrTop + 110, { width: qrBlockWidth - 12, align: 'center' });
      doc.fillColor(muted).font('Roboto').fontSize(7)
        .text('Пред\'явіть цей код адміністратору при вході.', margin + 28, qrTop + 122, { width: qrBlockWidth - 20, align: 'center' });
    }

    if (hasDepositQr) {
      const rightX = margin + 34 + qrBlockWidth;
      doc.roundedRect(rightX, qrTop, qrBlockWidth, qrBlockSize, 16).strokeColor(line).lineWidth(1).stroke();
      doc.image(depositQrBuffer, rightX + (qrBlockWidth - qrImageSize) / 2, qrTop + 14, { width: qrImageSize, height: qrImageSize });
      doc.fillColor(dark).font('Roboto-Bold').fontSize(10)
        .text('QR-код депозиту', rightX + 8, qrTop + 110, { width: qrBlockWidth - 16, align: 'center' });
      doc.fillColor(muted).font('Roboto').fontSize(7)
        .text('Для підтвердження списання депозиту.', rightX + 12, qrTop + 122, { width: qrBlockWidth - 24, align: 'center' });
    }

    y = qrTop + qrBlockSize + 12;
    doc.moveTo(margin + 24, y).lineTo(margin + contentWidth - 24, y).strokeColor(line).lineWidth(1).stroke();
    y += 10;

    const noticeText = hasDeposit
      ? 'Пред\'явіть цей PDF на вході. Депозит зараховується у рахунок. Збережіть другий QR для підтвердження депозиту офіціантом.'
      : 'Пред\'явіть цей PDF на вході. Оплата зараховується у ваш фінальний рахунок у закладі.';

    doc.fillColor('#7f7165').font('Roboto').fontSize(7)
      .text(noticeText, margin + 24, y, { width: contentWidth - 48, align: 'center' });
    y += 26;

    const footerLinks = [appBaseUrl];
    if (downloadUrl) footerLinks.push(downloadUrl);
    doc.fillColor('#aaaaaa').font('Roboto').fontSize(6.5)
      .text(footerLinks.join('  •  '), margin + 24, y, { width: contentWidth - 48, align: 'center' });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
