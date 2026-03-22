const bookingMap = document.getElementById('bookingMap');
const bookingMapShell = document.getElementById('bookingMapShell');
const bookingMapCanvas = document.getElementById('bookingMapCanvas');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const availabilityWarning = document.getElementById('availabilityWarning');
const mapZoomInButton = document.getElementById('mapZoomIn');
const mapZoomOutButton = document.getElementById('mapZoomOut');
const mapZoomResetButton = document.getElementById('mapZoomReset');
const languageToggle = document.getElementById('languageToggle');

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

let currentLanguage = localStorage.getItem('language') || 'uk';
let selectedTable = null;
let currentMapId = null;
let currentMapData = null;
let availabilityState = { busyTableIds: [], heldTableIds: [], freeTableIds: [] };
const tableElementsById = new Map();
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

const translations = {
  uk: {
    pageTitle: 'Бронювання столів — ГорПляж',
    brandSubtitle: 'Beach · Restaurant · Events',
    languageToggleLabel: 'EN',
    languageToggleAria: 'Switch language to English',
    bookingHeroTitle: 'Карта бронювання столів',
    bookingHeroSubtitle: 'Оберіть столик на мапі, перевірте його доступність і одразу підтвердіть бронювання.',
    bookingHighlightMap: 'Жива карта столів',
    bookingHighlightBooking: 'Швидке підтвердження онлайн',
    bookingHighlightSupport: 'Узгодження деталей у коментарі',
    backHome: '← На головну',
    statFree: 'Вільно',
    statBusy: 'Зайнято',
    statHeld: 'Утримується',
    bookingLayoutAria: 'Схема майданчика та інформація про стіл',
    venueMapTitle: 'Мапа закладу',
    venueMapSubtitle: 'Оглядайте зони, масштабуйте мапу та натискайте на вільні столи для бронювання.',
    loadingMap: 'Завантаження карти…',
    bookingMapAria: 'Мапа столів',
    mapControlsAria: 'Керування мапою',
    zoomInAria: 'Збільшити мапу',
    zoomOutAria: 'Зменшити мапу',
    zoomResetAria: 'Скинути масштаб',
    selectedTableTitle: 'Обраний стіл',
    selectedTableSubtitle: 'Після вибору столу заповніть коротку форму, щоб адміністратор міг швидко підтвердити бронювання.',
    selectedTableNone: 'Не обрано',
    selectTablePrompt: 'Натисніть на стіл на мапі.',
    detailCode: 'Код',
    detailName: 'Назва',
    detailSeats: 'Місця',
    detailDeposit: 'Депозит',
    detailZone: 'Зона',
    reservationFormTitle: 'Дані бронювання',
    customerName: 'Імʼя',
    customerPhone: 'Телефон',
    guests: 'Гостей',
    reservationDate: 'Дата',
    reservationTimeFrom: 'Час від',
    reservationComment: 'Коментар',
    commentPlaceholder: 'Необовʼязково',
    confirmReservation: 'Підтвердити бронювання',
    dateQuickSelectAria: 'Вибір дати на 7 днів',
    statusFree: 'Вільно',
    statusBusy: 'Зайнято',
    statusHeld: 'Утримується',
    statusNone: 'Не обрано',
    tablePhotoAlt: 'Фото столу',
    tablePhotoAltNamed: 'Фото столу {name}',
    tableFallbackName: 'Не знайдено',
    tableButtonTitle: 'Стіл',
    seatRange: '{min} / {max}',
    selectedTableUnavailable: 'Обраний стіл уже недоступний на вказаний час. Оберіть інший.',
    tableUnavailable: 'Цей стіл недоступний на обраний час.',
    chooseTableFirst: 'Спочатку оберіть столик на мапі.',
    bookingCreated: 'Бронювання створено успішно. Ви можете обрати інший стіл.',
    bookingCreateFailed: 'Не вдалося створити бронювання.',
    networkError: 'Помилка мережі. Спробуйте ще раз.',
    mapLoadFailed: 'Не вдалося завантажити карту. Спробуйте пізніше.',
    availabilityFailed: 'Не вдалося оновити доступність столів. Показано попередні дані.',
    weekdayLocale: 'uk-UA',
    dateLocale: 'uk-UA'
  },
  en: {
    pageTitle: 'Table Booking — GorPliaj',
    brandSubtitle: 'Beach · Restaurant · Events',
    languageToggleLabel: 'UK',
    languageToggleAria: 'Перемкнути мову на українську',
    bookingHeroTitle: 'Table booking map',
    bookingHeroSubtitle: 'Choose a table on the map, check availability, and confirm the reservation right away.',
    bookingHighlightMap: 'Live table map',
    bookingHighlightBooking: 'Fast online confirmation',
    bookingHighlightSupport: 'Share details in a comment',
    backHome: '← Back home',
    statFree: 'Free',
    statBusy: 'Busy',
    statHeld: 'Held',
    bookingLayoutAria: 'Venue plan and table details',
    venueMapTitle: 'Venue map',
    venueMapSubtitle: 'Browse the venue, zoom the map, and tap any available table to book it.',
    loadingMap: 'Loading map…',
    bookingMapAria: 'Table map',
    mapControlsAria: 'Map controls',
    zoomInAria: 'Zoom in map',
    zoomOutAria: 'Zoom out map',
    zoomResetAria: 'Reset zoom',
    selectedTableTitle: 'Selected table',
    selectedTableSubtitle: 'After choosing a table, fill in the short form so the team can confirm your reservation quickly.',
    selectedTableNone: 'Not selected',
    selectTablePrompt: 'Tap a table on the map.',
    detailCode: 'Code',
    detailName: 'Name',
    detailSeats: 'Seats',
    detailDeposit: 'Deposit',
    detailZone: 'Zone',
    reservationFormTitle: 'Reservation details',
    customerName: 'Name',
    customerPhone: 'Phone',
    guests: 'Guests',
    reservationDate: 'Date',
    reservationTimeFrom: 'Time from',
    reservationComment: 'Comment',
    commentPlaceholder: 'Optional',
    confirmReservation: 'Confirm reservation',
    dateQuickSelectAria: 'Pick a date for the next 7 days',
    statusFree: 'Free',
    statusBusy: 'Busy',
    statusHeld: 'Held',
    statusNone: 'Not selected',
    tablePhotoAlt: 'Table photo',
    tablePhotoAltNamed: 'Photo of table {name}',
    tableFallbackName: 'Not found',
    tableButtonTitle: 'Table',
    seatRange: '{min} / {max}',
    selectedTableUnavailable: 'The selected table is no longer available for the chosen time. Please select another one.',
    tableUnavailable: 'This table is unavailable for the selected time.',
    chooseTableFirst: 'Please choose a table on the map first.',
    bookingCreated: 'Reservation created successfully. You can choose another table.',
    bookingCreateFailed: 'Could not create the reservation.',
    networkError: 'Network error. Please try again.',
    mapLoadFailed: 'Could not load the map. Please try again later.',
    availabilityFailed: 'Could not refresh table availability. Previous data is shown.',
    weekdayLocale: 'en-US',
    dateLocale: 'en-US'
  }
};

function t(key, replacements = {}) {
  const dictionary = translations[currentLanguage] || translations.uk;
  const template = dictionary[key] || '';
  return Object.entries(replacements).reduce(
    (result, [name, value]) => result.replace(`{${name}}`, value),
    template
  );
}

function getLocalizedValue(value) {
  if (value && typeof value === 'object') {
    return value[currentLanguage] || value.uk || value.en || Object.values(value)[0] || '';
  }

  return String(value || '');
}

function getDefaultEmptyTableMessage() {
  return t('selectTablePrompt');
}

function getStatusLabel(status = '') {
  if (status === 'free') return t('statusFree');
  if (status === 'busy') return t('statusBusy');
  if (status === 'held') return t('statusHeld');
  return t('statusNone');
}

function translateStaticContent() {
  const dictionary = translations[currentLanguage] || translations.uk;

  document.documentElement.lang = currentLanguage;
  document.title = dictionary.pageTitle;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((element) => {
    const pairs = element.dataset.i18nAttr.split(';').map((pair) => pair.trim()).filter(Boolean);
    pairs.forEach((pair) => {
      const [attribute, key] = pair.split(':').map((part) => part.trim());
      if (attribute && key && dictionary[key]) {
        element.setAttribute(attribute, dictionary[key]);
      }
    });
  });

  if (languageToggle) {
    languageToggle.textContent = dictionary.languageToggleLabel;
    languageToggle.setAttribute('aria-label', dictionary.languageToggleAria);
  }

  if (!selectedTable) {
    setTableInfoEmptyMessage(getDefaultEmptyTableMessage());
    updateSelectedStatusBadge();
  }

  if (!reservationError.classList.contains('hidden') && reservationError.dataset.i18nKey) {
    reservationError.textContent = t(reservationError.dataset.i18nKey);
  }

  if (!reservationSuccess.classList.contains('hidden') && reservationSuccess.dataset.i18nKey) {
    reservationSuccess.textContent = t(reservationSuccess.dataset.i18nKey);
  }

  if (!errorState.classList.contains('hidden') && errorState.dataset.i18nKey) {
    errorState.textContent = t(errorState.dataset.i18nKey);
  }

  if (!availabilityWarning.classList.contains('hidden') && availabilityWarning.dataset.i18nKey) {
    availabilityWarning.textContent = t(availabilityWarning.dataset.i18nKey);
  }
}

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

function showError(key) {
  loadingState.classList.add('hidden');
  bookingMap.classList.add('hidden');
  bookingMapCanvas?.classList.add('hidden');
  errorState.dataset.i18nKey = key;
  errorState.textContent = t(key);
  errorState.classList.remove('hidden');
}

function setTableInfoEmptyMessage(message = getDefaultEmptyTableMessage()) {
  tableInfoEmpty.textContent = message;
}

function updateSelectedStatusBadge(status = '', label = getStatusLabel(status)) {
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
  tableName.textContent = getLocalizedValue(table.name) || '—';
  tableSeats.textContent = t('seatRange', {
    min: table.seatsMin ?? '—',
    max: table.seatsMax ?? '—'
  });
  tableDeposit.textContent = table.deposit ?? '—';
  tableZone.textContent = getLocalizedValue(zoneName) || '—';

  if (tablePhotoCard && tablePhoto) {
    if (table.photoUrl) {
      const displayName = table.code || getLocalizedValue(table.name) || '';
      tablePhoto.src = table.photoUrl;
      tablePhoto.alt = displayName ? t('tablePhotoAltNamed', { name: displayName }) : t('tablePhotoAlt');
      tablePhotoCard.classList.remove('hidden');
    } else {
      tablePhoto.removeAttribute('src');
      tablePhoto.alt = t('tablePhotoAlt');
      tablePhotoCard.classList.add('hidden');
    }
  }
}

function resetMessages() {
  reservationError.textContent = '';
  reservationError.dataset.i18nKey = '';
  reservationError.classList.add('hidden');
  reservationSuccess.textContent = '';
  reservationSuccess.dataset.i18nKey = '';
  reservationSuccess.classList.add('hidden');
}

function showReservationError(key, rawMessage = '') {
  reservationSuccess.classList.add('hidden');
  reservationError.dataset.i18nKey = rawMessage ? '' : key;
  reservationError.textContent = rawMessage || t(key);
  reservationError.classList.remove('hidden');
}

function showReservationSuccess(key) {
  reservationError.classList.add('hidden');
  reservationSuccess.dataset.i18nKey = key;
  reservationSuccess.textContent = t(key);
  reservationSuccess.classList.remove('hidden');
}

function clearSelectionUI() {
  tableElementsById.forEach((element) => element.classList.remove('map-object--selected'));
}

function resetSelectedTableUI(emptyMessage = getDefaultEmptyTableMessage()) {
  selectedTable = null;
  clearSelectionUI();
  reservationForm.classList.add('hidden');
  tableInfoDetails.classList.add('hidden');
  if (tablePhotoCard && tablePhoto) {
    tablePhotoCard.classList.add('hidden');
    tablePhoto.removeAttribute('src');
    tablePhoto.alt = t('tablePhotoAlt');
  }
  setTableInfoEmptyMessage(emptyMessage);
  tableInfoEmpty.classList.remove('hidden');
  updateSelectedStatusBadge();
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
    updateSelectedStatusBadge();
    return;
  }

  if (isTableBusy(selectedTable.id)) {
    updateSelectedStatusBadge('busy');
    return;
  }

  if (isTableHeld(selectedTable.id)) {
    updateSelectedStatusBadge('held');
    return;
  }

  updateSelectedStatusBadge('free');
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
    showReservationError('selectedTableUnavailable');
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
    element.title = table?.name ? getLocalizedValue(table.name) : (table?.code || t('tableButtonTitle'));

    if (table) {
      tableElementsById.set(table.id, element);
    }

    element.addEventListener('click', () => {
      if (!table) {
        showTableInfo({ code: '—', name: t('tableFallbackName'), seatsMin: '—', seatsMax: '—', deposit: '—' }, '—');
        return;
      }

      if (isTableBusy(table.id) || isTableHeld(table.id)) {
        showReservationError('tableUnavailable');
        return;
      }

      const zone = zoneById.get(table.zoneId);
      setTableInfoEmptyMessage(getDefaultEmptyTableMessage());
      showTableInfo(table, zone?.name || '—');
      showReservationForm(table);
      updateSelectedStatusBadge('free');
    });
  }

  return element;
}

function renderMap(data) {
  const { map, objects = [], tables = [], zones = [] } = data;

  if (!map || !map.width || !map.height) {
    throw new Error('Invalid map dimensions');
  }

  currentMapData = data;
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

function showAvailabilityWarning(key = '') {
  if (!availabilityWarning) {
    return;
  }

  availabilityWarning.dataset.i18nKey = key;
  availabilityWarning.textContent = key ? t(key) : '';
  availabilityWarning.classList.toggle('hidden', !key);
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
    showAvailabilityWarning('availabilityFailed');
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
  const weekdayLocale = t('weekdayLocale');
  const dateLocale = t('dateLocale');
  dateQuickSelect.innerHTML = '';

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);

    const isoDate = toIsoDate(date);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `date-chip ${isoDate === currentValue ? 'date-chip--active' : ''}`;
    chip.dataset.date = isoDate;
    chip.innerHTML = `<span>${date.toLocaleDateString(weekdayLocale, { weekday: 'short' })}</span><strong>${date.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })}</strong>`;
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
    showReservationError('chooseTableFirst');
    return;
  }

  if (isTableBusy(selectedTable.id) || isTableHeld(selectedTable.id)) {
    showReservationError('tableUnavailable');
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
      showReservationError('', responseData.message || t('bookingCreateFailed'));
      if (response.status === 409) {
        await fetchAvailability();
      }
      return;
    }

    reservationForm.reset();
    ensureDefaultDateTime();
    showReservationSuccess('bookingCreated');
    resetSelectedTableUI(t('bookingCreated'));
    await fetchAvailability();
  } catch (error) {
    showReservationError('networkError');
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
    showError('mapLoadFailed');
  }
}

function syncTranslatedState() {
  translateStaticContent();
  renderDateQuickSelect();

  if (currentMapData) {
    renderMap(currentMapData);
  }

  if (selectedTable && currentMapData) {
    const zone = currentMapData.zones?.find((item) => item.id === selectedTable.zoneId);
    showTableInfo(selectedTable, zone?.name || '—');
    showReservationForm(selectedTable);
    updateSelectedStatusFromAvailability();
  } else {
    updateSelectedStatusBadge();
  }
}

languageToggle?.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'uk' ? 'en' : 'uk';
  localStorage.setItem('language', currentLanguage);
  syncTranslatedState();
});

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
translateStaticContent();
updateStats();
updateSelectedStatusBadge();
updateMapControls();
fetchDefaultMap();
