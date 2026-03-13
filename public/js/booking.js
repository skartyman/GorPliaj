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

    element.addEventListener('click', () => {
      if (!table) {
        showTableInfo({ code: '—', name: 'Not found', seatsMin: '—', seatsMax: '—', deposit: '—' }, '—');
        return;
      }

      const zone = zoneById.get(table.zoneId);
      showTableInfo(table, zone?.name || '—');
    });
  }

  return element;
}

function renderMap(data) {
  const { map, objects = [], tables = [], zones = [] } = data;

  if (!map || !map.width || !map.height) {
    throw new Error('Invalid map dimensions');
  }

  const tableById = new Map(tables.map((table) => [table.id, table]));
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  bookingMap.innerHTML = '';
  bookingMap.style.aspectRatio = `${map.width} / ${map.height}`;

  objects.forEach((object) => {
    const objectElement = createMapObjectElement(object, map, tableById, zoneById);
    bookingMap.appendChild(objectElement);
  });

  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  bookingMap.classList.remove('hidden');
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

fetchDefaultMap();
