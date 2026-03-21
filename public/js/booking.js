const bookingMap = document.getElementById('bookingMap');
const bookingMapShell = document.getElementById('bookingMapShell');
const bookingMapCanvas = document.getElementById('bookingMapCanvas');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const availabilityWarning = document.getElementById('availabilityWarning');
const mapZoomInButton = document.getElementById('mapZoomIn');
const mapZoomOutButton = document.getElementById('mapZoomOut');
const mapZoomResetButton = document.getElementById('mapZoomReset');
const mapPanUpButton = document.getElementById('mapPanUp');
const mapPanRightButton = document.getElementById('mapPanRight');
const mapPanDownButton = document.getElementById('mapPanDown');
const mapPanLeftButton = document.getElementById('mapPanLeft');

const tableInfoEmpty = document.getElementById('tableInfoEmpty');
const tableInfoDetails = document.getElementById('tableInfoDetails');
const tableCode = document.getElementById('tableCode');
const tableName = document.getElementById('tableName');
const tableSeats = document.getElementById('tableSeats');
const tableDeposit = document.getElementById('tableDeposit');
const tableZone = document.getElementById('tableZone');
const selectedTableStatus = document.getElementById('selectedTableStatus');

const reservationForm = document.getElementById('reservationForm');
const reservationError = document.getElementById('reservationError');
const reservationSuccess = document.getElementById('reservationSuccess');
const dateQuickSelect = document.getElementById('dateQuickSelect');

const reservationDateInput = reservationForm.elements.reservationDate;
const timeFromInput = reservationForm.elements.timeFrom;

const mapStatFree = document.getElementById('mapStatFree');
const mapStatBusy = document.getElementById('mapStatBusy');
const mapStatHeld = document.getElementById('mapStatHeld');

let selectedTable = null;
let currentMapId = null;
let availabilityState = { busyTableIds: [], heldTableIds: [], freeTableIds: [] };
const tableElementsById = new Map();
const defaultEmptyTableMessage = 'Натисніть на стіл на мапі.';
const zoomSteps = [1, 1.25, 1.5, 2, 2.5];
let currentZoomIndex = 0;
let currentMapDimensions = null;

function getFitScale() {
  if (!currentMapDimensions || !bookingMapShell) {
    return 1;
  }

  const shellWidth = bookingMapShell.clientWidth || currentMapDimensions.width;
  const shellHeight = bookingMapShell.clientHeight || currentMapDimensions.height;

  if (!shellWidth || !shellHeight) {
    return 1;
  }

  return Math.min(shellWidth / currentMapDimensions.width, shellHeight / currentMapDimensions.height, 1);
}

function clampMapScroll() {
  if (!bookingMapShell) {
    return;
  }

  const maxScrollLeft = Math.max(bookingMapShell.scrollWidth - bookingMapShell.clientWidth, 0);
  const maxScrollTop = Math.max(bookingMapShell.scrollHeight - bookingMapShell.clientHeight, 0);

  bookingMapShell.scrollLeft = Math.min(Math.max(bookingMapShell.scrollLeft, 0), maxScrollLeft);
  bookingMapShell.scrollTop = Math.min(Math.max(bookingMapShell.scrollTop, 0), maxScrollTop);
}

function updateMapControls() {
  const canZoomOut = currentZoomIndex > 0;
  const canZoomIn = currentZoomIndex < zoomSteps.length - 1;
  const canPanX = bookingMapShell && bookingMapShell.scrollWidth > bookingMapShell.clientWidth + 2;
  const canPanY = bookingMapShell && bookingMapShell.scrollHeight > bookingMapShell.clientHeight + 2;

  if (mapZoomOutButton) mapZoomOutButton.disabled = !canZoomOut;
  if (mapZoomInButton) mapZoomInButton.disabled = !canZoomIn;
  if (mapZoomResetButton) mapZoomResetButton.textContent = `${Math.round(zoomSteps[currentZoomIndex] * 100)}%`;
  if (mapPanLeftButton) mapPanLeftButton.disabled = !canPanX;
  if (mapPanRightButton) mapPanRightButton.disabled = !canPanX;
  if (mapPanUpButton) mapPanUpButton.disabled = !canPanY;
  if (mapPanDownButton) mapPanDownButton.disabled = !canPanY;
}

function updateMapViewport(keepCenter = false) {
  if (!currentMapDimensions || !bookingMap || !bookingMapCanvas || !bookingMapShell) {
    return;
  }

  const previousScrollWidth = bookingMapShell.scrollWidth || bookingMapShell.clientWidth;
  const previousScrollHeight = bookingMapShell.scrollHeight || bookingMapShell.clientHeight;
  const viewportCenterX = bookingMapShell.scrollLeft + bookingMapShell.clientWidth / 2;
  const viewportCenterY = bookingMapShell.scrollTop + bookingMapShell.clientHeight / 2;
  const relativeCenterX = previousScrollWidth ? viewportCenterX / previousScrollWidth : 0.5;
  const relativeCenterY = previousScrollHeight ? viewportCenterY / previousScrollHeight : 0.5;

  const fitScale = getFitScale();
  const displayScale = fitScale * zoomSteps[currentZoomIndex];
  const scaledWidth = Math.max(currentMapDimensions.width * displayScale, bookingMapShell.clientWidth);
  const scaledHeight = Math.max(currentMapDimensions.height * displayScale, bookingMapShell.clientHeight);

  bookingMapCanvas.style.width = `${scaledWidth}px`;
  bookingMapCanvas.style.height = `${scaledHeight}px`;

  bookingMap.style.width = `${currentMapDimensions.width}px`;
  bookingMap.style.height = `${currentMapDimensions.height}px`;
  bookingMap.style.minHeight = `${currentMapDimensions.height}px`;
  bookingMap.style.transformOrigin = 'top left';
  bookingMap.style.transform = `scale(${displayScale})`;

  if (keepCenter) {
    const nextScrollLeft = scaledWidth * relativeCenterX - bookingMapShell.clientWidth / 2;
    const nextScrollTop = scaledHeight * relativeCenterY - bookingMapShell.clientHeight / 2;

    bookingMapShell.scrollLeft = nextScrollLeft;
    bookingMapShell.scrollTop = nextScrollTop;
  } else if (currentZoomIndex === 0) {
    bookingMapShell.scrollLeft = 0;
    bookingMapShell.scrollTop = 0;
  }

  clampMapScroll();
  updateMapControls();
}

function setMapZoom(nextZoomIndex) {
  const safeZoomIndex = Math.min(Math.max(nextZoomIndex, 0), zoomSteps.length - 1);

  if (safeZoomIndex === currentZoomIndex && currentMapDimensions) {
    updateMapViewport();
    return;
  }

  currentZoomIndex = safeZoomIndex;
  updateMapViewport(true);
}

function panMap(deltaX = 0, deltaY = 0) {
  if (!bookingMapShell) {
    return;
  }

  bookingMapShell.scrollBy({
    left: deltaX,
    top: deltaY,
    behavior: 'smooth'
  });
}

function showError(message) {
  loadingState.classList.add('hidden');
  bookingMap.classList.add('hidden');
  bookingMapCanvas?.classList.add('hidden');
  errorState.textContent = message;
  errorState.classList.remove('hidden');
}

function setTableInfoEmptyMessage(message = defaultEmptyTableMessage) {
  tableInfoEmpty.textContent = message;
}

function updateSelectedStatusBadge(status = '', label = 'Не обрано') {
  selectedTableStatus.textContent = label;
  selectedTableStatus.className = `status-pill${label ? '' : ' hidden'}`;

  if (!status) {
    selectedTableStatus.classList.add('hidden');
    return;
  }

  selectedTableStatus.classList.remove('hidden');
  if (status === 'free') selectedTableStatus.classList.add('is-free');
  if (status === 'busy') selectedTableStatus.classList.add('is-busy');
  if (status === 'held') selectedTableStatus.classList.add('is-held');
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

function clearSelectionUI() {
  tableElementsById.forEach((element) => element.classList.remove('map-object--selected'));
}

function resetSelectedTableUI(emptyMessage = defaultEmptyTableMessage) {
  selectedTable = null;
  clearSelectionUI();
  reservationForm.classList.add('hidden');
  tableInfoDetails.classList.add('hidden');
  setTableInfoEmptyMessage(emptyMessage);
  tableInfoEmpty.classList.remove('hidden');
  updateSelectedStatusBadge('', 'Не обрано');
}

function showReservationForm(table) {
  selectedTable = table;
  clearSelectionUI();

  const selectedElement = tableElementsById.get(table.id);
  if (selectedElement) {
    selectedElement.classList.add('map-object--selected');
  }

  reservationForm.classList.remove('hidden');
  resetMessages();
}

function isTableBusy(tableId) {
  return availabilityState.busyTableIds.includes(tableId);
}

function isTableHeld(tableId) {
  return availabilityState.heldTableIds.includes(tableId);
}

function isTableFree(tableId) {
  return availabilityState.freeTableIds.includes(tableId);
}

function updateStats() {
  mapStatBusy.textContent = availabilityState.busyTableIds.length;
  mapStatHeld.textContent = availabilityState.heldTableIds.length;

  const explicitFree = availabilityState.freeTableIds.length;
  const inferredFree = Math.max(tableElementsById.size - availabilityState.busyTableIds.length - availabilityState.heldTableIds.length, 0);
  mapStatFree.textContent = explicitFree || inferredFree;
}

function updateSelectedStatusFromAvailability() {
  if (!selectedTable) {
    updateSelectedStatusBadge('', 'Не обрано');
    return;
  }

  if (isTableBusy(selectedTable.id)) {
    updateSelectedStatusBadge('busy', 'Busy');
    return;
  }

  if (isTableHeld(selectedTable.id)) {
    updateSelectedStatusBadge('held', 'Held');
    return;
  }

  updateSelectedStatusBadge('free', 'Free');
}

function updateTableAvailabilityUI() {
  tableElementsById.forEach((element, tableId) => {
    const busy = isTableBusy(tableId);
    const held = isTableHeld(tableId);
    const free = isTableFree(tableId) || (!busy && !held);

    element.classList.toggle('map-object--busy', busy);
    element.classList.toggle('map-object--held', held);
    element.classList.toggle('map-object--free', free);
    element.disabled = busy || held;
  });

  updateStats();
  updateSelectedStatusFromAvailability();

  if (selectedTable && (isTableBusy(selectedTable.id) || isTableHeld(selectedTable.id))) {
    resetSelectedTableUI();
    showReservationError('Обраний стіл уже недоступний на вказаний час. Оберіть інший.');
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

      if (isTableBusy(table.id) || isTableHeld(table.id)) {
        showReservationError('Цей стіл недоступний на обраний час.');
        return;
      }

      const zone = zoneById.get(table.zoneId);
      setTableInfoEmptyMessage(defaultEmptyTableMessage);
      showTableInfo(table, zone?.name || '—');
      showReservationForm(table);
      updateSelectedStatusBadge('free', 'Free');
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
  currentMapDimensions = { width: map.width, height: map.height };
  currentZoomIndex = 0;

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  tableElementsById.clear();
  bookingMap.innerHTML = '';
  bookingMap.style.aspectRatio = 'auto';

  objects.forEach((object) => {
    const objectElement = createMapObjectElement(object, map, tableById, zoneById);
    bookingMap.appendChild(objectElement);
  });

  updateTableAvailabilityUI();
  updateMapViewport();

  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  bookingMapCanvas?.classList.remove('hidden');
  bookingMap.classList.remove('hidden');
}

function getAvailabilityParams() {
  const date = reservationDateInput.value;
  const timeFrom = timeFromInput.value;

  if (!currentMapId || !date || !timeFrom) {
    return null;
  }

  return { date, timeFrom };
}

function showAvailabilityWarning(message) {
  if (!availabilityWarning) {
    return;
  }

  availabilityWarning.textContent = message || '';
  availabilityWarning.classList.toggle('hidden', !message);
}

async function fetchAvailability() {
  const params = getAvailabilityParams();
  if (!params) {
    availabilityState = { busyTableIds: [], heldTableIds: [], freeTableIds: [] };
    updateTableAvailabilityUI();
    showAvailabilityWarning('');
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
      heldTableIds: Array.isArray(data.heldTableIds) ? data.heldTableIds : [],
      freeTableIds: Array.isArray(data.freeTableIds) ? data.freeTableIds : []
    };
    updateTableAvailabilityUI();
    showAvailabilityWarning('');
  } catch (error) {
    showAvailabilityWarning('Не вдалося оновити доступність столів. Показано попередні дані.');
  }
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function renderDateQuickSelect() {
  if (!dateQuickSelect) {
    return;
  }

  const today = new Date();
  const currentValue = reservationDateInput.value;
  dateQuickSelect.innerHTML = '';

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const isoDate = toIsoDate(date);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `date-chip ${isoDate === currentValue ? 'date-chip--active' : ''}`;
    chip.dataset.date = isoDate;
    chip.innerHTML = `<span>${date.toLocaleDateString('uk-UA', { weekday: 'short' })}</span><strong>${date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}</strong>`;
    chip.addEventListener('click', () => {
      reservationDateInput.value = isoDate;
      renderDateQuickSelect();
      fetchAvailability();
    });

    dateQuickSelect.appendChild(chip);
  }
}

function roundToNextHalfHour(date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  const minutes = rounded.getMinutes();
  const delta = (30 - (minutes % 30)) % 30;
  rounded.setMinutes(minutes + (delta === 0 ? 30 : delta));

  return rounded;
}

function ensureDefaultDateTime() {
  const now = new Date();
  if (!reservationDateInput.value) {
    reservationDateInput.value = toIsoDate(now);
  }

  reservationDateInput.min = toIsoDate(now);

  if (!timeFromInput.value) {
    const rounded = roundToNextHalfHour(now);
    timeFromInput.value = `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
  }

  renderDateQuickSelect();
}

async function submitReservation(event) {
  event.preventDefault();

  if (!selectedTable) {
    showReservationError('Спочатку оберіть столик на мапі.');
    return;
  }

  if (isTableBusy(selectedTable.id) || isTableHeld(selectedTable.id)) {
    showReservationError('Цей стіл недоступний на обраний час. Оберіть інший.');
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
    ensureDefaultDateTime();
    showReservationSuccess('Бронювання створено успішно. Ви можете обрати інший стіл.');
    resetSelectedTableUI('Бронювання створено успішно. Ви можете обрати інший стіл.');
    await fetchAvailability();
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
    await fetchAvailability();
  } catch (error) {
    showError('Не вдалося завантажити карту. Спробуйте пізніше.');
  }
}

reservationForm.addEventListener('submit', submitReservation);
reservationDateInput.addEventListener('change', () => {
  renderDateQuickSelect();
  fetchAvailability();
});
reservationDateInput.addEventListener('input', () => {
  renderDateQuickSelect();
  fetchAvailability();
});
timeFromInput.addEventListener('change', fetchAvailability);
timeFromInput.addEventListener('input', fetchAvailability);

mapZoomInButton?.addEventListener('click', () => setMapZoom(currentZoomIndex + 1));
mapZoomOutButton?.addEventListener('click', () => setMapZoom(currentZoomIndex - 1));
mapZoomResetButton?.addEventListener('click', () => setMapZoom(0));
mapPanUpButton?.addEventListener('click', () => panMap(0, -120));
mapPanRightButton?.addEventListener('click', () => panMap(120, 0));
mapPanDownButton?.addEventListener('click', () => panMap(0, 120));
mapPanLeftButton?.addEventListener('click', () => panMap(-120, 0));
bookingMapShell?.addEventListener('scroll', updateMapControls, { passive: true });
window.addEventListener('resize', () => updateMapViewport(true));

ensureDefaultDateTime();
updateStats();
updateSelectedStatusBadge('', 'Не обрано');
updateMapControls();
fetchDefaultMap();
