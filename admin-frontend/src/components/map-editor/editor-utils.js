import { isVisibleInLayout } from '../../lib/layout-schema';

export function isObjectVisibleForLayout(object, layoutCode, enabledZoneIds = []) {
  if (object.hidden) return false;
  if (!isVisibleInLayout(layoutCode, object.visibleInLayoutModes || 'all')) return false;
  if (object.zoneId && enabledZoneIds.length > 0 && !enabledZoneIds.includes(object.zoneId)) return false;
  return true;
}

export function snap(value, gridSize, enabled) {
  if (!enabled || !gridSize) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function clampObject(object, map) {
  const width = Math.max(24, Number(object.width) || 24);
  const height = Math.max(24, Number(object.height) || 24);
  return {
    ...object,
    width,
    height,
    x: Math.max(0, Math.min(Number(object.x) || 0, map.width - width)),
    y: Math.max(0, Math.min(Number(object.y) || 0, map.height - height)),
    rotation: Number(object.rotation) || 0
  };
}

export function duplicateObject(object, nextId) {
  return {
    ...object,
    id: nextId,
    name: `${object.name} Copy`,
    x: object.x + 26,
    y: object.y + 26,
    zIndex: Number(object.zIndex || 1) + 1
  };
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
