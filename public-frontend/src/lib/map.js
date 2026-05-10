export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function clampTranslate(mapWidth, mapHeight, viewportWidth, viewportHeight, scale, translateX, translateY) {
  const scaledWidth = mapWidth * scale;
  const scaledHeight = mapHeight * scale;

  let nextX = translateX;
  let nextY = translateY;

  if (scaledWidth <= viewportWidth) {
    nextX = (viewportWidth - scaledWidth) / 2;
  } else {
    nextX = clamp(translateX, viewportWidth - scaledWidth, 0);
  }

  if (scaledHeight <= viewportHeight) {
    nextY = (viewportHeight - scaledHeight) / 2;
  } else {
    nextY = clamp(translateY, viewportHeight - scaledHeight, 0);
  }

  return { translateX: nextX, translateY: nextY };
}

export function zoomAroundViewportPoint(pointerX, pointerY, nextScale, currentScale, currentX, currentY) {
  if (!currentScale || !nextScale) {
    return { translateX: currentX, translateY: currentY };
  }

  const worldX = (pointerX - currentX) / currentScale;
  const worldY = (pointerY - currentY) / currentScale;

  return {
    translateX: pointerX - worldX * nextScale,
    translateY: pointerY - worldY * nextScale
  };
}

export function getUsefulContentBounds(map) {
  const items = map.objects.filter((item) => item.tableId).length ? map.objects.filter((item) => item.tableId) : map.objects;
  if (!items.length) {
    return { minX: 0, minY: 0, maxX: map.width, maxY: map.height };
  }

  return items.reduce(
    (acc, item) => ({
      minX: Math.min(acc.minX, item.x),
      minY: Math.min(acc.minY, item.y),
      maxX: Math.max(acc.maxX, item.x + item.width),
      maxY: Math.max(acc.maxY, item.y + item.height)
    }),
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: 0, maxY: 0 }
  );
}

export function getInitialViewTransform(mapWidth, mapHeight, viewportWidth, viewportHeight, padding = 24, focusBounds) {
  if (!viewportWidth || !viewportHeight || !mapWidth || !mapHeight) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const bounds = focusBounds || { minX: 0, minY: 0, maxX: mapWidth, maxY: mapHeight };
  const contentWidth = Math.max(24, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(24, bounds.maxY - bounds.minY);
  const scale = Math.min((viewportWidth - padding * 2) / contentWidth, (viewportHeight - padding * 2) / contentHeight);
  const centerX = bounds.minX + contentWidth / 2;
  const centerY = bounds.minY + contentHeight / 2;

  return {
    scale,
    translateX: viewportWidth / 2 - centerX * scale,
    translateY: viewportHeight / 2 - centerY * scale
  };
}

export function getObjectCenter(object) {
  return { x: object.x + object.width / 2, y: object.y + object.height / 2 };
}

function toPercentCoordinate(value, total) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (Number.isFinite(total) && total && value > 1) {
    return (value / total) * 100;
  }
  return value;
}

export async function getPublicMapData(mapApi, params = {}) {
  const data = await mapApi.defaultMap();
  const mapData = data.map || data;
  const zones = data.zones || mapData.zones || [];
  const rootTables = data.tables || [];
  const objects = (data.objects || []).map((object) => ({ ...object }));

  const linkedTableObjects = objects.filter((object) => object.tableId && (object.type === 'TABLE' || !object.type));
  const linkedTableIds = new Set(linkedTableObjects.map((object) => object.tableId));
  const fallbackTableObjects = objects.filter((object) => !object.tableId && String(object.type || '').toUpperCase() === 'TABLE');
  const unlinkedTables = rootTables.filter((table) => !linkedTableIds.has(table.id));

  fallbackTableObjects.forEach((object, index) => {
    const table = unlinkedTables[index];
    if (table) {
      object.tableId = table.id;
    }
  });

  const tableObjectById = new Map(
    objects.filter((object) => object.tableId && (object.type === 'TABLE' || !object.type)).map((object) => [object.tableId, object])
  );

  const tablesByZone = new Map();
  rootTables.forEach((table) => {
    if (!table.zoneId) return;
    const current = tablesByZone.get(table.zoneId) || [];
    current.push(table);
    tablesByZone.set(table.zoneId, current);
  });

  const normalizedMap = {
    id: mapData.id,
    name: mapData.name,
    width: mapData.width || 1200,
    height: mapData.height || 760,
    backgroundColor: mapData.backgroundColor || null,
    backgroundImage: mapData.backgroundImage || null,
    zones: zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      tables: (zone.tables?.length ? zone.tables : tablesByZone.get(zone.id) || []).map((table, index) => {
        const mapObject = tableObjectById.get(table.id);
        return {
          id: table.id,
          zoneId: zone.id,
          code: table.code || `T-${table.id}`,
          name: table.name || `Table ${index + 1}`,
          seatsMin: table.seatsMin || 2,
          seatsMax: table.seatsMax || 4,
          x: toPercentCoordinate(table.x ?? mapObject?.x, mapData.width),
          y: toPercentCoordinate(table.y ?? mapObject?.y, mapData.height),
          isBookable: table.isBookable ?? true,
          isActive: table.isActive ?? true,
          shape: String(table.shape || 'ROUND').toUpperCase(),
          status: table.isActive === false || table.isBookable === false ? 'unavailable' : 'free'
        };
      })
    })),
    objects: objects.map((object) => ({
      id: object.id,
      type: String(object.type || 'CUSTOM').toUpperCase(),
      label: object.label || '',
      styleJson: object.styleJson,
      metaJson: object.metaJson,
      tableId: object.tableId ?? null,
      width: Math.max(Number(object.width) || 44, 24),
      height: Math.max(Number(object.height) || 44, 24),
      x: Number(object.x) || 0,
      y: Number(object.y) || 0,
      rotation: Number(object.rotation) || 0,
      zIndex: Number(object.zIndex) || 2
    }))
  };

  if (params.date && params.timeFrom) {
    try {
      const availability = await mapApi.availability(normalizedMap.id, params.date, params.timeFrom);
      const busy = new Set(availability.busyTableIds || []);
      const held = new Set(availability.heldTableIds || []);
      normalizedMap.zones = normalizedMap.zones.map((zone) => ({
        ...zone,
        tables: zone.tables.map((table) => ({
          ...table,
          status: !table.isActive || !table.isBookable ? 'unavailable' : busy.has(table.id) ? 'busy' : held.has(table.id) ? 'held' : 'free'
        }))
      }));
    } catch {}
  }

  return { map: normalizedMap, source: 'api' };
}
