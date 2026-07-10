require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateTicketPdf } = require('../src/services/ticketPdfService');
const { buildTicketHtml } = require('../src/services/emailService');

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || process.cwd();

async function run() {
  const dummyData = {
    ticketCode: 'GP-TEST777',
    customerName: 'Олександр Тестовий',
    customerPhone: '+38 (050) 123-45-67',
    guests: 4,
    reservationDate: new Date('2026-07-20T00:00:00.000Z'),
    timeFrom: new Date('2026-07-20T10:00:00.000Z'),
    timeTo: new Date('2026-07-20T20:00:00.000Z'),
    tableName: 'Шатро 1',
    zoneName: 'VIP Зона',
    eventTitle: 'Вечірка на пляжі',
    rentalAmount: 2000,
    depositAmount: 1000,
    totalPaid: 4500,
    entryTicketsAmount: 1500,
    entryTicketCount: 4,
    entryTicketPrice: 375,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    verifyUrl: 'https://gorpliaj.od.ua/admin/scan?code=GP-TEST777',
    statusUrl: 'https://gorpliaj.od.ua/booking?reservation=GP-TEST777',
    downloadUrl: 'https://gorpliaj.od.ua/api/reservations/GP-TEST777/pdf',
    depositVerifyUrl: 'https://gorpliaj.od.ua/admin/deposit?code=GP-TEST777'
  };

  try {
    // Generate PDF
    const pdfBuffer = await generateTicketPdf(dummyData);
    const pdfPath = path.join(ARTIFACTS_DIR, 'test-ticket.pdf');
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`Saved PDF to ${pdfPath}`);

    // Generate HTML
    // Simulate qrDataUrls for the email template
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(dummyData.verifyUrl);
    const depositQrDataUrl = await QRCode.toDataURL(dummyData.depositVerifyUrl);
    
    const htmlString = buildTicketHtml({
      ...dummyData,
      qrDataUrl,
      depositQrDataUrl
    });
    const htmlPath = path.join(ARTIFACTS_DIR, 'test-email.html');
    fs.writeFileSync(htmlPath, htmlString);
    console.log(`Saved HTML to ${htmlPath}`);
    
  } catch (error) {
    console.error('Error generating files:', error);
  }
}

run();
