const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');
const sharp = require('sharp');
const prisma = require('../lib/prisma');
const {
  escapeHtml,
  formatDate,
  formatMoney,
  formatTime,
  localizedText
} = require('../utils/deliveryPresentation');
const {
  getFontPaths,
  getLogoPath,
  loadImageBuffer
} = require('../utils/pdfBranding');
const { buildSaleTicketVerifyUrl } = require('../utils/ticketSignature');

let browserPromise = null;
let browserCleanupAttached = false;

function toUpperSafe(value) {
  return String(value || '').toUpperCase();
}

function imageBufferToDataUrl(buffer, mimeType = 'image/png') {
  if (!buffer) return '';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function fontMimeType(fontPath) {
  const extension = path.extname(fontPath || '').toLowerCase();
  if (extension === '.otf') return 'font/otf';
  if (extension === '.woff') return 'font/woff';
  if (extension === '.woff2') return 'font/woff2';
  return 'font/ttf';
}

function inlineFontCss(fontFamily, fontPath, weight) {
  if (!fontPath || !fs.existsSync(fontPath)) return '';
  const bytes = fs.readFileSync(fontPath);
  return `
    @font-face {
      font-family: '${fontFamily}';
      src: url('${imageBufferToDataUrl(bytes, fontMimeType(fontPath))}') format('truetype');
      font-style: normal;
      font-weight: ${weight};
      font-display: swap;
    }
  `;
}

function getTimeRangeLabel(startsAt, endsAt) {
  if (!startsAt) return '';

  const startTime = formatTime(startsAt);
  const sameTime = !endsAt || new Date(endsAt).getTime() === new Date(startsAt).getTime();
  return sameTime ? `початок ${startTime}` : `${startTime} - ${formatTime(endsAt)}`;
}

function getEventDateLabel(startsAt, endsAt) {
  if (!startsAt) return '';
  const dateLabel = formatDate(startsAt);
  const timeLabel = getTimeRangeLabel(startsAt, endsAt);
  return `${dateLabel}, ${timeLabel}`.trim();
}

function ticketStatusLabel(status) {
  const value = toUpperSafe(status);
  if (value === 'VALID') return 'Дійсний';
  if (value === 'USED') return 'Використано';
  if (value === 'RESERVED') return 'Очікує оплату';
  if (value === 'REFUNDED') return 'Повернено';
  if (value === 'CANCELLED') return 'Скасовано';
  return value || 'Невідомо';
}

function sanitizeText(value, fallback = '—') {
  const normalized = String(value || '').trim();
  return escapeHtml(normalized || fallback);
}

function buildSupportLabel(settings) {
  const phone = String(settings?.phone || '').trim();
  const email = String(settings?.email || '').trim();
  if (phone && email) return `${phone} · ${email}`;
  return phone || email || 'Адміністратор Горпляж';
}

function buildTableBookingLabel(order, settings) {
  const phone = String(settings?.phone || '').trim();
  const ctaType = String(order?.event?.ctaType || '').toUpperCase();
  if (['BOOKING', 'BOTH'].includes(ctaType)) {
    return phone ? `Бронювання столів: ${phone}` : 'Бронювання столу доступне окремо';
  }
  return 'Без бронювання столу';
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium'
  ];

  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

async function getPdfBrowser() {
  if (!browserPromise) {
    const executablePath = getBrowserExecutablePath();
    if (!executablePath) {
      throw new Error('Chromium executable was not found for PDF generation.');
    }

    browserPromise = puppeteer.launch({
      executablePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=medium'
      ]
    });

    if (!browserCleanupAttached) {
      browserCleanupAttached = true;
      const closeBrowser = async () => {
        if (!browserPromise) return;
        try {
          const browser = await browserPromise;
          await browser.close();
        } catch {}
        browserPromise = null;
      };

      process.once('exit', () => { void closeBrowser(); });
      process.once('SIGINT', () => { void closeBrowser().finally(() => process.exit(130)); });
      process.once('SIGTERM', () => { void closeBrowser().finally(() => process.exit(143)); });
    }
  }

  return browserPromise;
}

async function getPdfContextAssets() {
  const [settings, logoBuffer] = await Promise.all([
    prisma.frontendSettings.findFirst(),
    loadImageBuffer(getLogoPath())
  ]);

  const fonts = getFontPaths();
  return {
    settings,
    logoDataUrl: logoBuffer ? imageBufferToDataUrl(logoBuffer, 'image/png') : '',
    regularFontCss: inlineFontCss('GorpliajSans', fonts.regular, 400),
    boldFontCss: inlineFontCss('GorpliajSans', fonts.bold || fonts.regular, 700)
  };
}

async function buildTicketPayload(order, ticket, context) {
  const session = ticket.eventSession || order.eventSession || ticket.ticketType?.eventSession || null;
  const startsAt = session?.startsAt || order.event?.startAt || null;
  const endsAt = session?.endsAt || order.event?.endAt || null;

  const venue = localizedText(context.settings?.title) || 'Горпляж';
  const address = localizedText(context.settings?.address) || 'Одеса, пляж Отрада';
  const support = buildSupportLabel(context.settings);
  const scanUrl = buildSaleTicketVerifyUrl(ticket.code);

  return {
    ticketId: ticket.id,
    ticketCode: ticket.code,
    orderId: order.id,
    orderNumber: order.orderNumber,
    guestName: ticket.holderName || order.customerName || 'Гість Горпляж',
    ticketType: localizedText(ticket.ticketType?.name) || 'Вхідний квиток',
    price: formatMoney(ticket.ticketType?.price || order.amount / Math.max(order.tickets.length, 1), ticket.ticketType?.currency || order.currency),
    status: ticketStatusLabel(ticket.status),
    eventTitle: localizedText(order.event?.title) || `Подія #${order.eventId}`,
    startsAt,
    endsAt,
    eventDateLabel: getEventDateLabel(startsAt, endsAt),
    posterDataUrl: context.posterDataUrl || '',
    venue,
    address,
    support,
    scanUrl,
    qrDataUrl: await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360
    }),
    logoDataUrl: context.logoDataUrl
  };
}

function renderInfoBlock(label, value, wide = false) {
  return `
    <div class="info-block${wide ? ' wide' : ''}">
      <div class="info-label">${sanitizeText(label)}</div>
      <div class="info-value">${sanitizeText(value)}</div>
    </div>
  `;
}

function buildTicketHtml(ticket) {
  const posterMarkup = ticket.posterDataUrl
    ? `<img class="poster-image" src="${ticket.posterDataUrl}" alt="${sanitizeText(ticket.eventTitle, 'Poster')}" />`
    : `<div class="poster-fallback">Горпляж</div>`;

  return `
    <section class="sheet">
      <div class="ticket-card">
        <div class="hero">
          <div class="poster-panel">
            ${posterMarkup}
          </div>
          <div class="event-panel">
            <div class="event-topline">
              ${ticket.logoDataUrl ? `<div class="brand-badge"><img src="${ticket.logoDataUrl}" alt="Горпляж" /></div>` : '<div class="brand-badge brand-badge-text">ГП</div>'}
              <div class="event-chip">Горпляж · Одеса</div>
            </div>
            <div class="event-kicker">Квиток на подію</div>
            <h1 class="event-title">${sanitizeText(ticket.eventTitle)}</h1>
            <div class="event-date-pill">${sanitizeText(ticket.eventDateLabel)}</div>
          </div>
        </div>

        <div class="main-row">
          <div class="code-column">
            <div class="ticket-code">${sanitizeText(ticket.ticketCode)}</div>
            <div class="scan-copy">Покажіть QR-код на вході. Після першого успішного сканування квиток буде позначено як використаний.</div>
          </div>
          <div class="qr-panel">
            <img class="qr-image" src="${ticket.qrDataUrl}" alt="QR code" />
          </div>
        </div>

        <div class="info-grid">
          ${renderInfoBlock('Гість', ticket.guestName)}
          ${renderInfoBlock('Вартість', ticket.price)}
          ${renderInfoBlock('Статус', ticket.status)}
          ${renderInfoBlock('Тип квитка', ticket.ticketType)}
          ${renderInfoBlock('Замовлення', ticket.orderNumber)}
          ${renderInfoBlock('Локація', `${ticket.venue} · ${ticket.address}`)}
          ${renderInfoBlock('Підтримка', ticket.support, true)}
        </div>

        <div class="important-block">
          <div class="important-title">Перед входом</div>
          <ul class="important-list">
            <li>Квиток дійсний для одного проходу та прив’язаний до цього QR-коду.</li>
            <li>Не передавайте скріншот стороннім: після першого успішного сканування QR стане недійсним.</li>
            <li>Якщо не вдається відкрити PDF, зверніться до підтримки Горпляж до початку події.</li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function buildDocumentHtml(tickets, context) {
  return `<!DOCTYPE html>
  <html lang="uk">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        ${context.regularFontCss}
        ${context.boldFontCss}
        :root {
          --bg: #e9f5f3;
          --card: #ffffff;
          --sea: #1f5d65;
          --sea-deep: #123f47;
          --gold: #f1d08a;
          --foam: #edf7f5;
          --ink: #173d43;
          --muted: #55777b;
          --line: #d5e8e5;
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: 'GorpliajSans', 'DejaVu Sans', Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .sheet {
          width: 210mm;
          min-height: 297mm;
          padding: 8mm;
          page-break-after: always;
        }
        .sheet:last-child {
          page-break-after: auto;
        }
        .ticket-card {
          min-height: calc(297mm - 16mm);
          background: var(--card);
          border-radius: 20px;
          padding: 10mm;
          box-shadow: 0 12px 40px rgba(25, 76, 82, 0.10);
        }
        .hero {
          display: grid;
          grid-template-columns: 62mm 1fr;
          gap: 5mm;
          align-items: stretch;
        }
        .poster-panel {
          border-radius: 16px;
          overflow: hidden;
          min-height: 80mm;
          background: var(--sea-deep);
        }
        .poster-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .poster-fallback {
          width: 100%;
          height: 100%;
          min-height: 80mm;
          display: grid;
          place-items: center;
          color: #fff8ee;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .event-panel {
          background: var(--sea-deep);
          border-radius: 18px;
          padding: 8mm 8mm;
          color: #fff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .event-topline {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6mm;
        }
        .brand-badge {
          width: 21mm;
          height: 21mm;
          border-radius: 12px;
          background: rgba(255, 248, 238, 0.96);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex: 0 0 auto;
        }
        .brand-badge img {
          width: 15mm;
          height: 15mm;
          object-fit: contain;
        }
        .brand-badge-text {
          color: var(--sea-deep);
          font-weight: 700;
        }
        .event-chip {
          border-radius: 9px;
          background: var(--gold);
          color: var(--sea-deep);
          padding: 4mm 6mm;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .event-kicker {
          margin-top: 3.5mm;
          color: #b9ded8;
          font-size: 12px;
        }
        .event-title {
          margin: 4mm 0 0;
          font-size: 21px;
          line-height: 1.12;
          font-weight: 700;
          letter-spacing: 0;
          word-break: break-word;
        }
        .event-date-pill {
          margin-top: auto;
          align-self: flex-start;
          width: 100%;
          background: #f7fcfb;
          color: var(--sea-deep);
          border-radius: 9px;
          padding: 2.8mm 4mm;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
        }
        .main-row {
          display: grid;
          grid-template-columns: 1fr 46mm;
          gap: 6mm;
          align-items: start;
          margin-top: 5mm;
        }
        .ticket-code {
          font-size: 21px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.03em;
          color: var(--sea-deep);
          word-break: break-word;
        }
        .scan-copy {
          margin-top: 2mm;
          color: var(--muted);
          font-size: 12.5px;
          line-height: 1.36;
        }
        .qr-panel {
          border-radius: 14px;
          background: var(--foam);
          padding: 3mm;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46mm;
        }
        .qr-image {
          width: 100%;
          height: auto;
          display: block;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 3mm;
          margin-top: 5mm;
        }
        .info-block {
          background: var(--foam);
          border-radius: 12px;
          padding: 3.2mm 3.8mm;
          min-height: 16mm;
          border: 1px solid var(--line);
        }
        .info-block.wide {
          grid-column: 1 / -1;
          min-height: 15mm;
        }
        .info-label {
          color: #668589;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .info-value {
          margin-top: 1.4mm;
          font-size: 12.5px;
          line-height: 1.22;
          font-weight: 700;
          color: var(--ink);
          word-break: break-word;
        }
        .important-block {
          margin-top: 5mm;
          padding: 4mm 5mm;
          border-radius: 14px;
          background: #f7fbfa;
          border: 1px solid var(--line);
        }
        .important-title {
          text-align: center;
          color: var(--sea);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 700;
        }
        .important-list {
          margin: 2mm 0 0;
          padding-left: 5mm;
          color: var(--ink);
          font-size: 12px;
          line-height: 1.34;
        }
        .important-list li + li {
          margin-top: 2mm;
        }
      </style>
    </head>
    <body>
      ${tickets.map(buildTicketHtml).join('')}
    </body>
  </html>`;
}

async function generateTicketOrderPdf(order) {
  const context = await getPdfContextAssets();
  const posterSourceBuffer = await loadImageBuffer(order.event?.posterImage);
  const posterBuffer = posterSourceBuffer
    ? await sharp(posterSourceBuffer)
      .rotate()
      .resize({ width: 1200, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 86, progressive: true })
      .toBuffer()
      .catch(() => null)
    : null;
  context.posterDataUrl = posterBuffer ? imageBufferToDataUrl(posterBuffer, 'image/jpeg') : '';
  const payloads = [];
  for (const ticket of order.tickets) {
    payloads.push(await buildTicketPayload(order, ticket, context));
  }

  const browser = await getPdfBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(buildDocumentHtml(payloads, context), {
      waitUntil: 'load',
      timeout: 20000
    });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { generateTicketOrderPdf };
