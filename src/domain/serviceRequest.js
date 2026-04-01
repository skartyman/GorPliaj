const SERVICE_REQUEST_STATUS = {
  NEW: 'NEW',
  TRIAGE: 'TRIAGE',
  WAITING_MANAGER: 'WAITING_MANAGER',
  WAITING_CLIENT: 'WAITING_CLIENT',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_PARTS: 'WAITING_PARTS',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED'
};

const SERVICE_REQUEST_CATEGORIES = [
  'Не включается',
  'Нет воды / нет пролива',
  'Не греет',
  'Ошибка на дисплее',
  'Течь',
  'Плохой пролив / качество кофе',
  'Другое'
];

module.exports = {
  SERVICE_REQUEST_STATUS,
  SERVICE_REQUEST_CATEGORIES
};
