const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const menu = [
  { id: 1, category: 'Напої', name: 'Лимонад манго-маракуя', price: 420 },
  { id: 2, category: 'Закуски', name: 'Тартар із тунця', price: 780 },
  { id: 3, category: 'Основні страви', name: 'Паста з морепродуктами', price: 980 },
  { id: 4, category: 'Гриль', name: 'Лобстер на вугіллі', price: 1900 },
  { id: 5, category: 'Десерти', name: 'Кокосовий мус', price: 490 }
];

const reservations = [];
let reservationId = 1;

app.get('/api/menu', (req, res) => {
  res.json(menu);
});

app.get('/api/reservations', (req, res) => {
  res.json(reservations);
});

app.post('/api/reservations', (req, res) => {
  const { guestName, phone, date, time, guests, zone, note } = req.body;

  if (!guestName || !phone || !date || !time || !guests || !zone) {
    return res.status(400).json({ message: 'Заповніть обов’язкові поля бронювання.' });
  }

  const reservation = {
    id: reservationId++,
    guestName,
    phone,
    date,
    time,
    guests: Number(guests),
    zone,
    note: note || '',
    status: 'new',
    createdAt: new Date().toISOString()
  };

  reservations.push(reservation);
  res.status(201).json(reservation);
});

app.patch('/api/reservations/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!['new', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Некоректний статус бронювання.' });
  }

  const reservation = reservations.find((item) => item.id === id);
  if (!reservation) {
    return res.status(404).json({ message: 'Бронювання не знайдено.' });
  }

  reservation.status = status;
  res.json(reservation);
});

app.delete('/api/reservations/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = reservations.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Бронювання не знайдено.' });
  }

  reservations.splice(index, 1);
  res.status(204).send();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ГорПляж app is running on http://localhost:${PORT}`);
});
