const express = require('express');
const path = require('path');
const fs = require('fs');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const { extractInvoiceData } = require('./services/groqVisionService');
const { saveInvoice, isSheetsConfigured } = require('./services/sheetsService');
const { setupBotWebhook } = require('./services/botService');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const publicAppDir = path.join(publicDir, 'public-app');
const adminAppDir = path.join(publicDir, 'admin-app');
const publicIndexPath = path.join(publicAppDir, 'index.html');
const hasPublicBuild = fs.existsSync(publicIndexPath);
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
};

function setNoCacheHeaders(res) {
  Object.entries(NO_CACHE_HEADERS).forEach(([headerName, headerValue]) => {
    res.setHeader(headerName, headerValue);
  });
}

function setStaticHeaders(res, filePath) {
  const fileName = path.basename(filePath);

  if (path.extname(filePath) === '.html' || fileName === 'sw.js') {
    setNoCacheHeaders(res);
  }
}

app.use(express.json({ limit: '10mb' }));

function sendPublicIndex(res) {
  if (!hasPublicBuild) {
    setNoCacheHeaders(res);
    return res.status(503).send('Public app is not built. Run npm run public:build to build the public frontend.');
  }

  setNoCacheHeaders(res);
  return res.sendFile(publicIndexPath);
}

if (hasPublicBuild) {
  app.use(express.static(publicAppDir, { setHeaders: setStaticHeaders }));
  app.use(express.static(publicDir, { setHeaders: setStaticHeaders }));
} else {
  console.warn(`Public React build is missing: ${publicIndexPath}. Public app routes will show a placeholder.`);
}

app.use('/admin/assets', express.static(path.join(adminAppDir, 'assets')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

app.get(['/booking', '/booking/*'], (req, res) => {
  return sendPublicIndex(res);
});

app.get('/menu', (req, res) => {
  return sendPublicIndex(res);
});

app.get('/events', (req, res) => {
  return sendPublicIndex(res);
});

app.get('/events/:slug', (req, res) => {
  return sendPublicIndex(res);
});

app.get('/map-preview', (req, res) => {
  return sendPublicIndex(res);
});

app.get('/about', (req, res) => {
  return sendPublicIndex(res);
});

app.post('/api/invoice/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Missing image' });
    const data = await extractInvoiceData(image);
    res.json(data);
  } catch (err) {
    console.error('[ocr] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoice/save', async (req, res) => {
  try {
    const { supplier, venue, invoiceNumber, items } = req.body;
    if (!supplier || !items?.length) return res.status(400).json({ error: 'Missing required fields' });
    if (!isSheetsConfigured()) return res.status(400).json({ error: 'Google Sheets not configured' });
    await saveInvoice(supplier, venue || '', invoiceNumber || '', items);
    const scanned = items.filter((i) => i.barcode).length;
    res.json({ success: true, scanned, total: items.length });
  } catch (err) {
    console.error('[save] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/scanner', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(publicDir, 'scanner', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/*', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(adminAppDir, 'index.html'));
});

app.get('*', (req, res) => {
  return sendPublicIndex(res);
});

setupBotWebhook(app);

module.exports = app;
