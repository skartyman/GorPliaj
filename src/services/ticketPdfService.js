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
  rentalAmount,
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
  const rental = Number(rentalAmount || 0);
  const deposit = Number(depositAmount || 0);
  const hasRental = rental > 0;
  const hasDeposit = deposit > 0;
  const hasPayment = hasRental || hasDeposit;

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
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    
    // Brand Colors - Asphalt Theme
    const bg = '#1F1F24'; // Asphalt
    const cardBg = '#27272D'; // Lighter asphalt for card
    const cardBorder = '#3A3A42'; 
    const primaryText = '#E4E4E8'; // Less contrast than pure white
    const secondaryText = '#9898A1'; 
    const gold = '#C29862'; // Muted gold
    
    const isPaid = paymentStatus === 'PAID' || status === 'PAID' || status === 'CONFIRMED';
    const paidTotal = Number(totalPaid || 0);
    const reservationPosition = localizedText(tableName) || '-';
    const reservationZone = localizedText(zoneName) || '-';
    const eventName = localizedText(eventTitle);
    const appBaseUrl = getBaseUrl();
    let y = margin;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill(bg);

    // Main Card
    doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 20)
       .fillAndStroke(cardBg, cardBorder);

    // Header Logo/Title
    y += 36; // More air
    doc.fillColor(gold).font('Roboto-Bold').fontSize(11)
      .text('GORPLIAJ', margin, y, { width: contentWidth, align: 'center', characterSpacing: 5 });
    
    y += 32;
    doc.fillColor(primaryText).font('Roboto-Bold').fontSize(18)
      .text(eventName ? 'ВХІДНИЙ КВИТОК НА ПОДІЮ' : 'ПІДТВЕРДЖЕННЯ БРОНЮВАННЯ', margin, y, { width: contentWidth, align: 'center' });
      
    y += 26;
    doc.fillColor(secondaryText).font('Roboto').fontSize(10)
      .text(isPaid ? 'Оплачено / Успішне бронювання' : 'Очікує оплати', margin, y, { width: contentWidth, align: 'center' });

    // Separator
    y += 40;
    doc.moveTo(margin + 32, y).lineTo(margin + contentWidth - 32, y).strokeColor(cardBorder).lineWidth(1).stroke();

    // Content Start
    y += 40;
    
    // Grid Setup
    const col1 = margin + 36;
    const col2 = margin + contentWidth / 2 + 10;
    const rowGap = 52; // Increased inter-line spacing
    
    // Guest Info
    doc.fillColor(secondaryText).font('Roboto').fontSize(9).text('ГІСТЬ', col1, y, { characterSpacing: 1 });
    doc.fillColor(primaryText).font('Roboto-Bold').fontSize(14).text(customerName, col1, y + 16);

    if (eventName) {
      doc.fillColor(secondaryText).font('Roboto').fontSize(9).text('ПОДІЯ', col2, y, { characterSpacing: 1 });
      doc.fillColor(primaryText).font('Roboto-Bold').fontSize(12).text(eventName, col2, y + 16, { width: contentWidth / 2 - 40 });
    }

    y += rowGap;
    
    // Date & Time Row
    doc.fillColor(secondaryText).font('Roboto').fontSize(9).text('ДАТА', col1, y, { characterSpacing: 1 });
    doc.fillColor(primaryText).font('Roboto-Bold').fontSize(13).text(formatDate(reservationDate), col1, y + 16);

    doc.fillColor(secondaryText).font('Roboto').fontSize(9).text('ЧАС', col2, y, { characterSpacing: 1 });
    doc.fillColor(primaryText).font('Roboto-Bold').fontSize(13).text(`${formatTime(timeFrom)} - ${formatTime(timeTo)}`, col2, y + 16);

    y += rowGap;

    // Position & Guests Row
    doc.fillColor(secondaryText).font('Roboto').fontSize(9).text('ПОЗИЦІЯ', col1, y, { characterSpacing: 1 });
    doc.fillColor(primaryText).font('Roboto-Bold').fontSize(13).text(`${reservationZone} / ${reservationPosition}`, col1, y + 16);

    doc.fillColor(secondaryText).font('Roboto').fontSize(9).text('ГОСТЕЙ', col2, y, { characterSpacing: 1 });
    doc.fillColor(primaryText).font('Roboto-Bold').fontSize(13).text(`${guests} ПЕРС.`, col2, y + 16);

    // Money Block
    y += 66; // More air before money
    doc.roundedRect(col1, y, contentWidth - 72, 80, 12).fill('#212126');
    
    let moneyText = '';
    if (hasRental && hasDeposit) moneyText = `ОРЕНДА: ${formatMoney(rental)}  •  ДЕПОЗИТ: ${formatMoney(deposit)}`;
    else if (hasRental) moneyText = `ОРЕНДА: ${formatMoney(rental)}`;
    else if (hasDeposit) moneyText = `ДЕПОЗИТ: ${formatMoney(deposit)}`;
    
    doc.fillColor(gold).font('Roboto-Bold').fontSize(18)
       .text(formatMoney(hasPayment ? totalPaid : 0), col1, y + 24, { width: contentWidth - 72, align: 'center' });
       
    doc.fillColor(secondaryText).font('Roboto').fontSize(8.5)
       .text(moneyText || 'БЕЗКОШТОВНЕ БРОНЮВАННЯ', col1, y + 50, { width: contentWidth - 72, align: 'center', characterSpacing: 0.5 });

    // QR Codes
    const hasDepositQr = Boolean(depositQrBuffer && hasDeposit);
    const qrBlockWidth = hasDepositQr ? (contentWidth - 88) / 2 : contentWidth - 72;
    const qrImageSize = 110;
    y += 114;
    const qrTop = y;

    if (verifyQrBuffer) {
      const leftX = hasDepositQr ? col1 : margin + 36;
      doc.roundedRect(leftX, qrTop, qrBlockWidth, 160, 16).fill('#FFFFFF');
      doc.image(verifyQrBuffer, leftX + (qrBlockWidth - qrImageSize) / 2, qrTop + 16, { width: qrImageSize, height: qrImageSize });
      doc.fillColor('#1F1F24').font('Roboto-Bold').fontSize(9)
        .text(eventName ? 'ВХІД НА ПОДІЮ' : 'СКАН ДЛЯ ВХОДУ', leftX, qrTop + 134, { width: qrBlockWidth, align: 'center', characterSpacing: 0.5 });
    }

    if (hasDepositQr) {
      const rightX = col1 + qrBlockWidth + 16;
      doc.roundedRect(rightX, qrTop, qrBlockWidth, 160, 16).fill('#FFFFFF');
      doc.image(depositQrBuffer, rightX + (qrBlockWidth - qrImageSize) / 2, qrTop + 16, { width: qrImageSize, height: qrImageSize });
      doc.fillColor('#1F1F24').font('Roboto-Bold').fontSize(9)
        .text('СКАН ДЕПОЗИТУ', rightX, qrTop + 134, { width: qrBlockWidth, align: 'center', characterSpacing: 0.5 });
    }

    y = qrTop + 180;
    doc.fillColor(secondaryText).font('Roboto-Bold').fontSize(11)
      .text(ticketCode, margin, y, { width: contentWidth, align: 'center', characterSpacing: 3 });
      
    y += 30;
    doc.fillColor('#56565C').font('Roboto').fontSize(8)
      .text(appBaseUrl, margin, y, { width: contentWidth, align: 'center', characterSpacing: 1 });

    doc.end();
  });
}

module.exports = { generateTicketPdf };
