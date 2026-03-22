const bookingMap = document.getElementById('bookingMap');
const bookingMapShell = document.getElementById('bookingMapShell');
const bookingMapCanvas = document.getElementById('bookingMapCanvas');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const availabilityWarning = document.getElementById('availabilityWarning');
const mapZoomInButton = document.getElementById('mapZoomIn');
const mapZoomOutButton = document.getElementById('mapZoomOut');
const mapZoomResetButton = document.getElementById('mapZoomReset');

const tableInfoEmpty = document.getElementById('tableInfoEmpty');
const tableInfoDetails = document.getElementById('tableInfoDetails');
const tablePhotoCard = document.getElementById('tablePhotoCard');
const tablePhoto = document.getElementById('tablePhoto');
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
const minZoom = 1;
const maxZoom = 2.5;
const zoomStep = 0.25;
const doubleTapZoomStep = 0.5;
let currentZoom = 1;
let currentMapDimensions = null;
let lastTapTimestamp = 0;
let lastTapPoint = null;

const touchState = {
  mode: null,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  startScrollTop: 0,
  moved: false,
  pinchStartDistance: 0,
  pinchStartZoom: 1,
  pinchCenterContent: null,
  targetTableElement: null
};

function clampZoom(nextZoom) {
  return Math.min(Math.max(nextZoom, minZoom), maxZoom);
}

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

function getDisplayScale(zoom = currentZoom) {
  return getFitScale() * zoom;
}

function getContentPointFromClient(clientX, clientY, displayScale = getDisplayScale()) {
  if (!bookingMapShell || !displayScale) {
    return null;
  }

  const rect = bookingMapShell.getBoundingClientRect();
  return {
    x: (bookingMapShell.scrollLeft + (clientX - rect.left)) / displayScale,
    y: (bookingMapShell.scrollTop + (clientY - rect.top)) / displayScale
  };
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
  const canZoomOut = currentZoom > minZoom + 0.01;
  const canZoomIn = currentZoom < maxZoom - 0.01;

  if (mapZoomOutButton) mapZoomOutButton.disabled = !canZoomOut;
  if (mapZoomInButton) mapZoomInButton.disabled = !canZoomIn;
  if (mapZoomResetButton) mapZoomResetButton.textContent = `${Math.round(currentZoom * 100)}%`;
}

function updateMapViewport(options = {}) {
  if (!currentMapDimensions || !bookingMap || !bookingMapCanvas || !bookingMapShell) {
    return;
  }

  const {
    keepCenter = false,
    contentPoint = null,
    viewportPoint = null
  } = options;

  const previousScrollWidth = bookingMapShell.scrollWidth || bookingMapShell.clientWidth;
  const previousScrollHeight = bookingMapShell.scrollHeight || bookingMapShell.clientHeight;
  const viewportCenterX = bookingMapShell.scrollLeft + bookingMapShell.clientWidth / 2;
  const viewportCenterY = bookingMapShell.scrollTop + bookingMapShell.clientHeight / 2;
  const relativeCenterX = previousScrollWidth ? viewportCenterX / previousScrollWidth : 0.5;
  const relativeCenterY = previousScrollHeight ? viewportCenterY / previousScrollHeight : 0.5;

  const displayScale = getDisplayScale();
  const scaledWidth = Math.max(currentMapDimensions.width * displayScale, bookingMapShell.clientWidth);
  const scaledHeight = Math.max(currentMapDimensions.height * displayScale, bookingMapShell.clientHeight);

  bookingMapCanvas.style.width = `${scaledWidth}px`;
  bookingMapCanvas.style.height = `${scaledHeight}px`;

  bookingMap.style.width = `${currentMapDimensions.width}px`;
  bookingMap.style.height = `${currentMapDimensions.height}px`;
  bookingMap.style.minHeight = `${currentMapDimensions.height}px`;
  bookingMap.style.transformOrigin = 'top left';
  bookingMap.style.transform = `scale(${displayScale})`;

  if (contentPoint && viewportPoint) {
    bookingMapShell.scrollLeft = contentPoint.x * displayScale - viewportPoint.x;
    bookingMapShell.scrollTop = contentPoint.y * displayScale - viewportPoint.y;
  } else if (keepCenter) {
    bookingMapShell.scrollLeft = scaledWidth * relativeCenterX - bookingMapShell.clientWidth / 2;
    bookingMapShell.scrollTop = scaledHeight * relativeCenterY - bookingMapShell.clientHeight / 2;
  } else if (currentZoom === minZoom) {
    bookingMapShell.scrollLeft = 0;
    bookingMapShell.scrollTop = 0;
  }

  clampMapScroll();
  updateMapControls();
}

function setMapZoom(nextZoom, options = {}) {
  const safeZoom = clampZoom(nextZoom);

  if (Math.abs(safeZoom - currentZoom) < 0.001 && currentMapDimensions) {
    updateMapViewport(options.contentPoint ? options : {});
    return;
  }

  currentZoom = safeZoom;
  updateMapViewport(
    options.contentPoint
      ? options
      : { keepCenter: options.keepCenter ?? true }
  );
}

function zoomAroundClientPoint(nextZoom, clientX, clientY) {
  if (!bookingMapShell) {
    return;
  }

  const rect = bookingMapShell.getBoundingClientRect();
  const contentPoint = getContentPointFromClient(clientX, clientY);
  if (!contentPoint) {
    setMapZoom(nextZoom, { keepCenter: true });
    return;
  }

  setMapZoom(nextZoom, {
    contentPoint,
    viewportPoint: {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
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

  if (tablePhotoCard && tablePhoto) {
    if (table.photoUrl) {
      tablePhoto.src = table.photoUrl;
      tablePhoto.alt = `Фото столу ${table.code || table.name || ''}`.trim();
      tablePhotoCard.classList.remove('hidden');
    } else {
      tablePhoto.removeAttribute('src');
      tablePhoto.alt = 'Фото столу';
      tablePhotoCard.classList.add('hidden');
    }
  }
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
  if (tablePhotoCard && tablePhoto) {
    tablePhotoCard.classList.add('hidden');
    tablePhoto.removeAttribute('src');
    tablePhoto.alt = 'Фото столу';
  }
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

  element.className = `map-object ${object.type === 'TABLE' ? 'map-object--table' : `map-object--static map-object--${String(object.type || '').toLowerCase()}`}`;
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
  currentZoom = minZoom;

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  tableElementsById.clear();
  bookingMap.innerHTML = '';
  bookingMap.style.aspectRatio = 'auto';
  bookingMap.style.setProperty('--map-background-color', map.backgroundColor || '#10182a');
  bookingMap.style.setProperty('--map-background-image', map.backgroundImage ? `url(${map.backgroundImage})` : 'none');

  const backgroundLayer = document.createElement('div');
  backgroundLayer.className = 'booking-map-background';
  backgroundLayer.setAttribute('aria-hidden', 'true');
  bookingMap.appendChild(backgroundLayer);

  const gridLayer = document.createElement('div');
  gridLayer.className = 'booking-map-grid';
  gridLayer.setAttribute('aria-hidden', 'true');
  bookingMap.appendChild(gridLayer);

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

function getDistanceBetweenTouches(touchA, touchB) {
  return Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
}

function getTouchMidpoint(touchA, touchB) {
  return {
    clientX: (touchA.clientX + touchB.clientX) / 2,
    clientY: (touchA.clientY + touchB.clientY) / 2
  };
}

function resetTouchState() {
  touchState.mode = null;
  touchState.moved = false;
  touchState.pinchStartDistance = 0;
  touchState.pinchCenterContent = null;
  touchState.targetTableElement = null;
}

function handleTouchStart(event) {
  if (!bookingMapShell || !currentMapDimensions) {
    return;
  }

  if (event.touches.length === 2) {
    const [touchA, touchB] = event.touches;
    touchState.mode = 'pinch';
    touchState.moved = true;
    touchState.pinchStartDistance = getDistanceBetweenTouches(touchA, touchB);
    touchState.pinchStartZoom = currentZoom;
    const midpoint = getTouchMidpoint(touchA, touchB);
    touchState.pinchCenterContent = getContentPointFromClient(midpoint.clientX, midpoint.clientY);
    event.preventDefault();
    return;
  }

  if (event.touches.length !== 1) {
    return;
  }

  const [touch] = event.touches;
  touchState.mode = 'pan';
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  touchState.startScrollLeft = bookingMapShell.scrollLeft;
  touchState.startScrollTop = bookingMapShell.scrollTop;
  touchState.moved = false;
  touchState.targetTableElement = event.target.closest('.map-object--table');
}

function handleTouchMove(event) {
  if (!bookingMapShell || !currentMapDimensions) {
    return;
  }

  if (touchState.mode === 'pinch' && event.touches.length === 2) {
    const [touchA, touchB] = event.touches;
    const midpoint = getTouchMidpoint(touchA, touchB);
    const distance = getDistanceBetweenTouches(touchA, touchB);
    const ratio = touchState.pinchStartDistance ? distance / touchState.pinchStartDistance : 1;

    setMapZoom(touchState.pinchStartZoom * ratio, {
      contentPoint: touchState.pinchCenterContent,
      viewportPoint: {
        x: midpoint.clientX - bookingMapShell.getBoundingClientRect().left,
        y: midpoint.clientY - bookingMapShell.getBoundingClientRect().top
      }
    });
    event.preventDefault();
    return;
  }

  if (touchState.mode !== 'pan' || event.touches.length !== 1) {
    return;
  }

  const [touch] = event.touches;
  const deltaX = touch.clientX - touchState.startX;
  const deltaY = touch.clientY - touchState.startY;

  if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
    touchState.moved = true;
  }

  if (!touchState.moved) {
    return;
  }

  bookingMapShell.scrollLeft = touchState.startScrollLeft - deltaX;
  bookingMapShell.scrollTop = touchState.startScrollTop - deltaY;
  clampMapScroll();
  event.preventDefault();
}

function handleTouchEnd(event) {
  if (!bookingMapShell) {
    return;
  }

  if (touchState.mode === 'pinch' && event.touches.length === 1) {
    const [touch] = event.touches;
    touchState.mode = 'pan';
    touchState.startX = touch.clientX;
    touchState.startY = touch.clientY;
    touchState.startScrollLeft = bookingMapShell.scrollLeft;
    touchState.startScrollTop = bookingMapShell.scrollTop;
    touchState.moved = false;
    touchState.targetTableElement = event.target.closest('.map-object--table');
    return;
  }

  if (touchState.mode === 'pan' && !touchState.moved && event.changedTouches.length === 1) {
    const [touch] = event.changedTouches;
    const now = Date.now();
    const lastPoint = lastTapPoint;
    const isDoubleTap = lastPoint
      && now - lastTapTimestamp < 320
      && Math.abs(lastPoint.x - touch.clientX) < 24
      && Math.abs(lastPoint.y - touch.clientY) < 24;

    lastTapTimestamp = now;
    lastTapPoint = { x: touch.clientX, y: touch.clientY };

    if (isDoubleTap && !touchState.targetTableElement) {
      zoomAroundClientPoint(currentZoom + doubleTapZoomStep, touch.clientX, touch.clientY);
      event.preventDefault();
    }
  }

  if (event.touches.length === 0) {
    resetTouchState();
  }
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

mapZoomInButton?.addEventListener('click', () => setMapZoom(currentZoom + zoomStep, { keepCenter: true }));
mapZoomOutButton?.addEventListener('click', () => setMapZoom(currentZoom - zoomStep, { keepCenter: true }));
mapZoomResetButton?.addEventListener('click', () => setMapZoom(minZoom));
bookingMapShell?.addEventListener('touchstart', handleTouchStart, { passive: false });
bookingMapShell?.addEventListener('touchmove', handleTouchMove, { passive: false });
bookingMapShell?.addEventListener('touchend', handleTouchEnd, { passive: false });
bookingMapShell?.addEventListener('touchcancel', resetTouchState);
window.addEventListener('resize', () => updateMapViewport({ keepCenter: true }));

ensureDefaultDateTime();
updateStats();
updateSelectedStatusBadge('', 'Не обрано');
updateMapControls();
fetchDefaultMap();
