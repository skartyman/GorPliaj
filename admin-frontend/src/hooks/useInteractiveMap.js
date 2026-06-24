import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ZOOM_STEP = 1.2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getFitWidthScale(viewportWidth, worldWidth) {
  if (!viewportWidth || !worldWidth) return 1;
  return viewportWidth / worldWidth;
}

function getFitViewScale(viewport, worldWidth, worldHeight) {
  const fitWidthScale = getFitWidthScale(viewport.width, worldWidth);
  if (!viewport.width || !viewport.height || !worldWidth || !worldHeight) return fitWidthScale;
  return Math.min(viewport.width / worldWidth, viewport.height / worldHeight, 1);
}

function getMinScale(viewport, worldWidth, worldHeight, minScaleProp) {
  return Math.max(minScaleProp, getFitViewScale(viewport, worldWidth, worldHeight) * 0.65);
}

function getCenteredTranslate(viewport, worldWidth, worldHeight, scale) {
  return {
    translateX: (viewport.width - worldWidth * scale) / 2,
    translateY: (viewport.height - worldHeight * scale) / 2
  };
}

function getDistance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function getCenter(a, b) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function isInteractiveTarget(el) {
  return el && el.closest('button, a, input, select, textarea, [role="button"]');
}

export function useInteractiveMap({
  worldWidth,
  worldHeight,
  fitWorldWidth = worldWidth,
  fitWorldHeight = worldHeight,
  minScale: minScaleProp = 0.6,
  maxScale = 3.2
}) {
  const containerRef = useRef(null);
  const pointersRef = useRef(new Map());
  const panStartRef = useRef(null);
  const pinchStartRef = useRef(null);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const fitViewScale = useMemo(
    () => getFitViewScale(viewport, fitWorldWidth, fitWorldHeight),
    [fitWorldHeight, fitWorldWidth, viewport]
  );

  const minScale = useMemo(
    () => getMinScale(viewport, fitWorldWidth, fitWorldHeight, minScaleProp),
    [fitWorldHeight, fitWorldWidth, minScaleProp, viewport]
  );

  const clampTranslate = useCallback(
    (translateX, translateY, scale, nextViewport = viewport) => {
      const viewportMinScale = getMinScale(nextViewport, fitWorldWidth, fitWorldHeight, minScaleProp);
      const boundedScale = clamp(scale, viewportMinScale, maxScale);
      const scaledWidth = worldWidth * boundedScale;
      const scaledHeight = worldHeight * boundedScale;
      const edgeLimit = 64;

      const rawXMin = nextViewport.width - scaledWidth - edgeLimit;
      const rawXMax = edgeLimit;
      const xBounds = { min: Math.min(rawXMin, rawXMax), max: Math.max(rawXMin, rawXMax) };

      const rawYMin = nextViewport.height - scaledHeight - edgeLimit;
      const rawYMax = edgeLimit;
      const yBounds = { min: Math.min(rawYMin, rawYMax), max: Math.max(rawYMin, rawYMax) };

      return {
        scale: boundedScale,
        translateX: clamp(translateX, xBounds.min, xBounds.max),
        translateY: clamp(translateY, yBounds.min, yBounds.max)
      };
    },
    [fitWorldHeight, fitWorldWidth, maxScale, minScaleProp, viewport, worldHeight, worldWidth]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextViewport = { width: entry.contentRect.width, height: entry.contentRect.height };
      setViewport((current) =>
        current.width === nextViewport.width && current.height === nextViewport.height ? current : nextViewport
      );
      setTransform((current) => {
        const isPristine = current.scale === 1 && current.translateX === 0 && current.translateY === 0;
        const seedScale = isPristine ? getFitViewScale(nextViewport, fitWorldWidth, fitWorldHeight) : current.scale;
        const centered = getCenteredTranslate(nextViewport, worldWidth, worldHeight, seedScale);
        const nextTx = isPristine ? centered.translateX : current.translateX;
        const nextTy = isPristine ? centered.translateY : current.translateY;
        return clampTranslate(nextTx, nextTy, seedScale, nextViewport);
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [clampTranslate, fitWorldHeight, fitWorldWidth, worldHeight, worldWidth]);

  useEffect(() => {
    setTransform((current) => clampTranslate(current.translateX, current.translateY, current.scale));
  }, [clampTranslate]);

  const zoomAtPoint = useCallback(
    (nextScale, clientX, clientY) => {
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const focalX = clientX - rect.left;
      const focalY = clientY - rect.top;

      setTransform((current) => {
        const boundedScale = clamp(nextScale, minScale, maxScale);
        const worldX = (focalX - current.translateX) / current.scale;
        const worldY = (focalY - current.translateY) / current.scale;
        const nextTranslateX = focalX - worldX * boundedScale;
        const nextTranslateY = focalY - worldY * boundedScale;
        return clampTranslate(nextTranslateX, nextTranslateY, boundedScale);
      });
    },
    [clampTranslate, maxScale, minScale]
  );

  const zoomAtPointRef = useRef(zoomAtPoint);
  zoomAtPointRef.current = zoomAtPoint;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function onPointerDown(event) {
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, event);

      if (pointersRef.current.size === 1) {
        const t = transformRef.current;
        panStartRef.current = { x: event.clientX, y: event.clientY, translateX: t.translateX, translateY: t.translateY };
        pinchStartRef.current = null;
        return;
      }

      if (pointersRef.current.size === 2) {
        const [first, second] = [...pointersRef.current.values()];
        pinchStartRef.current = { distance: Math.max(getDistance(first, second), 1), scale: transformRef.current.scale };
        panStartRef.current = null;
      }
    }

    function onPointerMove(event) {
      if (!pointersRef.current.has(event.pointerId)) return;
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      pointersRef.current.set(event.pointerId, event);

      if (pointersRef.current.size === 1 && panStartRef.current) {
        const deltaX = event.clientX - panStartRef.current.x;
        const deltaY = event.clientY - panStartRef.current.y;
        setTransform((current) =>
          clampTranslate(panStartRef.current.translateX + deltaX, panStartRef.current.translateY + deltaY, current.scale)
        );
        return;
      }

      if (pointersRef.current.size === 2 && pinchStartRef.current) {
        const [first, second] = [...pointersRef.current.values()];
        const nextDistance = Math.max(getDistance(first, second), 1);
        const ratio = nextDistance / pinchStartRef.current.distance;
        const nextScale = pinchStartRef.current.scale * ratio;
        const center = getCenter(first, second);
        zoomAtPointRef.current(nextScale, center.x, center.y);
      }
    }

    function onPointerUp(event) {
      pointersRef.current.delete(event.pointerId);
      try { node.releasePointerCapture(event.pointerId); } catch {}

      if (pointersRef.current.size === 1) {
        const [remaining] = [...pointersRef.current.values()];
        const t = transformRef.current;
        panStartRef.current = { x: remaining.clientX, y: remaining.clientY, translateX: t.translateX, translateY: t.translateY };
        pinchStartRef.current = null;
        return;
      }

      if (!pointersRef.current.size) {
        panStartRef.current = null;
        pinchStartRef.current = null;
      }
    }

    function onWheel(event) {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      zoomAtPointRef.current(transformRef.current.scale * zoomFactor, event.clientX, event.clientY);
    }

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('pointermove', onPointerMove);
    node.addEventListener('pointerup', onPointerUp);
    node.addEventListener('pointercancel', onPointerUp);
    node.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
      node.removeEventListener('wheel', onWheel);
    };
  }, [clampTranslate]);

  const zoomIn = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAtPoint(transform.scale * ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [transform.scale, zoomAtPoint]);

  const zoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAtPoint(transform.scale / ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [transform.scale, zoomAtPoint]);

  const fitToView = useCallback(() => {
    const centered = getCenteredTranslate(viewport, worldWidth, worldHeight, fitViewScale);
    setTransform(clampTranslate(centered.translateX, centered.translateY, fitViewScale));
  }, [clampTranslate, fitViewScale, viewport, worldHeight, worldWidth]);

  const focusRect = useCallback((rect, padding = 48) => {
    if (!rect || !viewport.width || !viewport.height) return;
    const width = Math.max(Number(rect.width) || 0, 1);
    const height = Math.max(Number(rect.height) || 0, 1);
    const availableWidth = Math.max(viewport.width - padding * 2, 1);
    const availableHeight = Math.max(viewport.height - padding * 2, 1);
    const nextScale = clamp(Math.min(availableWidth / width, availableHeight / height), minScale, maxScale);
    const centerX = (Number(rect.x) || 0) + width / 2;
    const centerY = (Number(rect.y) || 0) + height / 2;
    const nextTranslateX = viewport.width / 2 - centerX * nextScale;
    const nextTranslateY = viewport.height / 2 - centerY * nextScale;
    setTransform(clampTranslate(nextTranslateX, nextTranslateY, nextScale));
  }, [clampTranslate, maxScale, minScale, viewport]);

  return {
    containerRef,
    transform,
    minScale,
    maxScale,
    handlers: {},
    actions: { zoomIn, zoomOut, fitToView, focusRect }
  };
}
