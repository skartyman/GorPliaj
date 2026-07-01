const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { getFontPaths, getLogoPath, loadImageBuffer } = require('../utils/pdfBranding');
const prisma = require('../lib/prisma');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const COLS = 3;
const ROWS = 4;
const CELL_W = (PAGE_W - MARGIN * 2) / COLS;
const CELL_H = (PAGE_H - MARGIN * 2 - 60) / ROWS;

const QR_SOURCE = 500;
const QR_RENDER = 160;
const ZONE_SIZE = 175;
const LOGO_SIZE = 80;

async function generateTableQrPdf(baseUrl) {
  const tables = await prisma.venueTable.findMany({
    where: { isActive: true, code: { not: null } },
    orderBy: [{ zone: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: { zone: { select: { name: true } } }
  });

  if (!tables.length) return null;

  const logoPath = getLogoPath();
  const logoBuffer = logoPath ? await loadImageBuffer(logoPath) : null;

  const whiteSquare = await sharp({
    create: { width: ZONE_SIZE, height: ZONE_SIZE, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } }
  }).png().toBuffer();

  const logoPng = logoBuffer
    ? await sharp(logoBuffer).resize({ width: LOGO_SIZE, height: LOGO_SIZE, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer()
    : null;

  const qrCenter = Math.floor((QR_SOURCE - ZONE_SIZE) / 2);
  const logoCenter = Math.floor((QR_SOURCE - LOGO_SIZE) / 2);

  const qrBuffers = await Promise.all(
    tables.map(async (t) => {
      const url = `${baseUrl}/menu?table=${encodeURIComponent(t.code)}`;
      const raw = await QRCode.toBuffer(url, {
        width: QR_SOURCE,
        margin: 0,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' }
      });
      const qrPng = await sharp(raw).png().toBuffer();

      const layers = [{ input: whiteSquare, left: qrCenter, top: qrCenter }];
      if (logoPng) layers.push({ input: logoPng, left: logoCenter, top: logoCenter });

      const composited = await sharp(qrPng).composite(layers).png().toBuffer();
      return sharp(composited).resize(QR_RENDER, QR_RENDER).jpeg({ quality: 95 }).toBuffer();
    })
  );

  const fontPaths = getFontPaths();
  const headerLogo = logoBuffer
    ? await sharp(logoBuffer).resize({ width: 48, height: 48, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer()
    : null;

  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: false });

    if (fontPaths.regular) doc.registerFont('QR', fontPaths.regular);
    if (fontPaths.bold) doc.registerFont('QR-Bold', fontPaths.bold);
    const fn = fontPaths.regular ? 'QR' : 'Helvetica';
    const fb = fontPaths.bold ? 'QR-Bold' : 'Helvetica-Bold';

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const pagesCount = Math.ceil(tables.length / (COLS * ROWS));

    for (let page = 0; page < pagesCount; page++) {
      doc.addPage();
      const start = page * COLS * ROWS;

      if (page === 0 && headerLogo) {
        doc.image(headerLogo, PAGE_W / 2 - 24, MARGIN, { width: 48, height: 48 });
        doc.font(fb).fontSize(18).fillColor('#1a1a2e')
          .text('GorPliaj', MARGIN, MARGIN + 56, { width: PAGE_W - MARGIN * 2, align: 'center' });
        doc.font(fn).fontSize(11).fillColor('#666666')
          .text('QR \u043A\u043E\u0434\u0438 \u0441\u0442\u043E\u043B\u0456\u0432', MARGIN, MARGIN + 80, { width: PAGE_W - MARGIN * 2, align: 'center' });
      } else if (page === 0) {
        doc.font(fb).fontSize(18).fillColor('#1a1a2e')
          .text('GorPliaj \u2014 QR \u043A\u043E\u0434\u0438 \u0441\u0442\u043E\u043B\u0456\u0432', MARGIN, MARGIN, { width: PAGE_W - MARGIN * 2, align: 'center' });
      }

      const startY = page === 0 ? MARGIN + 100 : MARGIN;

      for (let i = 0; i < COLS * ROWS; i++) {
        const idx = start + i;
        if (idx >= tables.length) break;
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = MARGIN + col * CELL_W;
        const y = startY + row * CELL_H;
        const cx = x + CELL_W / 2;

        doc.image(qrBuffers[idx], cx - QR_RENDER / 2, y, { width: QR_RENDER, height: QR_RENDER });

        const t = tables[idx];
        const name = typeof t.name === 'object' ? (t.name.ua || t.name.ru || t.name.en || '') : (t.name || '');
        const zoneName = typeof t.zone?.name === 'object' ? (t.zone.name.ua || t.zone.name.ru || t.zone.name.en || '') : (t.zone?.name || '');

        doc.font(fb).fontSize(13).fillColor('#1a1a2e')
          .text(t.code, x, y + QR_RENDER + 6, { width: CELL_W, align: 'center' });

        doc.font(fn).fontSize(10).fillColor('#888888')
          .text(name || zoneName || '', x, y + QR_RENDER + 22, { width: CELL_W, align: 'center' });
      }
    }

    doc.end();
  });
}

module.exports = { generateTableQrPdf };
