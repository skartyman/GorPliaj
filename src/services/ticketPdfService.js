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

async function generateTicketPdf({ ticketCode, customerName, customerPhone, guests, reservationDate, timeFrom, timeTo, tableName, zoneName, status, paymentStatus, verifyUrl }) {
  const doc = new PDFDocument({ size: [400, 680], margin: 24 });

  const buffers = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  let qrBuffer = null;
  if (verifyUrl) {
    try {
      qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 300, margin: 2 });
    } catch {}
  }

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    const pageWidth = 400;
    const pageHeight = 680;
    const margin = 24;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const gold = '#c89241';
    const dark = '#5c3a1e';

    doc.rect(0, 0, pageWidth, pageHeight).fill('#f5f0e8');

    doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 16).fill('#ffffff');

    doc.roundedRect(margin + 4, margin + 4, contentWidth - 8, pageHeight - margin * 2 - 8, 14)
      .lineWidth(2)
      .stroke(gold);

    y = margin + 28;

    doc.fontSize(26).font('Helvetica-Bold').fillColor(dark)
      .text('ГоРПляж', margin, y, { align: 'center', width: contentWidth });
    y += 28;
    doc.fontSize(10).font('Helvetica').fillColor(gold)
      .text('BEACH RESORT', margin, y, { align: 'center', width: contentWidth });
    y += 22;

    doc.fontSize(22).font('Helvetica-Bold').fillColor(gold)
      .text(ticketCode, margin, y, { align: 'center', width: contentWidth });
    y += 20;
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text('Код квитка / Ticket code', margin, y, { align: 'center', width: contentWidth });
    y += 16;

    const lineY = y;
    doc.moveTo(margin + 20, lineY).lineTo(margin + contentWidth - 20, lineY).strokeColor('#e8dcc8').lineWidth(1).stroke();
    y += 16;

    doc.fontSize(10).font('Helvetica').fillColor(dark);
    const labelX = margin + 32;
    const valueX = margin + 110;
    const rowH = 17;

    const isPaid = paymentStatus === 'PAID' || status === 'PAID';

    const fields = [
      { label: 'Гість / Guest', value: customerName },
      { label: 'Телефон / Phone', value: customerPhone || '—' },
      { label: 'Стіл / Table', value: tableName || '—' },
      { label: 'Зона / Zone', value: zoneName || '—' },
      { label: 'Гостей / Guests', value: String(guests) },
      { label: 'Дата / Date', value: formatDate(reservationDate) },
      { label: 'Час / Time', value: `${formatTime(timeFrom)} — ${formatTime(timeTo)}` },
      { label: 'Оплата / Payment', value: isPaid ? 'Оплачено ✅' : 'Очікує оплати' }
    ];

    for (const field of fields) {
      doc.font('Helvetica').fillColor('#888888').text(field.label, labelX, y);
      doc.font('Helvetica-Bold').fillColor(dark).text(field.value, valueX, y);
      y += rowH;
    }

    y += 12;

    if (qrBuffer) {
      const qrSize = 100;
      const qrX = margin + (contentWidth - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 8;
      doc.fontSize(7).font('Helvetica').fillColor('#999999')
        .text('Скануйте для підтвердження / Scan to verify', margin, y, { align: 'center', width: contentWidth });
      y += 14;
    }

    y += 8;
    doc.moveTo(margin + 20, y).lineTo(margin + contentWidth - 20, y).strokeColor('#e8dcc8').lineWidth(1).stroke();
    y += 12;

    doc.fontSize(7).font('Helvetica').fillColor('#aaaaaa')
      .text('ГоРПляж Beach Resort • От raда, Одеса • https://gorpliaj.fly.dev', margin, y, { align: 'center', width: contentWidth });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
