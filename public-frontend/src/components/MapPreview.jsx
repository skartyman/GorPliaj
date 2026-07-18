import { useEffect, useMemo, useRef, useState } from 'react';
import { getInitialViewTransform } from '../lib/map';
import { localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import {
  parseMetaJson,
  pointsToSvg,
  getObjectZIndex,
  compareMapObjects
} from '../utils/mapHelpers';

const OBJECT_COLORS = {
  WALL: '#94a3b8',
  PATH: '#94a3b8',
  POLYGON: '#e2e8f0',
  BAR: '#cbd5e1',
  STAGE: '#cbd5e1',
  ENTRANCE: '#cbd5e1',
  STAIRS: '#94a3b8',
  DECOR: '#e2e8f0',
};

function getObjectColor(type) {
  const key = String(type || '').toUpperCase();
  return OBJECT_COLORS[key] || '#d1d5db';
}

function getPolygonFill(meta) {
  if (meta.texture === 'sand') return '#fef3c7';
  if (meta.texture === 'water') return '#bfdbfe';
  if (meta.texture === 'wood') return '#d6a766';
  if (meta.texture === 'dark_wood') return '#5D4037';
  if (meta.texture === 'grass') return '#bbf7d0';
  return '#e2e8f0';
}

function hasBuiltinTexture(texture) {
  return ['sand', 'water', 'wood', 'dark_wood', 'grass'].includes(String(texture || '').toLowerCase());
}

function BuiltinTexturePattern({ id, texture }) {
  switch (String(texture || '').toLowerCase()) {
    case 'grass':
      return <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#dcfce7" /><path d="M10 20Q15 10 20 20T30 20M5 35Q10 25 15 35T25 35" stroke="#86efac" fill="none" /></pattern>;
    case 'sand':
      return <pattern id={id} width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="#fef9c3" /><circle cx="10" cy="10" r=".7" fill="#eab308" /><circle cx="30" cy="25" r=".9" fill="#facc15" /><circle cx="15" cy="40" r=".7" fill="#eab308" /></pattern>;
    case 'water':
      return <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#e0f2fe" /><path d="M0 20Q15 10 30 20T60 20M0 45Q15 35 30 45T60 45" stroke="#7dd3fc" fill="none" strokeWidth="2" opacity=".65" /></pattern>;
    case 'wood':
      return <pattern id={id} width="100" height="20" patternUnits="userSpaceOnUse"><rect width="100" height="20" fill="#d6a766" /><line x1="0" y1="19" x2="100" y2="19" stroke="#a16207" /><path d="M20 10Q50 5 80 10" stroke="#92400e" fill="none" opacity=".3" /></pattern>;
    case 'dark_wood':
      return <pattern id={id} width="100" height="20" patternUnits="userSpaceOnUse"><rect width="100" height="20" fill="#3e2723" /><line x1="0" y1="19" x2="100" y2="19" stroke="#795548" /><path d="M20 10Q50 5 80 10" stroke="#8d6e63" fill="none" opacity=".35" /></pattern>;
    default:
      return null;
  }
}

function getObjectAccent(object, label) {
  const normalized = String(label || '').toLowerCase();
  if (/(sand|пісок|песок)/i.test(normalized)) return 'sand';
  if (/(sea|море)/i.test(normalized)) return 'water';
  if (/(deck|настил|дерев)/i.test(normalized)) return 'wood';
  return '';
}

function RealMapObject({ object, scale, locale = 'ua', unit, onActivate }) {
  const meta = parseMetaJson(object.metaJson);
  const label = localizeField(object.label, locale) || '';
  const x = object.x * scale;
  const y = object.y * scale;
  const w = Math.max(object.width * scale, 1);
  const h = Math.max(object.height * scale, 1);
  const subType = String(meta.subType || '').toUpperCase();
  const type = String(object.type || '').toUpperCase();
  const baseStyle = {
    position: 'absolute',
    left: x,
    top: y,
    width: w,
    height: h,
    transform: `rotate(${Number(object.rotation) || 0}deg)`,
    transformOrigin: 'center',
    opacity: meta.opacity ?? 1,
    pointerEvents: unit ? 'auto' : 'none',
    cursor: unit ? 'pointer' : 'default',
    zIndex: getObjectZIndex(object)
  };
  const interactionProps = unit ? {
    role: 'button',
    tabIndex: 0,
    'aria-label': unit.code || label,
    onClick: (event) => onActivate?.(event, unit),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') onActivate?.(event, unit);
    }
  } : {};

  if (meta.svgUrl) {
    return <img src={meta.svgUrl} alt={label} style={{ ...baseStyle, objectFit: 'contain' }} {...interactionProps} />;
  }

  if (meta.svgCode) {
    return (
      <div
        style={baseStyle}
        {...interactionProps}
        dangerouslySetInnerHTML={{ __html: meta.svgCode }}
      />
    );
  }

  if (subType === 'IMAGE') {
    return null;
  }

  if (subType === 'POLYGON' || meta.points?.length >= 3) {
    const polyPoints = meta.points?.length
      ? meta.points
      : [
          { x: 0, y: 0 },
          { x: object.width, y: 0 },
          { x: object.width, y: object.height },
          { x: 0, y: object.height }
        ];
    const points = pointsToSvg(polyPoints);
    const safeId = String(object.id).replace(/[^a-zA-Z0-9_-]/g, '-');
    const patternId = `preview-map-texture-${safeId}`;
    const usesBuiltinPattern = !meta.textureUrl && hasBuiltinTexture(meta.texture);
    return (
      <svg
        style={baseStyle}
        {...interactionProps}
        viewBox={`0 0 ${object.width} ${object.height}`}
        preserveAspectRatio="none"
      >
        {meta.textureUrl || usesBuiltinPattern ? (
          <defs>
            {meta.textureUrl ? (
              <pattern id={patternId} width="1" height="1" patternUnits="objectBoundingBox">
                <image href={meta.textureUrl} x="0" y="0" width={object.width} height={object.height} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ) : (
              <BuiltinTexturePattern id={patternId} texture={meta.texture} />
            )}
          </defs>
        ) : null}
        <polygon
          points={points}
          fill={meta.textureUrl || usesBuiltinPattern ? `url(#${patternId})` : getPolygonFill(meta)}
          stroke={meta.strokeColor || 'rgba(15, 23, 42, 0.35)'}
          strokeWidth={meta.strokeWidth || 1}
          opacity={meta.opacity ?? 1}
        />
      </svg>
    );
  }

  const canUseTextureImage = subType !== 'IMAGE' && meta.textureUrl;
  if (canUseTextureImage || meta.texture || getObjectAccent(object, label)) {
    const texture = meta.texture || getObjectAccent(object, label);
    return (
      <div
        {...interactionProps}
        style={{
          ...baseStyle,
          background: canUseTextureImage ? `url(${meta.textureUrl}) center / cover` : getPolygonFill({ texture }),
          borderRadius: Math.min(8, Math.max(2, w * 0.04))
        }}
      />
    );
  }

  const plantSubTypes = ['BUSH', 'TREE', 'FLOWER'];
  if (plantSubTypes.includes(subType)) {
    const fillColor = subType === 'TREE' ? '#22c55e' : subType === 'FLOWER' ? '#f472b6' : '#4ade80';
    const fillColor2 = subType === 'TREE' ? '#16a34a' : subType === 'FLOWER' ? '#ec4899' : '#22c55e';
    return (
      <svg style={baseStyle} {...interactionProps} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <g fill={fillColor}>
          <circle cx="50" cy="50" r="40" opacity="0.55" />
          <circle cx="40" cy="40" r="20" fill={fillColor2} />
          <circle cx="60" cy="45" r="25" fill={fillColor2} />
          <circle cx="50" cy="65" r="20" fill={fillColor} />
        </g>
      </svg>
    );
  }

  if (type === 'TEXT' || type === 'LABEL' || meta.text || label) {
    const fontSize = Math.max(6, (meta.fontSize || 14) * scale);
    return (
      <div
        {...interactionProps}
        style={{
          ...baseStyle,
          display: 'grid',
          placeItems: 'center',
          color: meta.fontColor || '#1f2937',
          fontSize,
          fontWeight: 700,
          lineHeight: 1.1,
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(255,255,255,0.55)'
        }}
      >
        {meta.text || label}
      </div>
    );
  }

  return <MapObjectShape object={object} scale={scale} offsetX={0} offsetY={0} />;
}

function MapObjectShape({ object, scale, offsetX, offsetY }) {
  const x = object.x * scale + offsetX;
  const y = object.y * scale + offsetY;
  const w = Math.max(object.width * scale, 4);
  const h = Math.max(object.height * scale, 4);
  const type = String(object.type || '').toUpperCase();

  const bgColor = getObjectColor(type);

  if (type === 'PATH') {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y + h / 2 - 2,
          width: w,
          height: 4,
          background: bgColor,
          opacity: 0.5,
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    );
  }

  if (type === 'WALL') {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          background: bgColor,
          opacity: 0.6,
          borderRadius: 1,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        background: bgColor,
        opacity: 0.35,
        borderRadius: 3,
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}

function TablePreview({ table, selected, scale, offsetX, offsetY, onActivate }) {
  const tX = table.mapX * scale + offsetX;
  const tY = table.mapY * scale + offsetY;
  const w = Math.max((table.mapObjWidth || 32) * scale, 8);
  const h = Math.max((table.mapObjHeight || 32) * scale, 8);
  const isSelected = selected && table.id === selected;

  const statusColor = table.status === 'free' ? '#22c55e'
    : table.status === 'held' ? '#f59e0b'
    : table.status === 'busy' ? '#ef4444'
    : '#9ca3af';

  const fontSize = Math.max(Math.min(w * 0.35, 11), 6);

  return (
    <button
      type="button"
      onClick={(event) => onActivate?.(event, table)}
      title={`${table.code || ''} ${table.status}`}
      style={{
        position: 'absolute',
        left: tX - w / 2,
        top: tY - h / 2,
        width: w,
        height: h,
        borderRadius: table.shape === 'ROUND' ? '50%' : '6px',
        background: isSelected ? '#3b82f6' : statusColor,
        border: isSelected ? '2px solid #fff' : '1px solid rgba(255,255,255,0.6)',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59,130,246,0.5), 0 2px 8px rgba(0,0,0,0.25)'
          : '0 1px 3px rgba(0,0,0,0.15)',
        zIndex: isSelected ? 10 : 2,
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize,
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        lineHeight: 1,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        padding: 0
      }}
    >
      {w > 16 && h > 12 ? (table.code || '') : ''}
    </button>
  );
}

function ObjectStatusMarker({ object, unit, scale, onActivate }) {
  if (!unit) return null;
  const statusColor = unit.status === 'free' ? '#22c55e'
    : unit.status === 'held' ? '#f59e0b'
    : unit.status === 'busy' ? '#ef4444'
    : '#9ca3af';
  const baseWidth = Math.max(20, Math.min(44, String(unit.code || '').length * 7 + 10));
  const width = Math.max(7, baseWidth * scale);
  const height = Math.max(7, 20 * scale);
  const showCode = width >= 14;
  return (
    <button
      type="button"
      onClick={(event) => onActivate?.(event, unit)}
      title={`${unit.code || ''} ${unit.status}`}
      style={{
        position: 'absolute',
        left: (Number(object.x) + Number(object.width) / 2) * scale - width / 2,
        top: (Number(object.y) + Number(object.height) / 2) * scale - height / 2,
        width,
        height,
        padding: 0,
        borderRadius: 999,
        background: statusColor,
        border: `${Math.max(1, 2 * scale)}px solid rgba(255,255,255,.95)`,
        boxShadow: '0 1px 3px rgba(15,23,42,.35)',
        zIndex: Math.max(20, getObjectZIndex(object) + 1),
        cursor: 'pointer',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: Math.max(5, 8 * scale),
        fontWeight: 800,
        lineHeight: 1,
        textShadow: '0 1px 1px rgba(0,0,0,.35)'
      }}
    >
      {showCode ? (unit.code || '') : ''}
    </button>
  );
}

export default function MapPreview({ mapData, mapObjects = [], zones = [], units, selectedTableId, onOpenFullMap, onSelectUnit, height = 220, isPreview = false }) {
  const { locale } = useLocale();
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const gestureMovedRef = useRef(false);
  const gestureHintTimerRef = useRef(null);
  const [view, setView] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeZoneId, setActiveZoneId] = useState('all');
  const [showTwoFingerHint, setShowTwoFingerHint] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  ));
  const previewAspectHeight = containerWidth > 0 && mapData
    ? Math.round(containerWidth * ((mapData.height || 760) / (mapData.width || 1200)) + 24)
    : height;
  const viewportHeight = isPreview ? Math.min(height, Math.max(220, previewAspectHeight)) : height;
  const attachedTableIds = useMemo(() => {
    return new Set((mapObjects || []).filter((object) => object.tableId).map((object) => Number(object.tableId)));
  }, [mapObjects]);

  const unitByTableId = useMemo(() => {
    return new Map((units || []).map((unit) => [Number(unit.tableId), unit]));
  }, [units]);

  const attachedStatusObjects = useMemo(() => {
    return (mapObjects || []).filter((object) => object.tableId && unitByTableId.has(Number(object.tableId)));
  }, [mapObjects, unitByTableId]);

  const allTables = useMemo(() => {
    return units?.filter((u) => u.mapX != null && !attachedTableIds.has(Number(u.tableId))).map((u) => ({
      id: u.tableId,
      code: u.code,
      mapX: Number(u.mapX),
      mapY: Number(u.mapY),
      mapObjWidth: Number(u.mapObjWidth) || 32,
      mapObjHeight: Number(u.mapObjHeight) || 32,
      status: u.status,
      shape: (u.shape || 'ROUND').toUpperCase(),
      zoneId: u.zoneId
    })) || [];
  }, [units, attachedTableIds]);

  const sortedMapObjects = useMemo(() => {
    return [...(mapObjects || [])]
      .filter((object) => object.isActive !== false)
      .sort(compareMapObjects);
  }, [mapObjects]);

  const containerRef = useMemo(() => {
    if (!mapData) return null;
    const mapWidth = mapData.width || 1200;
    const mapHeight = mapData.height || 760;
    const paddedHeight = viewportHeight - 8;
    const fallbackWidth = typeof window !== 'undefined' ? Math.max(280, window.innerWidth - 64) : 400;
    const viewWidth = Math.max(240, containerWidth || fallbackWidth);
    const viewHeight = paddedHeight;
    const transform = getInitialViewTransform(mapWidth, mapHeight, viewWidth, viewHeight, 12);
    return { transform, viewWidth, viewHeight, mapWidth, mapHeight };
  }, [containerWidth, mapData, viewportHeight]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const updateWidth = () => setContainerWidth(Math.round(element.getBoundingClientRect().width));
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mapData]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    function showHint() {
      setShowTwoFingerHint(true);
      window.clearTimeout(gestureHintTimerRef.current);
      gestureHintTimerRef.current = window.setTimeout(() => setShowTwoFingerHint(false), 900);
    }

    function handleTouchMove(event) {
      if (event.touches.length >= 2) {
        event.preventDefault();
      } else if (event.touches.length === 1 && isMobileViewport) {
        showHint();
      }
    }

    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => viewport.removeEventListener('touchmove', handleTouchMove);
  }, [isMobileViewport, mapData]);

  useEffect(() => () => window.clearTimeout(gestureHintTimerRef.current), []);

  useEffect(() => {
    if (!containerRef) return;
    const { transform, viewWidth, viewHeight, mapWidth, mapHeight } = containerRef;
    const scale = Math.min(transform.scale * (isPreview ? 1 : 1.55), 1);
    setView({
      scale,
      x: (viewWidth - mapWidth * scale) / 2,
      y: (viewHeight - mapHeight * scale) / 2
    });
  }, [containerRef, isPreview]);

  if (!mapData || !containerRef) {
    return (
      <div style={{ height: viewportHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        Завантаження мапи закладу...
      </div>
    );
  }

  const { transform, mapWidth, mapHeight } = containerRef;
  const scale = view?.scale ?? transform.scale;
  const translateX = view?.x ?? transform.translateX;
  const translateY = view?.y ?? transform.translateY;

  function handlePointerDown(event) {
    gestureMovedRef.current = false;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, pointerType: event.pointerType });
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      const mobileTouch = isMobileViewport && event.pointerType === 'touch';
      gestureRef.current = { type: mobileTouch ? 'scroll' : 'pan', x: points[0].x, y: points[0].y, view: { scale, x: translateX, y: translateY }, captured: false };
    } else if (points.length === 2) {
      setShowTwoFingerHint(false);
      window.clearTimeout(gestureHintTimerRef.current);
      pointersRef.current.forEach((_point, pointerId) => event.currentTarget.setPointerCapture?.(pointerId));
      const rect = viewportRef.current?.getBoundingClientRect();
      const midpointX = rect ? (points[0].x + points[1].x) / 2 - rect.left : 0;
      const midpointY = rect ? (points[0].y + points[1].y) / 2 - rect.top : 0;
      gestureRef.current = {
        type: 'pinch',
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        view: { scale, x: translateX, y: translateY },
        worldX: (midpointX - translateX) / scale,
        worldY: (midpointY - translateY) / scale
      };
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId) || !gestureRef.current) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, pointerType: event.pointerType });
    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    if (points.length === 1 && gesture.type === 'scroll') {
      if (Math.hypot(points[0].x - gesture.x, points[0].y - gesture.y) > 8) gestureMovedRef.current = true;
      return;
    }
    if (points.length === 1 && gesture.type === 'pan') {
      const dist = Math.hypot(points[0].x - gesture.x, points[0].y - gesture.y);
      if (!gesture.captured && dist > 5) {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        gesture.captured = true;
      }
      if (dist > 5) gestureMovedRef.current = true;
      setView({ ...gesture.view, x: gesture.view.x + points[0].x - gesture.x, y: gesture.view.y + points[0].y - gesture.y });
    } else if (points.length === 2) {
      event.preventDefault();
      const distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
      const nextScale = Math.max(transform.scale, Math.min(2.5, gesture.view.scale * distance / Math.max(1, gesture.distance)));
      const rect = viewportRef.current?.getBoundingClientRect();
      const midpointX = rect ? (points[0].x + points[1].x) / 2 - rect.left : 0;
      const midpointY = rect ? (points[0].y + points[1].y) / 2 - rect.top : 0;
      setView({
        scale: nextScale,
        x: midpointX - gesture.worldX * nextScale,
        y: midpointY - gesture.worldY * nextScale
      });
    }
  }

  function handlePointerEnd(event) {
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
  }

  function activateUnit(event, unit) {
    event.preventDefault?.();
    event.stopPropagation?.();
    if (gestureMovedRef.current) {
      gestureMovedRef.current = false;
      return;
    }
    onSelectUnit?.(unit);
  }

  function fitWholeMap() {
    const { transform: initial, viewWidth, viewHeight, mapWidth: width, mapHeight: mapHeightValue } = containerRef;
    const nextScale = Math.min(initial.scale * (isPreview ? 1 : 1.55), 1);
    setView({ scale: nextScale, x: (viewWidth - width * nextScale) / 2, y: (viewHeight - mapHeightValue * nextScale) / 2 });
    setActiveZoneId('all');
  }

  function focusZone(zoneId) {
    const zoneUnits = (units || []).filter((unit) => String(unit.zoneId) === String(zoneId) && unit.mapX != null && unit.mapY != null);
    if (!zoneUnits.length) return;
    const minX = Math.min(...zoneUnits.map((unit) => Number(unit.mapX)));
    const maxX = Math.max(...zoneUnits.map((unit) => Number(unit.mapX)));
    const minY = Math.min(...zoneUnits.map((unit) => Number(unit.mapY)));
    const maxY = Math.max(...zoneUnits.map((unit) => Number(unit.mapY)));
    const zoneWidth = Math.max(180, maxX - minX + 220);
    const zoneHeight = Math.max(180, maxY - minY + 220);
    const nextScale = Math.min(1.35, Math.max(containerRef.transform.scale, Math.min(containerRef.viewWidth / zoneWidth, containerRef.viewHeight / zoneHeight) * .88));
    setView({
      scale: nextScale,
      x: containerRef.viewWidth / 2 - ((minX + maxX) / 2) * nextScale,
      y: containerRef.viewHeight / 2 - ((minY + maxY) / 2) * nextScale
    });
    setActiveZoneId(String(zoneId));
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      {zones.length && !isPreview ? (
        <div className="public-map-zone-tabs" aria-label="Map zones">
          <button type="button" className={`public-map-zone-tab ${activeZoneId === 'all' ? 'active' : ''}`} onClick={fitWholeMap}>Вся мапа</button>
          {zones.map((zone) => (
            <button key={zone.id} type="button" className={`public-map-zone-tab ${activeZoneId === String(zone.id) ? 'active' : ''}`} onClick={() => focusZone(zone.id)}>
              {localizeField(zone.name, 'ua') || zone.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        style={{
          height: viewportHeight,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          background: mapData.backgroundColor || '#f8fafc',
          position: 'relative',
          touchAction: isMobileViewport ? 'pan-y' : 'none',
          cursor: 'grab'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: translateX,
            top: translateY,
            transformOrigin: '0 0'
          }}
        >
          <div
            style={{
              width: mapWidth * scale,
              height: mapHeight * scale,
              position: 'relative',
              backgroundColor: mapData.backgroundColor || '#f8fafc',
              backgroundImage: mapData.backgroundImage ? `url(${mapData.backgroundImage})` : 'none',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {sortedMapObjects.map((object) => (
              <RealMapObject
                key={object.id}
                object={object}
                scale={scale}
                unit={object.tableId ? unitByTableId.get(Number(object.tableId)) : null}
                onActivate={activateUnit}
              />
            ))}

            {attachedStatusObjects.map((object) => (
              <ObjectStatusMarker
                key={`status-${object.id}`}
                object={object}
                unit={unitByTableId.get(Number(object.tableId))}
                scale={scale}
                onActivate={activateUnit}
              />
            ))}

            {allTables.map((t) => (
              <TablePreview
                key={t.id}
                table={t}
                selected={selectedTableId}
                scale={scale}
                offsetX={0}
                offsetY={0}
                onActivate={activateUnit}
              />
            ))}
          </div>
        </div>
        <div className={`map-gesture-guidance ${showTwoFingerHint ? 'is-visible' : ''}`} aria-hidden={!showTwoFingerHint}>
          <span className="map-two-finger-mark" aria-hidden="true" />
          <strong>{locale === 'ua'
            ? 'Переміщуйте мапу двома пальцями'
            : locale === 'ru'
              ? 'Перемещайте карту двумя пальцами'
              : 'Use two fingers to move the map'}</strong>
        </div>
      </div>

      {!isPreview && (
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <button type="button" className="btn btn-secondary btn-small" onClick={onOpenFullMap}>
            Відкрити повну мапу закладу
          </button>
        </div>
      )}
    </div>
  );
}
