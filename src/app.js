const express = require('express');
const path = require('path');

require('./config/env');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const adminAppDir = path.join(publicDir, 'admin-app');

app.use(express.json());
app.use(express.static(publicDir));
app.use('/admin/assets', express.static(path.join(adminAppDir, 'assets')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

app.get('/booking', (req, res) => {
  res.sendFile(path.join(publicDir, 'booking.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/reservations');
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminAppDir, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

module.exports = app;
