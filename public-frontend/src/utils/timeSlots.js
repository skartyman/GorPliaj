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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hours = Number(obj.hour);
  const minutes = Number(obj.minute);

  let totalMinutes = hours * 60 + minutes;
  totalMinutes = Math.ceil(totalMinutes / 15) * 15 + 15;

  const roundedHour = Math.floor(totalMinutes / 60) % 24;
  const roundedMinute = totalMinutes % 60;

  return `${String(roundedHour).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`;
}
