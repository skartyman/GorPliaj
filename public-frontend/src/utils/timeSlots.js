export function generateTimeSlots(date, today, currentTime, bookingKind) {
  if (date === today && currentTime >= '12:00' && bookingKind === 'BEACH') {
    return [];
  }
  const slots = [];
  const startHour = 9;
  const endHour = bookingKind === 'BEACH' ? 13 : 20;

  for (let hour = startHour; hour <= endHour; hour++) {
    for (const min of ['00', '30']) {
      if (bookingKind === 'BEACH' && hour === 13 && min === '30') continue;
      if (bookingKind === 'TABLE' && hour === 20 && min === '30') continue;

      const timeStr = `${String(hour).padStart(2, '0')}:${min}`;
      if (date === today && timeStr <= currentTime) {
        continue;
      }
      slots.push(timeStr);
    }
  }
  return slots;
}

export function getDefaultTime(formDate, bookingKind, today) {
  if (bookingKind !== 'TABLE' || formDate !== today) return '12:00';
  const now = new Date();
  const rounded = new Date(Math.ceil(now.getTime() / 900000) * 900000);
  rounded.setMinutes(rounded.getMinutes() + 15);
  return `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
}
