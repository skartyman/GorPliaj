import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { mapApi } from '../lib/api';
import { clamp, clampTranslate, getInitialViewTransform, getObjectCenter, getPublicMapData, zoomAroundViewportPoint } from '../lib/map';
import { localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const MAP_PADDING = 24;
const PINCH_SENSITIVITY = 0.006;

function parseStyleJson(styleJson) {
  if (!styleJson) return {};
  try {
    const style = typeof styleJson === 'string' ? JSON.parse(styleJson) : styleJson;
    return {
      background: typeof style?.background === 'string' ? style.background : undefined,
      borderColor: typeof style?.borderColor === 'string' ? style.borderColor : undefined,
      color: typeof style?.color === 'string' ? style.color : undefined,
      borderRadius: Number.isFinite(style?.borderRadius) ? `${style.borderRadius}px` : undefined,
      opacity: Number.isFinite(style?.opacity) ? Math.max(0.2, Math.min(1, style.opacity)) : undefined
    };
  } catch {
    return {};
  }
}

function parseMetaJson(metaJson) {
  if (!metaJson) return {};

  try {
    const parsed = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    if (!parsed || typeof parsed !== 'object') return {};

    return {
      subType: typeof parsed.subType === 'string' ? parsed.subType : '',
      svgUrl: typeof parsed.svgUrl === 'string' ? parsed.svgUrl : '',
      svgCode: typeof parsed.svgCode === 'string' ? parsed.svgCode : '',
      texture: typeof parsed.texture === 'string' ? parsed.texture : '',
      textureUrl: typeof parsed.textureUrl === 'string' ? parsed.textureUrl : '',
      points: Array.isArray(parsed.points) ? parsed.points : [],
      opacity: Number.isFinite(Number(parsed.opacity)) ? Number(parsed.opacity) : 1,
      strokeColor: typeof parsed.strokeColor === 'string' ? parsed.strokeColor : '',
      strokeWidth: Number.isFinite(Number(parsed.strokeWidth)) ? Number(parsed.strokeWidth) : 2
    };
  } catch {
    return {};
  }
}

function pointsToSvg(points) {
  return (points || []).map((point) => `${Number(point.x) || 0},${Number(point.y) || 0}`).join(' ');
}

function getPolygonFill(meta) {
  if (meta.texture === 'sand') return '#fef3c7';
  if (meta.texture === 'water') return '#bfdbfe';
  if (meta.texture === 'wood') return '#d6a766';
  if (meta.texture === 'grass') return '#bbf7d0';
  return '#e2e8f0';
}

function PublicMapObjectGraphic({ object, meta, label }) {
  const subType = String(meta.subType || '').toUpperCase();

  if (meta.svgUrl) {
    return <img src={meta.svgUrl} alt={label} className="public-map-object-asset" />;
  }

  if (meta.svgCode) {
    return <div className="public-map-object-asset" dangerouslySetInnerHTML={{ __html: meta.svgCode }} />;
  }

  if (subType === 'POLYGON') {
    const points = meta.points?.length
      ? meta.points
      : [
          { x: 0, y: 0 },
          { x: object.width, y: 0 },
          { x: object.width, y: object.height },
          { x: 0, y: object.height }
        ];
    const patternId = `public-map-texture-${String(object.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;

    return (
      <svg className="public-map-object-asset" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
        {meta.textureUrl ? (
          <defs>
            <pattern id={patternId} x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox">
              <image href={meta.textureUrl} x="0" y="0" width={object.width} height={object.height} preserveAspectRatio="xMidYMid slice" />
            </pattern>
          </defs>
        ) : null}
        <polygon
          points={pointsToSvg(points)}
          fill={meta.textureUrl ? `url(#${patternId})` : getPolygonFill(meta)}
          opacity={meta.opacity}
          stroke={meta.strokeColor || '#64748b'}
          strokeWidth={meta.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return <span>{label}</span>;
}

export default function MapPage() {
  const { t, locale } = useLocale();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', result: null });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0, minScale: 0.45, maxScale: 3.5, initial: null });
  const viewportRef = useRef(null);
  const pointersRef = useRef(new Map());
  const dragStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: 1, translateX: 0, translateY: 0 });
  useMeta(`${t('mapTitle')} · ГорПляж`, 'Интерактивная карта заведения с живыми статусами столов.');

  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const timeFrom = searchParams.get('timeFrom') || '12:00';
  const guests = Number(searchParams.get('guests') || '0');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    getPublicMapData(mapApi, { date, timeFrom })
      .then((result) => setState({ loading: false, error: '', result }))
      .catch(() => setState({ loading: false, error: t('mapLoadFailed'), result: null }));
  }, [date, timeFrom, t]);

  useEffect(() => {
    if (!state.result || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const initial = getInitialViewTransform(state.result.map.width, state.result.map.height, rect.width, rect.height, MAP_PADDING);
    const minScale = clamp(initial.scale * 0.55, 0.25, 2);
    const maxScale = Math.max(minScale + 0.35, Math.max(2.4, initial.scale * 3));
    const constrained = clampTranslate(state.result.map.width, state.result.map.height, rect.width, rect.height, initial.scale, initial.translateX, initial.translateY);
    setTransform({
      scale: initial.scale,
      translateX: constrained.translateX,
      translateY: constrained.translateY,
      minScale,
      maxScale,
      initial
    });
  }, [state.result]);

  useEffect(() => {
    if (!state.result) return;
    const tables = state.result.map.zones.flatMap((zone) => zone.tables);
    setSelectedTable(selectedTableId ? tables.find((item) => item.id === selectedTableId) || null : null);
  }, [selectedTableId, state.result]);

  const tableById = useMemo(() => {
    if (!state.result) return new Map();
    return new Map(state.result.map.zones.flatMap((zone) => zone.tables).map((table) => [table.id, table]));
  }, [state.result]);

  const canInteractWithMap = Boolean(state.result && transform.initial);
  const resetTransform = transform.initial || {
    scale: 1,
    translateX: 0,
    translateY: 0
  };

  function applyTransform(nextScale, nextX, nextY) {
    if (!state.result || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const constrained = clampTranslate(state.result.map.width, state.result.map.height, rect.width, rect.height, nextScale, nextX, nextY);
    setTransform((current) => ({ ...current, scale: nextScale, translateX: constrained.translateX, translateY: constrained.translateY }));
  }

  function zoomTo(nextScale, pivotX, pivotY) {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const boundedScale = clamp(nextScale, transform.minScale, transform.maxScale);
    const localX = pivotX ?? rect.width / 2;
    const localY = pivotY ?? rect.height / 2;
    const anchored = zoomAroundViewportPoint(localX, localY, boundedScale, transform.scale, transform.translateX, transform.translateY);
    applyTransform(boundedScale, anchored.translateX, anchored.translateY);
  }

  function selectTable(tableId) {
    setSelectedTableId(tableId);
    if (!viewportRef.current || !state.result) return;
    const selectedObject = state.result.map.objects.find((item) => item.tableId === tableId);
    if (!selectedObject) return;
    const center = getObjectCenter(selectedObject);
    const rect = viewportRef.current.getBoundingClientRect();
    const targetX = rect.width / 2 - center.x * transform.scale;
    const targetY = rect.height * (isMobileViewport ? 0.38 : 0.5) - center.y * transform.scale;
    applyTransform(transform.scale, targetX, targetY);
  }

  function tableFitsGuests(table) {
    return !guests || (guests >= table.seatsMin && guests <= table.seatsMax);
  }

  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    viewportRef.current?.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: event.clientX, y: event.clientY, translateX: transform.translateX, translateY: transform.translateY };
      setIsDragging(true);
    }
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchStartRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: transform.scale,
        translateX: transform.translateX,
        translateY: transform.translateY
      };
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1 && isDragging) {
      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;
      applyTransform(transform.scale, dragStartRef.current.translateX + dx, dragStartRef.current.translateY + dy);
      return;
    }

    if (pointersRef.current.size === 2 && viewportRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const currentDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const rect = viewportRef.current.getBoundingClientRect();
      const midpointX = (a.x + b.x) / 2 - rect.left;
      const midpointY = (a.y + b.y) / 2 - rect.top;
      const nextScale = clamp(
        pinchStartRef.current.scale * (1 + (currentDistance - pinchStartRef.current.distance) * PINCH_SENSITIVITY),
        transform.minScale,
        transform.maxScale
      );
      const anchored = zoomAroundViewportPoint(
        midpointX,
        midpointY,
        nextScale,
        pinchStartRef.current.scale,
        pinchStartRef.current.translateX,
        pinchStartRef.current.translateY
      );
      applyTransform(nextScale, anchored.translateX, anchored.translateY);
    }
  }

  function handlePointerEnd(event) {
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId);
    }
    pointersRef.current.delete(event.pointerId);
    if (!pointersRef.current.size) {
      setIsDragging(false);
    }
  }

  if (state.loading) {
    return <div className="state-msg">{t('mapLoading') || 'Загрузка карты...'}</div>;
  }

  if (state.error || !state.result) {
    return <div className="state-msg state-error">{state.error || t('mapLoadFailed')}</div>;
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{t('mapTitle')}</h1>
          <p className="muted">{t('mapSubtitle')}</p>
        </div>
      </div>

      <div className="map-container">
        <article className="map-zone-board">
          <div className="map-controls">
            <button type="button" className="btn btn-secondary map-control-btn" onClick={() => zoomTo(transform.scale * 1.15)}>
              {t('mapZoomIn')}
            </button>
            <button type="button" className="btn btn-secondary map-control-btn" onClick={() => zoomTo(transform.scale / 1.15)}>
              {t('mapZoomOut')}
            </button>
            <button
              type="button"
              className="btn btn-secondary map-control-btn map-control-btn-reset"
              onClick={() => applyTransform(resetTransform.scale, resetTransform.translateX, resetTransform.translateY)}
              disabled={!canInteractWithMap}
            >
              {t('mapFit')}
            </button>
            <span className="map-zoom-pill">{Math.round(transform.scale * 100)}%</span>
          </div>

          <div className={`public-map-shell ${isDragging ? 'is-dragging' : ''}`}>
            <div
              className="public-map-viewport"
              ref={viewportRef}
              role="application"
              onWheel={(event) => {
                if (!canInteractWithMap) return;
                event.preventDefault();
                const rect = viewportRef.current.getBoundingClientRect();
                zoomTo(transform.scale * (event.deltaY > 0 ? 0.92 : 1.08), event.clientX - rect.left, event.clientY - rect.top);
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              onDoubleClick={(event) => {
                if (!canInteractWithMap) return;
                const rect = viewportRef.current.getBoundingClientRect();
                zoomTo(transform.scale * 1.25, event.clientX - rect.left, event.clientY - rect.top);
              }}
            >
              <div
                className="public-map-world"
                style={{
                  width: state.result.map.width,
                  height: state.result.map.height,
                  transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`
                }}
              >
                <div
                  className="public-map-background"
                  style={{
                    backgroundColor: state.result.map.backgroundColor || '#d8e7f8',
                    backgroundImage: state.result.map.backgroundImage ? `url(${state.result.map.backgroundImage})` : 'none'
                  }}
                />

                {state.result.map.objects.map((object) => {
                  const table = object.tableId ? tableById.get(object.tableId) : null;
                  const objectLabel = localizeField(object.label, locale) || object.type;
                  const meta = parseMetaJson(object.metaJson);
                  if (table) {
                    const disabled = table.status !== 'free' || !tableFitsGuests(table);
                    return (
                      <button
                        key={object.id}
                        type="button"
                        className={`public-map-table ${table.status} ${!tableFitsGuests(table) ? 'no-fit' : ''} ${selectedTableId === table.id ? 'selected' : ''}`}
                        style={{
                          left: object.x,
                          top: object.y,
                          width: object.width,
                          height: object.height,
                          transform: `rotate(${object.rotation}deg)`,
                          zIndex: object.zIndex,
                          borderRadius: table.shape === 'ROUND' ? 999 : 12
                        }}
                        onClick={() => selectTable(table.id)}
                        disabled={disabled}
                      >
                        {table.code}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={object.id}
                      className={`public-map-object object-${String(object.type).toLowerCase()} ${meta.svgUrl || meta.svgCode || String(meta.subType || '').toUpperCase() === 'POLYGON' ? 'has-asset' : ''}`}
                      style={{
                        left: object.x,
                        top: object.y,
                        width: object.width,
                        height: object.height,
                        transform: `rotate(${object.rotation}deg)`,
                        zIndex: object.zIndex,
                        ...parseStyleJson(object.styleJson)
                      }}
                      title={objectLabel}
                    >
                      <PublicMapObjectGraphic object={object} meta={meta} label={objectLabel} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {!canInteractWithMap ? <p className="muted">Подготавливаем карту...</p> : null}

          {!state.result.map.objects.length ? <p className="muted">{t('mapEmpty')}</p> : null}

          <button type="button" className="map-legend-toggle" onClick={() => setIsLegendOpen((value) => !value)}>
            {t('mapLegendTitle')}
          </button>
          <div className={`map-legend ${isLegendOpen || !isMobileViewport ? 'is-open' : ''}`}>
            <span>
              <i className="legend-dot free" /> {t('mapFree')}
            </span>
            <span>
              <i className="legend-dot held" /> {t('mapHeld')}
            </span>
            <span>
              <i className="legend-dot busy" /> {t('mapBusy')}
            </span>
            <span>
              <i className="legend-dot no-fit" /> {t('mapNoFit')}
            </span>
          </div>
        </article>

        <aside className={`map-side-panel ${isMobileViewport ? 'mobile-sheet' : ''} ${selectedTable ? 'is-open' : ''}`}>
          <h3>{t('mapSelectedTitle')}</h3>
          {selectedTable ? (
            <>
              <p>
                <strong>{localizeField(selectedTable.name, locale) || selectedTable.code}</strong>
              </p>
              <p className="muted">
                {t('mapSeats')}: {selectedTable.seatsMin}-{selectedTable.seatsMax}
              </p>
              <Link
                className="btn btn-primary"
                to={`/booking?date=${date}&guests=${searchParams.get('guests') || ''}&timeFrom=${timeFrom}&tableId=${selectedTable.id}&mapId=${state.result.map.id}&zoneId=${selectedTable.zoneId}`}
              >
                {t('mapGoToBooking')}
              </Link>
            </>
          ) : (
            <p className="muted">{t('mapSelectHint')}</p>
          )}
          <p className="muted source-note">{t('mapSource')}</p>
        </aside>
      </div>
    </>
  );
}
