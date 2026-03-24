const express = require('express');
const path = require('path');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const adminAppDir = path.join(publicDir, 'admin-app');
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
app.use(express.static(publicDir, { setHeaders: setStaticHeaders }));
app.use('/admin/assets', express.static(path.join(adminAppDir, 'assets')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

app.get('/booking', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(publicDir, 'booking.html'));
});

app.get('/menu', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(publicDir, 'menu.html'));
});

app.get('/events', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(publicDir, 'events.html'));
});

app.get('/events/:slug', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(publicDir, 'event.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/*', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(adminAppDir, 'index.html'));
});

app.get('*', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(publicDir, 'index.html'));
});

module.exports = app;
