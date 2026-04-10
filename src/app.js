const express = require('express');
const path = require('path');
const fs = require('fs');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const telegramRoutes = require('./routes/telegram');

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

app.use(express.json());
if (!hasPublicBuild) {
  throw new Error(`Public React build is missing: ${publicIndexPath}`);
}

app.use(express.static(publicAppDir, { setHeaders: setStaticHeaders }));
app.use(express.static(publicDir, { setHeaders: setStaticHeaders }));
app.use('/admin/assets', express.static(path.join(adminAppDir, 'assets')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/telegram', telegramRoutes);

function sendPublicIndex(res) {
  setNoCacheHeaders(res);
  return res.sendFile(publicIndexPath);
}

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

app.get('/map', (req, res) => {
  return sendPublicIndex(res);
});

app.get('/about', (req, res) => {
  return sendPublicIndex(res);
});

app.get(['/service', '/service/*'], (req, res) => {
  return sendPublicIndex(res);
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

module.exports = app;
