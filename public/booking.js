const bookingMap = document.getElementById('bookingMap');
const mapFallback = document.getElementById('mapFallback');
const tableInfoEmpty = document.getElementById('tableInfoEmpty');
const tableInfoDetails = document.getElementById('tableInfoDetails');
const tableCode = document.getElementById('tableCode');
const tableName = document.getElementById('tableName');
const tableSeats = document.getElementById('tableSeats');
const tableDeposit = document.getElementById('tableDeposit');
const tableZone = document.getElementById('tableZone');

function showFallback(message) {
  bookingMap.classList.add('hidden');
  mapFallback.textContent = message;
  mapFallback.classList.remove('hidden');
}

function showTableInfo(table, zoneName) {
  tableInfoEmpty.classList.add('hidden');
  tableInfoDetails.classList.remove('hidden');

  tableCode.textContent = table.code || '—';
  tableName.textContent = table.name || '—';
  tableSeats.textContent = `${table.seatsMin} / ${table.seatsMax}`;
  tableDeposit.textContent = table.deposit;
  tableZone.textContent = zoneName || '—';
}

function renderMap(data) {
  const { map, objects, tables, zones } = data;
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
  const tableById = new Map(tables.map((table) => [table.id, table]));

  bookingMap.style.aspectRatio = `${map.width} / ${map.height}`;
  bookingMap.innerHTML = '';

  objects.forEach((object) => {
    const objectElement = document.createElement(object.type === 'TABLE' ? 'button' : 'div');
    const left = (object.x / map.width) * 100;
    const top = (object.y / map.height) * 100;
    const width = (object.width / map.width) * 100;
    const height = (object.height / map.height) * 100;

    objectElement.className = `map-object ${object.type === 'TABLE' ? 'map-object--table' : 'map-object--static'}`;
    objectElement.style.left = `${left}%`;
    objectElement.style.top = `${top}%`;
    objectElement.style.width = `${width}%`;
    objectElement.style.height = `${height}%`;
    objectElement.style.transform = `rotate(${object.rotation || 0}deg)`;
    objectElement.style.zIndex = object.zIndex;

    const label = document.createElement('span');
    label.className = 'map-object-label';
    label.textContent = object.label || object.type;
    objectElement.appendChild(label);

    if (object.type === 'TABLE') {
      const table = tableById.get(object.tableId);

      objectElement.type = 'button';
      objectElement.addEventListener('click', () => {
        if (!table) {
          showTableInfo({ code: '—', name: 'Not found', seatsMin: '—', seatsMax: '—', deposit: '—' }, '—');
          return;
        }

        const zone = zoneById.get(table.zoneId);
        showTableInfo(table, zone?.name);
      });
    }

    bookingMap.appendChild(objectElement);
  });
}

async function fetchDefaultMap() {
  try {
    const response = await fetch('/api/maps/default');

    if (!response.ok) {
      throw new Error('Default map request failed');
    }

    const data = await response.json();
    renderMap(data);
  } catch (error) {
    showFallback('Не вдалося завантажити карту. Спробуйте пізніше.');
  }
}

fetchDefaultMap();
