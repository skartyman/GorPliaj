const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const menu = [
  { id: 1, category: 'Напитки', name: 'Лимонад манго-маракуйя', price: 420 },
  { id: 2, category: 'Закуски', name: 'Тартар из тунца', price: 780 },
  { id: 3, category: 'Основные блюда', name: 'Паста с морепродуктами', price: 980 },
  { id: 4, category: 'Гриль', name: 'Лобстер на углях', price: 1900 },
  { id: 5, category: 'Десерты', name: 'Кокосовый мусс', price: 490 }
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
    return res.status(400).json({ message: 'Заполните обязательные поля брони.' });
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
    return res.status(400).json({ message: 'Некорректный статус брони.' });
  }

  const reservation = reservations.find((item) => item.id === id);
  if (!reservation) {
    return res.status(404).json({ message: 'Бронь не найдена.' });
  }

  reservation.status = status;
  res.json(reservation);
});

app.delete('/api/reservations/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = reservations.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Бронь не найдена.' });
  }

  reservations.splice(index, 1);
  res.status(204).send();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Beach resort app is running on http://localhost:${PORT}`);
});
