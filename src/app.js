const express = require('express');
const path = require('path');
const fs = require('fs');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const { ENABLE_TELEGRAM_MINIAPP } = require('./config/env');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const publicSvelteDir = path.join(publicDir, 'public-svelte');
const adminAppDir = path.join(publicDir, 'admin-app');
const svelteIndexPath = path.join(publicSvelteDir, 'index.html');
const hasSveltePublicBuild = fs.existsSync(svelteIndexPath);
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

app.use(express.json());
if (!hasSveltePublicBuild) {
  throw new Error(`Svelte public build is missing: ${svelteIndexPath}`);
}

app.use(express.static(publicSvelteDir, { setHeaders: setStaticHeaders }));
app.use(express.static(publicDir, { setHeaders: setStaticHeaders }));
app.use('/admin/assets', express.static(path.join(adminAppDir, 'assets')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
if (ENABLE_TELEGRAM_MINIAPP) {
  const telegramRoutes = require('./routes/telegram');
  app.use('/api/telegram', telegramRoutes);
}

function sendSvelteIndex(res) {
  setNoCacheHeaders(res);
  return res.sendFile(svelteIndexPath);
}

app.get(['/booking', '/booking/*'], (req, res) => {
  return sendSvelteIndex(res);
});

app.get('/menu', (req, res) => {
  return sendSvelteIndex(res);
});

app.get('/events', (req, res) => {
  return sendSvelteIndex(res);
});

app.get('/events/:slug', (req, res) => {
  return sendSvelteIndex(res);
});

app.get('/map', (req, res) => {
  return sendSvelteIndex(res);
});

app.get('/about', (req, res) => {
  return sendSvelteIndex(res);
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/*', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(adminAppDir, 'index.html'));
});

app.get('*', (req, res) => {
  return sendSvelteIndex(res);
});

module.exports = app;
