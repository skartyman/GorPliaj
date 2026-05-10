import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useInteractiveMap } from '../hooks/useInteractiveMap';

function getTimeKey(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getDateKey(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function getTableDisplayStatus(table, reservationsByTable, heldTableIds, busyTableIds) {
  if (!table?.isActive || !table?.isBookable) {
    return 'UNAVAILABLE';
  }

  const reservations = reservationsByTable[table.id] || [];
  if (reservations.some((reservation) => reservation.status === 'PENDING')) {
    return 'PENDING';
  }

  if (reservations.some((reservation) => ['CONFIRMED', 'AWAITING_PAYMENT'].includes(reservation.status))) {
    return 'CONFIRMED';
  }

  if (heldTableIds.has(table.id)) {
    return 'HELD';
  }

  if (busyTableIds.has(table.id)) {
    return 'CONFIRMED';
  }

  return 'FREE';
}

function parseStyleJson(styleJson) {
  if (!styleJson) {
    return {};
  }

  try {
    const parsed = typeof styleJson === 'string' ? JSON.parse(styleJson) : styleJson;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return {
      background: typeof parsed.background === 'string' ? parsed.background : undefined,
      borderColor: typeof parsed.borderColor === 'string' ? parsed.borderColor : undefined,
      color: typeof parsed.color === 'string' ? parsed.color : undefined,
      borderRadius: Number.isFinite(parsed.borderRadius) ? `${parsed.borderRadius}px` : undefined,
      opacity: Number.isFinite(parsed.opacity) ? Math.min(1, Math.max(0.2, parsed.opacity)) : undefined
    };
  } catch {
    return {};
  }
}

function parseMetaJson(metaJson) {
  if (!metaJson) {
    return {};
  }

  try {
    const parsed = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return {
      interactionMode: typeof parsed.interactionMode === 'string' ? parsed.interactionMode : '',
      isSelectable: Boolean(parsed.isSelectable) || String(parsed.subType || '').toUpperCase() === 'BED',
      subType: typeof parsed.subType === 'string' ? parsed.subType : '',
      svgUrl: typeof parsed.svgUrl === 'string' ? parsed.svgUrl : '',
      svgCode: typeof parsed.svgCode === 'string' ? parsed.svgCode : '',
      texture: typeof parsed.texture === 'string' ? parsed.texture : '',
      textureUrl: typeof parsed.textureUrl === 'string' ? parsed.textureUrl : '',
      points: Array.isArray(parsed.points) ? parsed.points : [],
      opacity: Number.isFinite(Number(parsed.opacity)) ? Number(parsed.opacity) : 1,
      strokeColor: typeof parsed.strokeColor === 'string' ? parsed.strokeColor : '',
      strokeWidth: Number.isFinite(Number(parsed.strokeWidth)) ? Number(parsed.strokeWidth) : 2,
      price: parsed.price ?? parsed.objectPrice ?? '',
      priceUnit: typeof parsed.priceUnit === 'string' ? parsed.priceUnit : ''
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

function MapObjectGraphic({ object, meta, label }) {
  const subType = String(meta.subType || '').toUpperCase();

  if (meta.svgUrl) {
    return <img src={meta.svgUrl} alt={label} className="interactive-map-object-svg" />;
  }

  if (meta.svgCode) {
    return <div className="interactive-map-object-svg" dangerouslySetInnerHTML={{ __html: meta.svgCode }} />;
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
    const patternId = `admin-map-texture-${String(object.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;

    return (
      <svg className="interactive-map-object-svg" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
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

function mapObjectLabel(object, t, language) {
  const labelStr = localizeField(object.label, language);
  if (labelStr) {
    return labelStr;
  }

  const fallback = t(`mapEditor.objectType.${object.type}`);
  return fallback && fallback !== `mapEditor.objectType.${object.type}` ? fallback : object.type || 'OBJECT';
}

export default function MapPage() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    mapData: null,
    reservations: [],
    availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
  });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const { t, language } = useAdminI18n();

  useEffect(() => {
    async function loadMapData() {
      const mapResult = await apiRequest('/api/maps/default');
      if (!mapResult.response.ok) {
        setState({
          loading: false,
          error: mapResult.body.message || t('map.errors.load'),
          mapData: null,
          reservations: [],
          availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
        });
        return;
      }

      const mapData = mapResult.body;
      const [reservationsResult, availabilityResult] = await Promise.all([
        apiRequest('/api/admin/reservations'),
        apiRequest(`/api/maps/${mapData.map.id}/availability?date=${getDateKey()}&timeFrom=${getTimeKey(new Date())}`)
      ]);

      setState({
        loading: false,
        error: '',
        mapData,
        reservations: reservationsResult.response.ok && Array.isArray(reservationsResult.body) ? reservationsResult.body : [],
        availability:
          availabilityResult.response.ok && availabilityResult.body
            ? availabilityResult.body
            : { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      });
    }

    loadMapData().catch(() => {
      setState({
        loading: false,
        error: t('map.errors.load'),
        mapData: null,
        reservations: [],
        availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      });
    });
  }, [t]);

  const mapDimensions = {
    width: state.mapData?.map?.width || 1200,
    height: state.mapData?.map?.height || 760
  };

  const { containerRef, transform, minScale, maxScale, handlers, actions } = useInteractiveMap({
    worldWidth: mapDimensions.width,
    worldHeight: mapDimensions.height,
    minScale: 0.22,
    maxScale: 3
  });

  const tableMap = useMemo(
    () => new Map((state.mapData?.tables || []).map((table) => [table.id, table])),
    [state.mapData?.tables]
  );
  const zoneMap = useMemo(
    () => new Map((state.mapData?.zones || []).map((zone) => [zone.id, zone])),
    [state.mapData?.zones]
  );

  const reservationsByTable = useMemo(() => {
    const grouped = {};
    const todayKey = getDateKey();

    state.reservations.forEach((reservation) => {
      if (String(reservation.reservationDate).slice(0, 10) !== todayKey || !reservation.table?.id) {
        return;
      }

      if (!grouped[reservation.table.id]) {
        grouped[reservation.table.id] = [];
      }
      grouped[reservation.table.id].push(reservation);
    });

    return grouped;
  }, [state.reservations]);

  const heldTableIds = useMemo(() => new Set(state.availability.heldTableIds || []), [state.availability.heldTableIds]);
  const busyTableIds = useMemo(() => new Set(state.availability.busyTableIds || []), [state.availability.busyTableIds]);

  const mapEntities = useMemo(() => {
    const objects = state.mapData?.objects || [];

    return objects.map((object) => {
      const isTable = object.type === 'TABLE';
      const table = isTable && object.tableId ? tableMap.get(object.tableId) : null;
      const zone = table ? zoneMap.get(table.zoneId) : null;
      const meta = parseMetaJson(object.metaJson);
      return {
        ...object,
        isTable,
        table,
        zone,
        meta,
        width: Math.max(Number(object.width) || 44, 24),
        height: Math.max(Number(object.height) || 44, 24),
        x: Number(object.x) || 0,
        y: Number(object.y) || 0
      };
    });
  }, [state.mapData?.objects, tableMap, zoneMap]);

  const selectedTable = selectedTableId ? tableMap.get(selectedTableId) : null;
  const selectedObject = selectedObjectId ? mapEntities.find((object) => object.id === selectedObjectId) || null : null;
  const selectedReservations = (selectedTable && reservationsByTable[selectedTable.id]) || [];
  const selectedStatus = selectedTable
    ? getTableDisplayStatus(selectedTable, reservationsByTable, heldTableIds, busyTableIds)
    : null;

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');

  const onBookTable = (table) => {
    // future booking flow callback
    console.info('booking hook', table);
  };

  const selectObject = (object) => {
    const meta = object?.meta || {};
    const isSelectable = meta.interactionMode === 'SELECTABLE' || meta.isSelectable;
    if (!isSelectable) {
      return;
    }

    setSelectedObjectId(object.id);
    setSelectedTableId(null);
  };

  return (
    <AdminLayout>
      <PageContainer
        title={t('map.title')}
        description={t('map.description')}
        actions={(
          <Link className="btn btn-secondary" to="/admin/map-editor">
            {t('map.openEditor')}
          </Link>
        )}
      >
        <section className="page-hero compact">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('map.eyebrow')}</span>
            <h3>{t('map.heroTitle')}</h3>
            <p className="muted">{t('map.heroDescription')}</p>
          </div>
          <div className="hero-inline-note">{t('map.note')}</div>
        </section>

        {state.loading ? <div className="map-state">{t('map.loading')}</div> : null}
        {state.error ? <div className="map-state error">{state.error}</div> : null}

        {!state.loading && !state.error && !state.mapData?.map ? (
          <div className="map-state muted">Map is empty. Add map data in editor.</div>
        ) : null}

        {!state.loading && !state.error && state.mapData?.map ? (
          <>
            <div className="map-meta muted">
              {t('map.meta', {
                map: localizeField(state.mapData.map?.name, language) || '—',
                zones: state.mapData.zones?.length || 0,
                tables: state.mapData.tables?.length || 0
              })}
            </div>

            <div className="interactive-map-shell">
              <div className="interactive-map-controls">
                <button type="button" className="map-control" onClick={actions.zoomIn} aria-label="Zoom in">+</button>
                <button type="button" className="map-control" onClick={actions.zoomOut} aria-label="Zoom out">−</button>
                <button type="button" className="map-control fit" onClick={actions.fitToView} aria-label="Fit map">⤢</button>
                <span className="map-zoom-indicator">
                  {Math.round(transform.scale * 100)}% · min {Math.round(minScale * 100)}% / max {Math.round(maxScale * 100)}%
                </span>
              </div>

              <div className="interactive-map-viewport" ref={containerRef} {...handlers}>
                <div
                  className="interactive-map-world"
                  style={{
                    width: mapDimensions.width,
                    height: mapDimensions.height,
                    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`
                  }}
                >
                  <div
                    className="interactive-map-background"
                    style={{
                      backgroundColor: state.mapData.map.backgroundColor || '#eef2ff',
                      backgroundImage: state.mapData.map.backgroundImage ? `url(${state.mapData.map.backgroundImage})` : 'none'
                    }}
                  />

                  {mapEntities.map((object) => {
                    const rotation = Number(object.rotation) || 0;
                    const meta = object.meta || {};
                    const isSelectableObject = meta.interactionMode === 'SELECTABLE' || meta.isSelectable;
                    const baseStyle = {
                      left: object.x,
                      top: object.y,
                      width: object.width,
                      height: object.height,
                      transform: `rotate(${rotation}deg)`,
                      zIndex: object.zIndex || 2
                    };

                    if (!object.isTable) {
                      const hasAsset = Boolean(meta.svgUrl || meta.svgCode || String(meta.subType || '').toUpperCase() === 'POLYGON');
                      const objectLabel = mapObjectLabel(object, t, language);
                      return (
                        <button
                          key={object.id}
                          type="button"
                          className={`interactive-map-object object-${String(object.type || 'custom').toLowerCase()} ${hasAsset ? 'has-asset' : ''} ${isSelectableObject ? 'selectable' : ''} ${selectedObjectId === object.id ? 'selected' : ''}`.trim()}
                          style={{ ...baseStyle, ...parseStyleJson(object.styleJson) }}
                          title={objectLabel}
                          aria-disabled={!isSelectableObject}
                          tabIndex={isSelectableObject ? 0 : -1}
                          onClick={() => selectObject(object)}
                        >
                          <MapObjectGraphic object={object} meta={meta} label={objectLabel} />
                        </button>
                      );
                    }

                    const status = getTableDisplayStatus(object.table, reservationsByTable, heldTableIds, busyTableIds);
                    const tableShape = String(object.table?.shape || 'ROUND').toUpperCase();

                    return (
                      <button
                        key={object.id}
                        type="button"
                        className={`interactive-map-table ${status.toLowerCase()} ${selectedTableId === object.tableId ? 'selected' : ''}`}
                        style={{
                          ...baseStyle,
                          borderRadius: tableShape === 'ROUND' ? 999 : 12
                        }}
                        title={localizeField(object.table?.name, language) || object.table?.code || t('map.fields.table')}
                        onClick={() => {
                          setSelectedTableId(object.tableId);
                          setSelectedObjectId(null);
                        }}
                      >
                        <span>{object.table?.code || localizeField(object.table?.name, language) || 'T'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="map-legend">
              <span><i className="dot free" /> {t('map.legend.free')}</span>
              <span><i className="dot pending" /> {t('map.legend.pending')}</span>
              <span><i className="dot confirmed" /> {t('map.legend.confirmed')}</span>
              <span><i className="dot held" /> {t('map.legend.held')}</span>
              <span><i className="dot unavailable" /> {t('map.legend.unavailable')}</span>
            </div>

            {selectedTable ? (
              <div className="table-bottom-sheet" role="dialog" aria-live="polite">
                <div className="table-sheet-head">
                  <h4>{localizeField(selectedTable.name, language) || selectedTable.code || t('map.fields.table')}</h4>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedTableId(null)}>Close</button>
                </div>

                <div className="details-grid compact table-sheet-grid">
                  <div className="detail-row"><span className="muted">Code</span><strong>{selectedTable.code || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">Capacity</span><strong>{selectedTable.seatsMin || '—'}-{selectedTable.seatsMax || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">Deposit</span><strong>{selectedTable.deposit || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">Zone</span><strong>{localizeField(zoneMap.get(selectedTable.zoneId)?.name, language) || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">Bookable</span><strong>{selectedTable.isBookable ? 'Yes' : 'No'}</strong></div>
                  <div className="detail-row"><span className="muted">Status</span><strong><StatusPill status={selectedStatus} /></strong></div>
                </div>

                {!selectedReservations.length ? <p className="muted">{t('map.noActiveReservations')}</p> : null}
                {selectedReservations.length ? (
                  <ul className="plain-list compact">
                    {selectedReservations.slice(0, 3).map((reservation) => (
                      <li key={reservation.id}>
                        <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link> • {reservation.customerName || t('common.guest')} •{' '}
                        {formatDate(reservation.reservationDate, dateLocale)} {formatTime(reservation.timeFrom, dateLocale)} • <StatusPill status={reservation.status} />
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="actions">
                  <button type="button" className="btn" onClick={() => onBookTable(selectedTable)}>Prepare booking</button>
                </div>
              </div>
            ) : selectedObject ? (
              <div className="table-bottom-sheet" role="dialog" aria-live="polite">
                <div className="table-sheet-head">
                  <h4>{mapObjectLabel(selectedObject, t, language)}</h4>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedObjectId(null)}>Close</button>
                </div>

                <div className="details-grid compact table-sheet-grid">
                  <div className="detail-row"><span className="muted">Type</span><strong>{selectedObject.type || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">Mode</span><strong>{selectedObject.meta?.interactionMode === 'SELECTABLE' || selectedObject.meta?.isSelectable ? 'Working object' : 'Decor'}</strong></div>
                  <div className="detail-row"><span className="muted">SVG</span><strong>{selectedObject.meta?.svgUrl || selectedObject.meta?.svgCode ? 'Attached' : 'No asset'}</strong></div>
                  <div className="detail-row"><span className="muted">Price</span><strong>{selectedObject.meta?.price !== '' && selectedObject.meta?.price !== null && selectedObject.meta?.price !== undefined ? `${selectedObject.meta.price} ${selectedObject.meta?.priceUnit || 'UAH'}` : 'Not set'}</strong></div>
                </div>

                <div className="actions">
                  <button type="button" className="btn" onClick={() => window.location.assign('/admin/map-editor')}>
                    Edit in editor
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
