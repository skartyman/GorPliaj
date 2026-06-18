const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

function money(value) {
  return `${Number(value || 0).toFixed(0)} UAH`;
}

function displayText(value) {
  if (!value) return '';
  if (typeof value === 'object') return value.ua || value.ru || value.en || '';
  return String(value);
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
  verifyUrl
}) {
  const doc = new PDFDocument({ size: [420, 740], margin: 24 });
  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  let qrBuffer = null;
  if (verifyUrl) {
    try {
      qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 320, margin: 2 });
    } catch {}
  }

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = 420;
    const pageHeight = 740;
    const margin = 24;
    const contentWidth = pageWidth - margin * 2;
    const gold = '#c89241';
    const dark = '#4b321f';
    const muted = '#7c6f62';
    let y = margin;

    const isPaid = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';
    const paidTotal = Number(totalPaid || depositAmount || 0);
    const entryAmount = Number(entryTicketsAmount || 0);

    doc.rect(0, 0, pageWidth, pageHeight).fill('#f5f0e8');
    doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 16).fill('#ffffff');
    doc.roundedRect(margin + 5, margin + 5, contentWidth - 10, pageHeight - margin * 2 - 10, 14)
      .lineWidth(2)
      .stroke(gold);

    y += 24;
    doc.fontSize(28).font('Helvetica-Bold').fillColor(dark)
      .text('GORPLIAJ', margin, y, { align: 'center', width: contentWidth });
    y += 30;
    doc.fontSize(10).font('Helvetica').fillColor(gold)
      .text('BEACH RESORT', margin, y, { align: 'center', width: contentWidth });
    y += 24;

    doc.fontSize(13).font('Helvetica-Bold').fillColor(dark)
      .text('Paid table deposit confirmation', margin, y, { align: 'center', width: contentWidth });
    y += 24;

    doc.fontSize(21).font('Helvetica-Bold').fillColor(gold)
      .text(ticketCode, margin, y, { align: 'center', width: contentWidth });
    y += 17;
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text('Reservation code', margin, y, { align: 'center', width: contentWidth });
    y += 18;

    doc.moveTo(margin + 24, y).lineTo(margin + contentWidth - 24, y).strokeColor('#e8dcc8').lineWidth(1).stroke();
    y += 16;

    const labelX = margin + 34;
    const valueX = margin + 126;
    const rowH = 17;
    const eventName = displayText(eventTitle);
    const fields = [
      ['Guest', customerName],
      ['Phone', customerPhone || '-'],
      ['Table', tableName || '-'],
      ['Zone', zoneName || '-'],
      ['Guests', String(guests)],
      ...(eventName ? [['Event', eventName]] : []),
      ['Date', formatDate(reservationDate)],
      ['Time', `${formatTime(timeFrom)} - ${formatTime(timeTo)}`],
      ['Payment', isPaid ? 'Paid' : 'Waiting']
    ];

    for (const [label, value] of fields) {
      doc.fontSize(9).font('Helvetica').fillColor('#888888').text(label, labelX, y);
      doc.font('Helvetica-Bold').fillColor(dark).text(String(value), valueX, y, { width: contentWidth - 150 });
      y += rowH;
    }

    y += 10;
    doc.roundedRect(margin + 22, y, contentWidth - 44, entryAmount > 0 ? 110 : 94, 10).fill('#faf8f4');
    y += 13;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(dark)
      .text('Payment breakdown', margin + 36, y, { width: contentWidth - 72 });
    y += 17;
    doc.fontSize(8).font('Helvetica').fillColor(muted)
      .text(`Table deposit: ${money(depositAmount)}`, margin + 36, y, { width: contentWidth - 72 });
    y += 13;
    if (entryAmount > 0) {
      doc.text(`Event entry: ${entryTicketCount || guests} x ${money(entryTicketPrice)} = ${money(entryAmount)}`, margin + 36, y, { width: contentWidth - 72 });
      y += 13;
    }
    doc.font('Helvetica-Bold').fillColor(dark)
      .text(`Total paid online: ${money(paidTotal)}`, margin + 36, y, { width: contentWidth - 72 });
    y += 15;
    doc.fontSize(7).font('Helvetica').fillColor('#8c7a66')
      .text('The table deposit is credited toward your final bill at the venue.', margin + 36, y, { width: contentWidth - 72 });
    y += entryAmount > 0 ? 32 : 28;

    if (qrBuffer) {
      const qrSize = 112;
      const qrX = margin + (contentWidth - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 8;
      doc.fontSize(7).font('Helvetica').fillColor('#999999')
        .text('Scan to verify table, guest count and payment status', margin, y, { align: 'center', width: contentWidth });
      y += 18;
    }

    doc.moveTo(margin + 24, y).lineTo(margin + contentWidth - 24, y).strokeColor('#e8dcc8').lineWidth(1).stroke();
    y += 14;

    doc.fontSize(7.5).font('Helvetica').fillColor('#7f7165')
      .text('Rules: show this PDF or QR at the entrance. The deposit is not a separate fee: it is credited toward the final check in the venue. Event entry is valid only for the date and guest count shown above.', margin + 24, y, { align: 'center', width: contentWidth - 48 });
    y += 34;

    doc.fontSize(7).font('Helvetica').fillColor('#aaaaaa')
      .text('GorPliaj Beach Resort - Otrada, Odesa - https://gorpliaj.fly.dev', margin, y, { align: 'center', width: contentWidth });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
