const express = require('express');
const path = require('path');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const { extractToken } = require('./middleware/adminAuth');
const { verifyToken } = require('./services/adminAuthService');

const app = express();

function isAuthenticatedAdmin(req) {
  const token = extractToken(req);
  return Boolean(verifyToken(token));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'booking.html'));
});

app.get('/admin/login', (req, res) => {
  if (isAuthenticatedAdmin(req)) {
    return res.redirect('/admin/reservations');
  }

  return res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'login.html'));
});

app.get('/admin/reservations', (req, res) => {
  if (!isAuthenticatedAdmin(req)) {
    return res.redirect('/admin/login');
  }

  return res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'reservations.html'));
});

app.get('/admin/reservation', (req, res) => {
  if (!isAuthenticatedAdmin(req)) {
    return res.redirect('/admin/login');
  }

  return res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'reservation.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
