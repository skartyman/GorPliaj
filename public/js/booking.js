const bookingMap = document.getElementById('bookingMap');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');

const tableInfoEmpty = document.getElementById('tableInfoEmpty');
const tableInfoDetails = document.getElementById('tableInfoDetails');
const tableCode = document.getElementById('tableCode');
const tableName = document.getElementById('tableName');
const tableSeats = document.getElementById('tableSeats');
const tableDeposit = document.getElementById('tableDeposit');
const tableZone = document.getElementById('tableZone');

const reservationForm = document.getElementById('reservationForm');
const reservationError = document.getElementById('reservationError');
const reservationSuccess = document.getElementById('reservationSuccess');

const reservationDateInput = reservationForm.elements.reservationDate;
const timeFromInput = reservationForm.elements.timeFrom;
const timeToInput = reservationForm.elements.timeTo;

let selectedTable = null;
let currentMapId = null;
let availabilityState = { busyTableIds: [], heldTableIds: [] };
const tableElementsById = new Map();

function showError(message) {
  loadingState.classList.add('hidden');
  bookingMap.classList.add('hidden');
  errorState.textContent = message;
  errorState.classList.remove('hidden');
}

function showTableInfo(table, zoneName = '—') {
  tableInfoEmpty.classList.add('hidden');
  tableInfoDetails.classList.remove('hidden');

  tableCode.textContent = table.code || '—';
  tableName.textContent = table.name || '—';
  tableSeats.textContent = `${table.seatsMin ?? '—'} / ${table.seatsMax ?? '—'}`;
  tableDeposit.textContent = table.deposit ?? '—';
  tableZone.textContent = zoneName;
}

function resetMessages() {
  reservationError.textContent = '';
  reservationError.classList.add('hidden');
  reservationSuccess.textContent = '';
  reservationSuccess.classList.add('hidden');
}

function showReservationError(message) {
  reservationSuccess.classList.add('hidden');
  reservationError.textContent = message;
  reservationError.classList.remove('hidden');
}

function showReservationSuccess(message) {
  reservationError.classList.add('hidden');
  reservationSuccess.textContent = message;
  reservationSuccess.classList.remove('hidden');
}

function showReservationForm(table) {
  selectedTable = table;
  reservationForm.classList.remove('hidden');
  resetMessages();
}

function isTableBusy(tableId) {
  return availabilityState.busyTableIds.includes(tableId);
}

function updateTableAvailabilityUI() {
  tableElementsById.forEach((element, tableId) => {
    const busy = isTableBusy(tableId);
    element.classList.toggle('map-object--busy', busy);
    element.disabled = busy;
  });

  if (selectedTable && isTableBusy(selectedTable.id)) {
    selectedTable = null;
    reservationForm.classList.add('hidden');
    showReservationError('Обраний стіл уже зайнятий на вказаний час. Оберіть інший.');
  }
}

function createMapObjectElement(object, map, tableById, zoneById) {
  const element = document.createElement(object.type === 'TABLE' ? 'button' : 'div');

  const left = (object.x / map.width) * 100;
  const top = (object.y / map.height) * 100;
  const width = (object.width / map.width) * 100;
  const height = (object.height / map.height) * 100;

  element.className = `map-object ${object.type === 'TABLE' ? 'map-object--table' : 'map-object--static'}`;
  element.style.left = `${left}%`;
  element.style.top = `${top}%`;
  element.style.width = `${width}%`;
  element.style.height = `${height}%`;
  element.style.transform = `rotate(${object.rotation || 0}deg)`;
  element.style.zIndex = `${object.zIndex || 1}`;

  const label = document.createElement('span');
  label.className = 'map-object-label';
  label.textContent = object.label || object.type;
  element.appendChild(label);

  if (object.type === 'TABLE') {
    const table = tableById.get(object.tableId);

    element.type = 'button';
    element.title = table?.name || table?.code || 'Table';

    if (table) {
      tableElementsById.set(table.id, element);
    }

    element.addEventListener('click', () => {
      if (!table) {
        showTableInfo({ code: '—', name: 'Not found', seatsMin: '—', seatsMax: '—', deposit: '—' }, '—');
        return;
      }

      if (isTableBusy(table.id)) {
        showReservationError('Цей стіл зайнятий на обраний час.');
        return;
      }

      const zone = zoneById.get(table.zoneId);
      showTableInfo(table, zone?.name || '—');
      showReservationForm(table);
    });
  }

  return element;
}

function renderMap(data) {
  const { map, objects = [], tables = [], zones = [] } = data;

  if (!map || !map.width || !map.height) {
    throw new Error('Invalid map dimensions');
  }

  currentMapId = map.id;

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  tableElementsById.clear();
  bookingMap.innerHTML = '';
  bookingMap.style.aspectRatio = `${map.width} / ${map.height}`;

  objects.forEach((object) => {
    const objectElement = createMapObjectElement(object, map, tableById, zoneById);
    bookingMap.appendChild(objectElement);
  });

  updateTableAvailabilityUI();

  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  bookingMap.classList.remove('hidden');
}

function getAvailabilityParams() {
  const date = reservationDateInput.value;
  const timeFrom = timeFromInput.value;
  const timeTo = timeToInput.value;

  if (!currentMapId || !date || !timeFrom || !timeTo) {
    return null;
  }

  return { date, timeFrom, timeTo };
}

async function fetchAvailability() {
  const params = getAvailabilityParams();
  if (!params) {
    availabilityState = { busyTableIds: [], heldTableIds: [] };
    updateTableAvailabilityUI();
    return;
  }

  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/maps/${currentMapId}/availability?${query}`);
    if (!response.ok) {
      throw new Error('Availability request failed');
    }

    const data = await response.json();
    availabilityState = {
      busyTableIds: Array.isArray(data.busyTableIds) ? data.busyTableIds : [],
      heldTableIds: Array.isArray(data.heldTableIds) ? data.heldTableIds : []
    };
    updateTableAvailabilityUI();
  } catch (error) {
    availabilityState = { busyTableIds: [], heldTableIds: [] };
    updateTableAvailabilityUI();
  }
}

async function submitReservation(event) {
  event.preventDefault();

  if (!selectedTable) {
    showReservationError('Спочатку оберіть столик на мапі.');
    return;
  }

  if (isTableBusy(selectedTable.id)) {
    showReservationError('Цей стіл зайнятий на обраний час. Оберіть інший.');
    return;
  }

  resetMessages();

  const formData = new FormData(reservationForm);
  const payload = {
    tableId: selectedTable.id,
    mapId: selectedTable.mapId,
    zoneId: selectedTable.zoneId,
    customerName: formData.get('customerName')?.toString().trim(),
    customerPhone: formData.get('customerPhone')?.toString().trim(),
    guests: Number(formData.get('guests')),
    reservationDate: formData.get('reservationDate')?.toString(),
    timeFrom: formData.get('timeFrom')?.toString(),
    timeTo: formData.get('timeTo')?.toString(),
    commentCustomer: formData.get('commentCustomer')?.toString().trim() || ''
  };

  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      showReservationError(responseData.message || 'Не вдалося створити бронювання.');
      if (response.status === 409) {
        await fetchAvailability();
      }
      return;
    }

    reservationForm.reset();
    availabilityState = { busyTableIds: [], heldTableIds: [] };
    selectedTable = null;
    showReservationSuccess('Бронювання створено успішно. Очікуйте підтвердження від адміністратора.');
  } catch (error) {
    showReservationError('Помилка мережі. Спробуйте ще раз.');
  }
}

async function fetchDefaultMap() {
  try {
    const response = await fetch('/api/maps/default');
    if (!response.ok) {
      throw new Error('Failed to load map');
    }

    const data = await response.json();
    renderMap(data);
  } catch (error) {
    showError('Не вдалося завантажити карту. Спробуйте пізніше.');
  }
}

reservationForm.addEventListener('submit', submitReservation);
reservationDateInput.addEventListener('change', fetchAvailability);
timeFromInput.addEventListener('change', fetchAvailability);
timeToInput.addEventListener('change', fetchAvailability);
fetchDefaultMap();
