import type { MapObject, PublicMapData } from '$lib/features/map/types';

export interface BoundsRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ViewTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_CONTENT_SIZE = 24;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBounds(bounds: BoundsRect, mapWidth: number, mapHeight: number): BoundsRect {
  return {
    minX: clamp(bounds.minX, 0, mapWidth),
    minY: clamp(bounds.minY, 0, mapHeight),
    maxX: clamp(bounds.maxX, 0, mapWidth),
    maxY: clamp(bounds.maxY, 0, mapHeight)
  };
}

export function getUsefulContentBounds(map: PublicMapData): BoundsRect {
  const tableObjects = map.objects.filter((object) => object.tableId);
  const focusObjects = tableObjects.length ? tableObjects : map.objects;

  if (!focusObjects.length) {
    return { minX: 0, minY: 0, maxX: map.width, maxY: map.height };
  }

  const initial = { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: 0, maxY: 0 };
  const merged = focusObjects.reduce<BoundsRect>((acc, object) => {
    acc.minX = Math.min(acc.minX, object.x);
    acc.minY = Math.min(acc.minY, object.y);
    acc.maxX = Math.max(acc.maxX, object.x + object.width);
    acc.maxY = Math.max(acc.maxY, object.y + object.height);
    return acc;
  }, initial);

  return normalizeBounds(merged, map.width, map.height);
}

export function getInitialViewTransform(
  mapWidth: number,
  mapHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 24,
  focusBounds?: BoundsRect
): ViewTransform {
  if (!viewportWidth || !viewportHeight || !mapWidth || !mapHeight) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const contentBounds = normalizeBounds(focusBounds || { minX: 0, minY: 0, maxX: mapWidth, maxY: mapHeight }, mapWidth, mapHeight);
  const contentWidth = Math.max(MIN_CONTENT_SIZE, contentBounds.maxX - contentBounds.minX);
  const contentHeight = Math.max(MIN_CONTENT_SIZE, contentBounds.maxY - contentBounds.minY);

  const fitWidth = Math.max(1, viewportWidth - padding * 2);
  const fitHeight = Math.max(1, viewportHeight - padding * 2);
  const scale = Math.min(fitWidth / contentWidth, fitHeight / contentHeight);

  const contentCenterX = contentBounds.minX + contentWidth / 2;
  const contentCenterY = contentBounds.minY + contentHeight / 2;

  return {
    scale,
    translateX: viewportWidth / 2 - contentCenterX * scale,
    translateY: viewportHeight / 2 - contentCenterY * scale
  };
}

export function clampTranslate(
  mapWidth: number,
  mapHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  translateX: number,
  translateY: number
): Pick<ViewTransform, 'translateX' | 'translateY'> {
  const scaledWidth = mapWidth * scale;
  const scaledHeight = mapHeight * scale;

  let nextX = translateX;
  let nextY = translateY;

  if (scaledWidth <= viewportWidth) {
    nextX = (viewportWidth - scaledWidth) / 2;
  } else {
    const minX = viewportWidth - scaledWidth;
    nextX = clamp(translateX, minX, 0);
  }

  if (scaledHeight <= viewportHeight) {
    nextY = (viewportHeight - scaledHeight) / 2;
  } else {
    const minY = viewportHeight - scaledHeight;
    nextY = clamp(translateY, minY, 0);
  }

  return { translateX: nextX, translateY: nextY };
}

export function zoomAroundViewportPoint(
  pointerX: number,
  pointerY: number,
  nextScale: number,
  currentScale: number,
  currentX: number,
  currentY: number
): Pick<ViewTransform, 'translateX' | 'translateY'> {
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

export function getObjectCenter(object: MapObject) {
  return {
    x: object.x + object.width / 2,
    y: object.y + object.height / 2
  };
}
