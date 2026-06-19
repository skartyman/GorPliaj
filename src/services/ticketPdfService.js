const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const {
  localizedText,
  formatDate,
  formatTime,
  formatMoney,
  getBaseUrl
} = require('../utils/deliveryPresentation');

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
  const doc = new PDFDocument({ size: [420, 760], margin: 24 });
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  const [verifyQrBuffer, depositQrBuffer] = await Promise.all([
    toQrBuffer(verifyUrl),
    toQrBuffer(depositVerifyUrl || statusUrl)
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
    const deposit = Number(depositAmount || 0);
    const paidTotal = Number(totalPaid || deposit || 0);
    const entryAmount = Number(entryTicketsAmount || 0);
    const hasDeposit = deposit > 0;
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

    y += 26;
    doc.fillColor('#f7e8cf').font('Helvetica').fontSize(11)
      .text('GORPLIAJ', margin + 24, y, { characterSpacing: 3 });
    y += 18;
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24)
      .text('Booking Confirmation', margin + 24, y, { width: contentWidth - 48 });
    y += 32;
    doc.fillColor('#f2dfcd').font('Helvetica').fontSize(11)
      .text('Table reservation and deposit receipt', margin + 24, y, { width: contentWidth - 48 });
    y += 26;
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
      .text(ticketCode, margin + 24, y);
    y += 18;
    doc.fillColor('#f2dfcd').font('Helvetica').fontSize(9)
      .text(isPaid ? 'Paid and ready to show at the entrance' : 'Awaiting payment confirmation', margin + 24, y);

    y = margin + 164;
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(16)
      .text(customerName, margin + 24, y, { width: contentWidth - 48 });
    y += 22;
    doc.fillColor(muted).font('Helvetica').fontSize(10)
      .text(`${formatDate(reservationDate)}  •  ${formatTime(timeFrom)} - ${formatTime(timeTo)}  •  ${guests} guests`, margin + 24, y, { width: contentWidth - 48 });
    y += 28;

    doc.roundedRect(margin + 18, y, contentWidth - 36, 158, 20).fill(soft);
    y += 18;

    const labelX = margin + 34;
    const valueX = margin + 128;
    const fields = [
      ['Guest', customerName],
      ['Phone', customerPhone || '-'],
      ['Position', reservationPosition],
      ['Zone', reservationZone],
      ...(eventName ? [['Event', eventName]] : []),
      ['Date', formatDate(reservationDate)],
      ['Time', `${formatTime(timeFrom)} - ${formatTime(timeTo)}`],
      ['Payment', isPaid ? 'Paid' : 'Waiting']
    ];

    fields.forEach(([label, value], index) => {
      const rowY = y + index * 16;
      doc.font('Helvetica').fontSize(8.5).fillColor('#8a745f').text(label, labelX, rowY, { width: 84 });
      doc.font('Helvetica-Bold').fontSize(9.2).fillColor(dark).text(String(value), valueX, rowY, { width: contentWidth - 152 });
    });

    y += 174;
    const cardWidth = (contentWidth - 52) / 2;

    doc.roundedRect(margin + 18, y, cardWidth, 110, 18).fill(deep);
    doc.fillColor('#d8bf9e').font('Helvetica').fontSize(9).text('Deposit', margin + 34, y + 18);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text(formatMoney(deposit), margin + 34, y + 36, { width: cardWidth - 32 });
    doc.fillColor('#f0dfcf').font('Helvetica').fontSize(10)
      .text(hasDeposit ? 'Included in the final bill at the venue.' : 'No deposit was required for this booking.', margin + 34, y + 70, { width: cardWidth - 32 });

    doc.roundedRect(margin + 34 + cardWidth, y, cardWidth, 110, 18).fill('#f3ede5');
    doc.fillColor('#8f6a44').font('Helvetica').fontSize(9).text('Online payment', margin + 50 + cardWidth, y + 18);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(24).text(formatMoney(paidTotal), margin + 50 + cardWidth, y + 36, { width: cardWidth - 32 });
    doc.fillColor('#6d5948').font('Helvetica').fontSize(10)
      .text(entryAmount > 0 ? `Entry tickets included: ${formatMoney(entryAmount)}.` : 'Deposit only, no extra entry tickets.', margin + 50 + cardWidth, y + 70, { width: cardWidth - 32 });

    y += 128;
    if (entryAmount > 0) {
      doc.roundedRect(margin + 18, y, contentWidth - 36, 54, 16).fill('#faf6f1');
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(10)
        .text('Payment breakdown', margin + 34, y + 12);
      doc.fillColor(muted).font('Helvetica').fontSize(9)
        .text(`Deposit: ${formatMoney(deposit)}   •   Entry: ${entryTicketCount || guests} x ${formatMoney(entryTicketPrice)} = ${formatMoney(entryAmount)}`, margin + 34, y + 28, { width: contentWidth - 68 });
      y += 70;
    }

    const hasDepositQr = Boolean(depositQrBuffer && hasDeposit);
    const qrBlockWidth = hasDepositQr ? (contentWidth - 52) / 2 : contentWidth - 36;
    const qrTop = y;

    if (verifyQrBuffer) {
      doc.roundedRect(margin + 18, qrTop, qrBlockWidth, 160, 18).strokeColor(line).lineWidth(1).stroke();
      doc.image(verifyQrBuffer, margin + 18 + (qrBlockWidth - 110) / 2, qrTop + 20, { width: 110, height: 110 });
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(11)
        .text('Entry QR', margin + 26, qrTop + 136, { width: qrBlockWidth - 16, align: 'center' });
      doc.fillColor(muted).font('Helvetica').fontSize(8)
        .text('Use this code for booking verification and guest check-in.', margin + 30, qrTop + 150, { width: qrBlockWidth - 24, align: 'center' });
    }

    if (hasDepositQr) {
      const rightX = margin + 34 + qrBlockWidth;
      doc.roundedRect(rightX, qrTop, qrBlockWidth, 160, 18).strokeColor(line).lineWidth(1).stroke();
      doc.image(depositQrBuffer, rightX + (qrBlockWidth - 110) / 2, qrTop + 20, { width: 110, height: 110 });
      doc.fillColor(dark).font('Helvetica-Bold').fontSize(11)
        .text('Deposit QR', rightX + 8, qrTop + 136, { width: qrBlockWidth - 16, align: 'center' });
      doc.fillColor(muted).font('Helvetica').fontSize(8)
        .text('Separate scan for deposit amount and payment confirmation.', rightX + 12, qrTop + 150, { width: qrBlockWidth - 24, align: 'center' });
    }

    y = qrTop + 178;
    doc.moveTo(margin + 24, y).lineTo(margin + contentWidth - 24, y).strokeColor(line).lineWidth(1).stroke();
    y += 14;

    doc.fillColor('#7f7165').font('Helvetica').fontSize(7.6)
      .text('Show this PDF at the entrance. The deposit is not an extra fee: it is credited toward your final check in the venue. Keep the second QR available if the team needs to confirm the paid deposit separately.', margin + 24, y, { width: contentWidth - 48, align: 'center' });
    y += 34;

    const footerLinks = [appBaseUrl];
    if (downloadUrl) footerLinks.push(downloadUrl);
    doc.fillColor('#aaaaaa').font('Helvetica').fontSize(7)
      .text(footerLinks.join('  •  '), margin + 24, y, { width: contentWidth - 48, align: 'center' });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
