const express = require('express');
const path = require('path');
const fs = require('fs');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const publicSvelteDir = path.join(publicDir, 'public-svelte');
const adminAppDir = path.join(publicDir, 'admin-app');
const hasSveltePublicBuild = fs.existsSync(path.join(publicSvelteDir, 'index.html'));
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
if (hasSveltePublicBuild) {
  app.use(express.static(publicSvelteDir, { setHeaders: setStaticHeaders }));
}
app.use(express.static(publicDir, { setHeaders: setStaticHeaders }));
app.use('/admin/assets', express.static(path.join(adminAppDir, 'assets')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

function sendSvelteIndex(res) {
  setNoCacheHeaders(res);
  return res.sendFile(path.join(publicSvelteDir, 'index.html'));
}

function sendLegacyIndex(res) {
  setNoCacheHeaders(res);
  return res.sendFile(path.join(publicDir, 'index.html'));
}

app.get('/legacy', (req, res) => {
  return sendLegacyIndex(res);
});

app.get('/legacy/*', (req, res) => {
  const legacyPath = req.params[0] || '';
  const safePath = path.normalize(legacyPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return res.sendFile(path.join(publicDir, safePath), (error) => {
    if (error) {
      sendLegacyIndex(res);
    }
  });
});

app.get(['/booking', '/booking/*'], (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  setNoCacheHeaders(res);
  return res.sendFile(path.join(publicDir, 'booking.html'));
});

app.get('/menu', (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  setNoCacheHeaders(res);
  return res.sendFile(path.join(publicDir, 'menu.html'));
});

app.get('/events', (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  setNoCacheHeaders(res);
  return res.sendFile(path.join(publicDir, 'events.html'));
});

app.get('/events/:slug', (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  setNoCacheHeaders(res);
  return res.sendFile(path.join(publicDir, 'event.html'));
});

app.get('/map', (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  return sendLegacyIndex(res);
});

app.get('/about', (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  return sendLegacyIndex(res);
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/*', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(adminAppDir, 'index.html'));
});

app.get('*', (req, res) => {
  if (hasSveltePublicBuild) {
    return sendSvelteIndex(res);
  }
  return sendLegacyIndex(res);
});

module.exports = app;
