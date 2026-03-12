const reservations = [];
let reservationId = 1;

function getReservations() {
  return reservations;
}

function createReservation(payload) {
  const { guestName, phone, date, time, guests, zone, note } = payload;

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
  return reservation;
}

function updateReservationStatus(id, status) {
  const reservation = reservations.find((item) => item.id === id);
  if (!reservation) {
    return null;
  }

  reservation.status = status;
  return reservation;
}

function deleteReservation(id) {
  const index = reservations.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  reservations.splice(index, 1);
  return true;
}

module.exports = {
  getReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation
};
