import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ZOOM_STEP = 1.2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function getCenter(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  };
}

export function useInteractiveMap({ worldWidth, worldHeight, minScale: minScaleProp = 0.6, maxScale = 3.2 }) {
  const containerRef = useRef(null);
  const pointersRef = useRef(new Map());
  const panStartRef = useRef(null);
  const pinchStartRef = useRef(null);

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });

  const fitWidthScale = useMemo(() => {
    if (!viewport.width || !worldWidth) {
      return 1;
    }
    return viewport.width / worldWidth;
  }, [viewport.width, worldWidth]);

  const fitViewScale = useMemo(() => {
    if (!viewport.width || !viewport.height || !worldWidth || !worldHeight) {
      return fitWidthScale;
    }
    return Math.min(viewport.width / worldWidth, viewport.height / worldHeight);
  }, [fitWidthScale, viewport.height, viewport.width, worldHeight, worldWidth]);

  const minScale = useMemo(() => Math.max(minScaleProp, fitViewScale * 0.65), [fitViewScale, minScaleProp]);

  const clampTranslate = useCallback(
    (translateX, translateY, scale) => {
      const boundedScale = clamp(scale, minScale, maxScale);
      const scaledWidth = worldWidth * boundedScale;
      const scaledHeight = worldHeight * boundedScale;
      const edgeLimit = 64;

      const xBounds =
        scaledWidth <= viewport.width
          ? { min: (viewport.width - scaledWidth) / 2, max: (viewport.width - scaledWidth) / 2 }
          : { min: viewport.width - scaledWidth - edgeLimit, max: edgeLimit };

      const yBounds =
        scaledHeight <= viewport.height
          ? { min: (viewport.height - scaledHeight) / 2, max: (viewport.height - scaledHeight) / 2 }
          : { min: viewport.height - scaledHeight - edgeLimit, max: edgeLimit };

      return {
        scale: boundedScale,
        translateX: clamp(translateX, xBounds.min, xBounds.max),
        translateY: clamp(translateY, yBounds.min, yBounds.max)
      };
    },
    [maxScale, minScale, viewport.height, viewport.width, worldHeight, worldWidth]
  );

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextViewport = {
        width: entry.contentRect.width,
        height: entry.contentRect.height
      };

      setViewport(nextViewport);
      setTransform((current) => {
        const seedScale = current.scale === 1 && current.translateX === 0 && current.translateY === 0 ? fitViewScale : current.scale;
        return clampTranslate(current.translateX, current.translateY, seedScale);
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [clampTranslate, fitViewScale]);

  useEffect(() => {
    setTransform((current) => clampTranslate(current.translateX, current.translateY, current.scale));
  }, [clampTranslate]);

  const zoomAtPoint = useCallback(
    (nextScale, clientX, clientY) => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
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

  const onPointerDown = useCallback((event) => {
    if (!containerRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, event);

    if (pointersRef.current.size === 1) {
      panStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        translateX: transform.translateX,
        translateY: transform.translateY
      };
      pinchStartRef.current = null;
      return;
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchStartRef.current = {
        distance: Math.max(getDistance(first, second), 1),
        scale: transform.scale
      };
      panStartRef.current = null;
    }
  }, [transform.scale, transform.translateX, transform.translateY]);

  const onPointerMove = useCallback(
    (event) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }

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
        zoomAtPoint(nextScale, center.x, center.y);
      }
    },
    [clampTranslate, zoomAtPoint]
  );

  const onPointerUp = useCallback((event) => {
    pointersRef.current.delete(event.pointerId);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (pointersRef.current.size === 1) {
      const [remaining] = [...pointersRef.current.values()];
      panStartRef.current = {
        x: remaining.clientX,
        y: remaining.clientY,
        translateX: transform.translateX,
        translateY: transform.translateY
      };
      pinchStartRef.current = null;
      return;
    }

    if (!pointersRef.current.size) {
      panStartRef.current = null;
      pinchStartRef.current = null;
    }
  }, [transform.translateX, transform.translateY]);

  const onWheel = useCallback(
    (event) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      zoomAtPoint(transform.scale * zoomFactor, event.clientX, event.clientY);
    },
    [transform.scale, zoomAtPoint]
  );

  const zoomIn = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    zoomAtPoint(transform.scale * ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [transform.scale, zoomAtPoint]);

  const zoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    zoomAtPoint(transform.scale / ZOOM_STEP, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [transform.scale, zoomAtPoint]);

  const fitToView = useCallback(() => {
    setTransform(clampTranslate(0, 0, fitViewScale));
  }, [clampTranslate, fitViewScale]);

  return {
    containerRef,
    transform,
    minScale,
    maxScale,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onWheel
    },
    actions: {
      zoomIn,
      zoomOut,
      fitToView
    }
  };
}
