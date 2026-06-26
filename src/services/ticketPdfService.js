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

  const doc = new PDFDocument({ size: [420, 760], margin: 24 });
  
  // Register Roboto fonts to support Cyrillic characters correctly
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
    doc.roundedRect(margin, margin, contentWidth, 148, 28).clip();
    const headerGradient = doc.linearGradient(margin, margin, margin + contentWidth, margin + 148);
    headerGradient.stop(0, '#3f2416').stop(0.55, '#6d4328').stop(1, '#c89241');
    doc.rect(margin, margin, contentWidth, 148).fill(headerGradient);
    doc.restore();

    y += 20;
    doc.fillColor('#f7e8cf').font('Roboto').fontSize(10)
      .text('GORPLIAJ', margin + 24, y, { characterSpacing: 3 });
    y += 16;
    doc.fillColor('#ffffff').font('Roboto-Bold').fontSize(19)
      .text('Підтвердження бронювання', margin + 24, y, { width: contentWidth - 48 });
    y += 24;
    doc.fillColor('#f2dfcd').font('Roboto').fontSize(10)
      .text(hasDeposit ? 'Бронювання місця та квитанція про депозит' : 'Бронювання місця', margin + 24, y, { width: contentWidth - 48 });
    y += 22;
    doc.fillColor('#ffffff').font('Roboto-Bold').fontSize(18)
      .text(ticketCode, margin + 24, y);
    y += 18;
    doc.fillColor('#f2dfcd').font('Roboto').fontSize(8.5)
      .text(isPaid ? 'Оплачено та готово до пред\'явлення на вході' : 'Очікує підтвердження оплати', margin + 24, y);

    y = margin + 164;
    doc.fillColor(dark).font('Roboto-Bold').fontSize(16)
      .text(customerName, margin + 24, y, { width: contentWidth - 48 });
    y += 22;
    doc.fillColor(muted).font('Roboto').fontSize(10)
      .text(`${formatDate(reservationDate)}  •  ${formatTime(timeFrom)} - ${formatTime(timeTo)}  •  ${guests} гостей`, margin + 24, y, { width: contentWidth - 48 });
    y += 28;

    doc.roundedRect(margin + 18, y, contentWidth - 36, 158, 20).fill(soft);
    y += 18;

    const labelX = margin + 34;
    const valueX = margin + 148; // Increased from 128 to 148 to give more space for Ukrainian labels like "Статус оплати"
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
      const rowY = y + index * 16;
      doc.font('Roboto').fontSize(8.5).fillColor('#8a745f').text(label, labelX, rowY, { width: 104 });
      doc.font('Roboto-Bold').fontSize(9.2).fillColor(dark).text(String(value), valueX, rowY, { width: contentWidth - 172 });
    });

    y += 174;
    if (hasDeposit) {
      const cardWidth = (contentWidth - 52) / 2;

      doc.roundedRect(margin + 18, y, cardWidth, 110, 18).fill(deep);
      doc.fillColor('#d8bf9e').font('Roboto').fontSize(9).text('Депозит', margin + 34, y + 18);
      doc.fillColor('#ffffff').font('Roboto-Bold').fontSize(24).text(formatMoney(deposit), margin + 34, y + 36, { width: cardWidth - 32 });
      doc.fillColor('#f0dfcf').font('Roboto').fontSize(10)
        .text('Враховується у рахунку в закладі.', margin + 34, y + 70, { width: cardWidth - 32 });

      doc.roundedRect(margin + 34 + cardWidth, y, cardWidth, 110, 18).fill('#f3ede5');
      doc.fillColor('#8f6a44').font('Roboto').fontSize(9).text('Онлайн-оплата', margin + 50 + cardWidth, y + 18);
      doc.fillColor(dark).font('Roboto-Bold').fontSize(24).text(formatMoney(paidTotal), margin + 50 + cardWidth, y + 36, { width: cardWidth - 32 });
      doc.fillColor('#6d5948').font('Roboto').fontSize(10)
        .text(entryAmount > 0 ? `Вхідні квитки: ${formatMoney(entryAmount)}.` : 'Тільки депозит, без вхідних квитків.', margin + 50 + cardWidth, y + 70, { width: cardWidth - 32 });
    } else {
      const cardWidth = contentWidth - 36;
      doc.roundedRect(margin + 18, y, cardWidth, 110, 18).fill('#f3ede5');
      doc.fillColor('#8f6a44').font('Roboto').fontSize(9).text('Онлайн-оплата', margin + 34, y + 18);
      doc.fillColor(dark).font('Roboto-Bold').fontSize(24).text(formatMoney(paidTotal), margin + 34, y + 36, { width: cardWidth - 32 });
      
      let paymentDesc = '';
      if (entryAmount > 0) {
        paymentDesc = `Вхідні квитки: ${formatMoney(entryAmount)}.`;
      } else {
        paymentDesc = 'Оплата за послуги пляжу (без додаткового депозиту).';
      }
      doc.fillColor('#6d5948').font('Roboto').fontSize(10)
        .text(paymentDesc, margin + 34, y + 70, { width: cardWidth - 32 });
    }

    y += 128;
    if (entryAmount > 0) {
      doc.roundedRect(margin + 18, y, contentWidth - 36, 54, 16).fill('#faf6f1');
      doc.fillColor(dark).font('Roboto-Bold').fontSize(10)
        .text('Деталі платежу', margin + 34, y + 12);
      
      const detailsText = hasDeposit
        ? `Депозит: ${formatMoney(deposit)}   •   Вхідні: ${entryTicketCount || guests} x ${formatMoney(entryTicketPrice)} = ${formatMoney(entryAmount)}`
        : `Вхідні квитки: ${entryTicketCount || guests} x ${formatMoney(entryTicketPrice)} = ${formatMoney(entryAmount)}`;

      doc.fillColor(muted).font('Roboto').fontSize(9)
        .text(detailsText, margin + 34, y + 28, { width: contentWidth - 68 });
      y += 70;
    }

    const hasDepositQr = Boolean(depositQrBuffer && hasDeposit);
    const qrBlockWidth = hasDepositQr ? (contentWidth - 52) / 2 : contentWidth - 36;
    const qrTop = y;

    if (verifyQrBuffer) {
      doc.roundedRect(margin + 18, qrTop, qrBlockWidth, 160, 18).strokeColor(line).lineWidth(1).stroke();
      doc.image(verifyQrBuffer, margin + 18 + (qrBlockWidth - 110) / 2, qrTop + 20, { width: 110, height: 110 });
      doc.fillColor(dark).font('Roboto-Bold').fontSize(11)
        .text('QR-код для входу', margin + 26, qrTop + 136, { width: qrBlockWidth - 16, align: 'center' });
      doc.fillColor(muted).font('Roboto').fontSize(8)
        .text('Пред\'явіть цей код адміністратору при вході для реєстрації.', margin + 30, qrTop + 150, { width: qrBlockWidth - 24, align: 'center' });
    }

    if (hasDepositQr) {
      const rightX = margin + 34 + qrBlockWidth;
      doc.roundedRect(rightX, qrTop, qrBlockWidth, 160, 18).strokeColor(line).lineWidth(1).stroke();
      doc.image(depositQrBuffer, rightX + (qrBlockWidth - 110) / 2, qrTop + 20, { width: 110, height: 110 });
      doc.fillColor(dark).font('Roboto-Bold').fontSize(11)
        .text('QR-код депозиту', rightX + 8, qrTop + 136, { width: qrBlockWidth - 16, align: 'center' });
      doc.fillColor(muted).font('Roboto').fontSize(8)
        .text('Для підтвердження та списання суми депозиту офіціантом.', rightX + 12, qrTop + 150, { width: qrBlockWidth - 24, align: 'center' });
    }

    y = qrTop + 178;
    doc.moveTo(margin + 24, y).lineTo(margin + contentWidth - 24, y).strokeColor(line).lineWidth(1).stroke();
    y += 14;

    const noticeText = hasDeposit
      ? 'Пред\'явіть цей PDF на вході. Депозит не є додатковою платою — він повністю зараховується у ваш фінальний рахунок у закладі. Збережіть другий QR-код для підтвердження депозиту офіціантом.'
      : 'Пред\'явіть цей PDF на вході. Депозит не є додатковою платою — він повністю зараховується у ваш фінальний рахунок у закладі.';

    doc.fillColor('#7f7165').font('Roboto').fontSize(7.6)
      .text(noticeText, margin + 24, y, { width: contentWidth - 48, align: 'center' });
    y += 34;

    const footerLinks = [appBaseUrl];
    if (downloadUrl) footerLinks.push(downloadUrl);
    doc.fillColor('#aaaaaa').font('Roboto').fontSize(7)
      .text(footerLinks.join('  •  '), margin + 24, y, { width: contentWidth - 48, align: 'center' });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
