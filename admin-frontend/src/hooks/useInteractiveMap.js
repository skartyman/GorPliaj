import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ZOOM_STEP = 1.2;
const DEFAULT_TRANSFORM = { scale: 1, translateX: 0, translateY: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeTransform(value) {
  if (!value || typeof value !== 'object') {
    return DEFAULT_TRANSFORM;
  }

  return {
    scale: Math.max(finiteNumber(value.scale, DEFAULT_TRANSFORM.scale), 0.01),
    translateX: finiteNumber(value.translateX, DEFAULT_TRANSFORM.translateX),
    translateY: finiteNumber(value.translateY, DEFAULT_TRANSFORM.translateY)
  };
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

function getTranslateBounds(viewportSize, scaledSize, slack) {
  if (scaledSize <= viewportSize) {
    const centered = (viewportSize - scaledSize) / 2;
    return {
      min: centered - slack,
      max: centered + slack
    };
  }

  return {
    min: viewportSize - scaledSize - slack,
    max: slack
  };
}

function isFormControlTarget(el) {
  return el && el.closest('input, select, textarea');
}

export function useInteractiveMap({
  worldWidth,
  worldHeight,
  fitWorldWidth = worldWidth,
  fitWorldHeight = worldHeight,
  minScale: minScaleProp = 0.6,
  maxScale = 3.2
}) {
  const [containerNode, setContainerNode] = useState(null);
  const containerRef = useCallback((node) => {
    setContainerNode(node);
  }, []);

  const pointersRef = useRef(new Map());
  const panStartRef = useRef(null);
  const pinchStartRef = useRef(null);
  const movedRef = useRef(false);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);

  const transformRef = useRef(DEFAULT_TRANSFORM);
  const safeTransform = normalizeTransform(transform);
  transformRef.current = safeTransform;

  const fitViewScale = useMemo(
    () => getFitViewScale(viewport, fitWorldWidth, fitWorldHeight),
    [fitWorldHeight, fitWorldWidth, viewport]
  );

  const minScale = useMemo(
    () => getMinScale(viewport, fitWorldWidth, fitWorldHeight, minScaleProp),
    [fitWorldHeight, fitWorldWidth, minScaleProp, viewport]
  );

  const clampTranslate = useCallback(
    (translateX, translateY, scale, nextViewport = viewportRef.current) => {
      const safeViewport = nextViewport || { width: 0, height: 0 };
      const viewportMinScale = getMinScale(safeViewport, fitWorldWidth, fitWorldHeight, minScaleProp);
      const boundedScale = clamp(finiteNumber(scale, DEFAULT_TRANSFORM.scale), viewportMinScale, maxScale);
      const scaledWidth = worldWidth * boundedScale;
      const scaledHeight = worldHeight * boundedScale;
      const edgeLimitX = Math.max(180, finiteNumber(safeViewport.width, 0) * 0.65);
      const edgeLimitY = Math.max(180, finiteNumber(safeViewport.height, 0) * 0.65);

      const rawTranslateX = finiteNumber(translateX, DEFAULT_TRANSFORM.translateX);
      const rawTranslateY = finiteNumber(translateY, DEFAULT_TRANSFORM.translateY);

      const xBounds = getTranslateBounds(finiteNumber(safeViewport.width, 0), scaledWidth, edgeLimitX);
      const yBounds = getTranslateBounds(finiteNumber(safeViewport.height, 0), scaledHeight, edgeLimitY);

      return {
        scale: boundedScale,
        translateX: clamp(rawTranslateX, xBounds.min, xBounds.max),
        translateY: clamp(rawTranslateY, yBounds.min, yBounds.max)
      };
    },
    [fitWorldHeight, fitWorldWidth, maxScale, minScaleProp, worldHeight, worldWidth]
  );

  useEffect(() => {
    if (!containerNode) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextViewport = { width: entry.contentRect.width, height: entry.contentRect.height };
      setViewport((current) =>
        current.width === nextViewport.width && current.height === nextViewport.height ? current : nextViewport
      );
      setTransform((current) => {
        const safeCurrent = normalizeTransform(current);
        const isPristine = safeCurrent.scale === 1 && safeCurrent.translateX === 0 && safeCurrent.translateY === 0;
        const seedScale = isPristine ? getFitViewScale(nextViewport, fitWorldWidth, fitWorldHeight) : safeCurrent.scale;
        const centered = getCenteredTranslate(nextViewport, worldWidth, worldHeight, seedScale);
        const nextTx = isPristine ? centered.translateX : safeCurrent.translateX;
        const nextTy = isPristine ? centered.translateY : safeCurrent.translateY;
        const result = clampTranslate(nextTx, nextTy, seedScale, nextViewport);
        return result.scale === safeCurrent.scale && result.translateX === safeCurrent.translateX && result.translateY === safeCurrent.translateY
          ? safeCurrent
          : result;
      });
    });
    observer.observe(containerNode);
    return () => observer.disconnect();
  }, [containerNode, clampTranslate, fitWorldHeight, fitWorldWidth, worldHeight, worldWidth]);

  useEffect(() => {
    setTransform((current) => {
      const safeCurrent = normalizeTransform(current);
      const result = clampTranslate(safeCurrent.translateX, safeCurrent.translateY, safeCurrent.scale);
      return result.scale === safeCurrent.scale && result.translateX === safeCurrent.translateX && result.translateY === safeCurrent.translateY
        ? safeCurrent
        : result;
    });
  }, [clampTranslate]);

  const zoomAtPoint = useCallback(
    (nextScale, clientX, clientY) => {
      const node = containerNode;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const focalX = clientX - rect.left;
      const focalY = clientY - rect.top;

      setTransform((current) => {
        const safeCurrent = normalizeTransform(current);
        const boundedScale = clamp(nextScale, minScale, maxScale);
        const worldX = (focalX - safeCurrent.translateX) / safeCurrent.scale;
        const worldY = (focalY - safeCurrent.translateY) / safeCurrent.scale;
        const nextTranslateX = focalX - worldX * boundedScale;
        const nextTranslateY = focalY - worldY * boundedScale;
        return clampTranslate(nextTranslateX, nextTranslateY, boundedScale);
      });
    },
    [containerNode, clampTranslate, maxScale, minScale]
  );

  const zoomAtPointRef = useRef(zoomAtPoint);
  zoomAtPointRef.current = zoomAtPoint;

  useEffect(() => {
    const node = containerNode;
    if (!node) return;

    function onPointerDown(event) {
      if (isFormControlTarget(event.target)) return;
      event.preventDefault();
      try {
        node.setPointerCapture(event.pointerId);
      } catch {}
      pointersRef.current.set(event.pointerId, event);

      if (pointersRef.current.size === 1) {
        const t = normalizeTransform(transformRef.current);
        panStartRef.current = { x: event.clientX, y: event.clientY, translateX: t.translateX, translateY: t.translateY };
        pinchStartRef.current = null;
        movedRef.current = false;
        return;
      }

      if (pointersRef.current.size === 2) {
        const [first, second] = [...pointersRef.current.values()];
        pinchStartRef.current = { distance: Math.max(getDistance(first, second), 1), scale: normalizeTransform(transformRef.current).scale };
        panStartRef.current = null;
        movedRef.current = true;
      }
    }

    function onPointerMove(event) {
      if (!pointersRef.current.has(event.pointerId)) return;
      event.preventDefault();
      pointersRef.current.set(event.pointerId, event);

      const panStart = panStartRef.current;
      if (pointersRef.current.size === 1 && panStart) {
        const deltaX = event.clientX - panStart.x;
        const deltaY = event.clientY - panStart.y;
        if (Math.hypot(deltaX, deltaY) > 6) {
          movedRef.current = true;
        }
        const nextTranslateX = finiteNumber(panStart.translateX, DEFAULT_TRANSFORM.translateX) + deltaX;
        const nextTranslateY = finiteNumber(panStart.translateY, DEFAULT_TRANSFORM.translateY) + deltaY;
        setTransform((current) => {
          const safeCurrent = normalizeTransform(current);
          return clampTranslate(nextTranslateX, nextTranslateY, safeCurrent.scale);
        });
        return;
      }

      const pinchStart = pinchStartRef.current;
      if (pointersRef.current.size === 2 && pinchStart) {
        movedRef.current = true;
        const [first, second] = [...pointersRef.current.values()];
        const nextDistance = Math.max(getDistance(first, second), 1);
        const ratio = nextDistance / Math.max(finiteNumber(pinchStart.distance, 1), 1);
        const nextScale = finiteNumber(pinchStart.scale, DEFAULT_TRANSFORM.scale) * ratio;
        const center = getCenter(first, second);
        zoomAtPointRef.current(nextScale, center.x, center.y);
      }
    }

    function onPointerUp(event) {
      pointersRef.current.delete(event.pointerId);
      try { node.releasePointerCapture(event.pointerId); } catch {}

      if (pointersRef.current.size === 1) {
        const [remaining] = [...pointersRef.current.values()];
        const t = normalizeTransform(transformRef.current);
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
      zoomAtPointRef.current(normalizeTransform(transformRef.current).scale * zoomFactor, event.clientX, event.clientY);
    }

    function onClick(event) {
      if (!movedRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      movedRef.current = false;
    }

    node.addEventListener('pointerdown', onPointerDown, true);
    node.addEventListener('pointermove', onPointerMove, true);
    node.addEventListener('pointerup', onPointerUp, true);
    node.addEventListener('pointercancel', onPointerUp, true);
    node.addEventListener('click', onClick, true);
    node.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      node.removeEventListener('pointerdown', onPointerDown, true);
      node.removeEventListener('pointermove', onPointerMove, true);
      node.removeEventListener('pointerup', onPointerUp, true);
      node.removeEventListener('pointercancel', onPointerUp, true);
      node.removeEventListener('click', onClick, true);
      node.removeEventListener('wheel', onWheel);
    };
  }, [containerNode, clampTranslate]);

  const zoomIn = useCallback(() => {
    const rect = containerNode?.getBoundingClientRect();
    if (!rect) return;
    zoomAtPoint(safeTransform.scale * ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [containerNode, safeTransform.scale, zoomAtPoint]);

  const zoomOut = useCallback(() => {
    const rect = containerNode?.getBoundingClientRect();
    if (!rect) return;
    zoomAtPoint(safeTransform.scale / ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [containerNode, safeTransform.scale, zoomAtPoint]);

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
    containerNode,
    transform: safeTransform,
    minScale,
    maxScale,
    handlers: {},
    actions: { zoomIn, zoomOut, fitToView, focusRect }
  };
}
