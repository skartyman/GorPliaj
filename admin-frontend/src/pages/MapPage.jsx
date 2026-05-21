import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useInteractiveMap } from '../hooks/useInteractiveMap';

const DEFAULT_BED_ASSET_URL = 'https://pub-6d1f04082d9e4584a48596bdac463b42.r2.dev/menu/1778407987243-d869a9bf9505fca824818b2d.png';
const MAP_PREVIEW_GUTTER = 240;

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

    const subType = typeof parsed.subType === 'string' ? parsed.subType : '';
    const normalizedSubType = String(subType || '').toUpperCase();
    const svgUrl = typeof parsed.svgUrl === 'string' ? parsed.svgUrl : '';

    return {
      interactionMode: typeof parsed.interactionMode === 'string' ? parsed.interactionMode : '',
      isSelectable: parsed.interactionMode === 'DECOR' ? false : (Boolean(parsed.isSelectable) || normalizedSubType === 'BED'),
      subType,
      svgUrl: svgUrl || (normalizedSubType === 'BED' ? DEFAULT_BED_ASSET_URL : ''),
      svgCode: typeof parsed.svgCode === 'string' ? parsed.svgCode : '',
      texture: typeof parsed.texture === 'string' ? parsed.texture : '',
      textureUrl: typeof parsed.textureUrl === 'string' ? parsed.textureUrl : '',
      points: Array.isArray(parsed.points) ? parsed.points : [],
      pathData: typeof parsed.pathData === 'string' ? parsed.pathData : '',
      opacity: Number.isFinite(Number(parsed.opacity)) ? Number(parsed.opacity) : 1,
      strokeColor: typeof parsed.strokeColor === 'string' ? parsed.strokeColor : '',
      strokeWidth: Number.isFinite(Number(parsed.strokeWidth)) ? Number(parsed.strokeWidth) : 2,
      price: parsed.price ?? parsed.objectPrice ?? '',
      priceUnit: typeof parsed.priceUnit === 'string' ? parsed.priceUnit : '',
      depositRequired: Boolean(parsed.depositRequired),
      depositAmount: parsed.depositAmount ?? parsed.deposit ?? '',
      photoUrl: typeof parsed.photoUrl === 'string' ? parsed.photoUrl : '',
      zoneId: Number.isInteger(Number(parsed.zoneId)) ? Number(parsed.zoneId) : null,
      tableCode: typeof parsed.tableCode === 'string' ? parsed.tableCode : ''
    };
  } catch {
    return {};
  }
}

function pointsToSvg(points) {
  return (points || []).map((point) => `${Number(point.x) || 0},${Number(point.y) || 0}`).join(' ');
}

function getObjectZIndex(object) {
  const value = Number(object?.zIndex);
  return Number.isFinite(value) ? value : 2;
}

function getObjectRenderPriority(object) {
  const type = String(object?.type || '').toUpperCase();
  const subType = String(object?.meta?.subType || '').toUpperCase();
  if (subType === 'POLYGON') return 0;
  if (type === 'PATH') return 1;
  if (type === 'TABLE') return 3;
  return 2;
}

function compareMapObjects(a, b) {
  const zIndexDiff = getObjectZIndex(a) - getObjectZIndex(b);
  if (zIndexDiff) return zIndexDiff;

  const priorityDiff = getObjectRenderPriority(a) - getObjectRenderPriority(b);
  if (priorityDiff) return priorityDiff;

  return (Number(a?.id) || 0) - (Number(b?.id) || 0);
}

function getPolygonFill(meta) {
  if (meta.texture === 'sand') return '#fef3c7';
  if (meta.texture === 'water') return '#bfdbfe';
  if (meta.texture === 'wood') return '#d6a766';
  if (meta.texture === 'grass') return '#bbf7d0';
  return '#e2e8f0';
}

function hasBuiltinTexture(texture) {
  return ['sand', 'water', 'wood', 'grass'].includes(String(texture || '').toLowerCase());
}

function BuiltinTexturePattern({ id, texture }) {
  switch (String(texture || '').toLowerCase()) {
    case 'grass':
      return (
        <pattern id={id} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#dcfce7" />
          <path d="M10,20 Q15,10 20,20 T30,20" stroke="#86efac" fill="none" strokeWidth="1" />
          <path d="M5,35 Q10,25 15,35 T25,35" stroke="#86efac" fill="none" strokeWidth="1" />
        </pattern>
      );
    case 'sand':
      return (
        <pattern id={id} x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <rect width="50" height="50" fill="#fef9c3" />
          <circle cx="10" cy="10" r="0.5" fill="#fde047" />
          <circle cx="30" cy="25" r="0.8" fill="#fde047" />
          <circle cx="15" cy="40" r="0.6" fill="#fde047" />
        </pattern>
      );
    case 'water':
      return (
        <pattern id={id} x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="#e0f2fe" />
          <path d="M0,20 Q15,10 30,20 T60,20" stroke="#bae6fd" fill="none" strokeWidth="2" opacity="0.5" />
          <path d="M0,45 Q15,35 30,45 T60,45" stroke="#bae6fd" fill="none" strokeWidth="2" opacity="0.5" />
        </pattern>
      );
    case 'wood':
      return (
        <pattern id={id} x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
          <rect width="100" height="20" fill="#fef3c7" />
          <line x1="0" y1="19" x2="100" y2="19" stroke="#fcd34d" strokeWidth="1" />
          <path d="M20,10 Q50,5 80,10" stroke="#f59e0b" fill="none" strokeWidth="0.5" opacity="0.2" />
        </pattern>
      );
    default:
      return null;
  }
}

function getObjectAccent(object, label) {
  const normalized = String(label || '').toLowerCase();
  if (/(sand|пісок|песок)/i.test(normalized)) return 'sand';
  if (/(sea|море)/i.test(normalized)) return 'water';
  if (/(deck|настил|wooden path|дерев'яна доріжка|деревянная дорожка)/i.test(normalized)) return 'wood';
  return '';
}

function hasBuiltinTemplate(subType) {
  return ['TREE', 'BUSH', 'UMBRELLA', 'STAGE', 'SUNBED', 'BED', 'STAIRS'].includes(String(subType || '').toUpperCase());
}

function hasRenderableObjectGraphic(object, meta, label) {
  const subType = String(meta.subType || '').toUpperCase();
  const accent = getObjectAccent(object, label);
  return Boolean(
    meta.svgUrl ||
    meta.svgCode ||
    meta.textureUrl ||
    meta.texture ||
    subType === 'POLYGON' ||
    hasBuiltinTemplate(subType) ||
    object.type === 'PATH' ||
    object.type === 'LABEL' ||
    accent
  );
}

function BuiltinObjectTemplate({ subType }) {
  switch (String(subType || '').toUpperCase()) {
    case 'TREE':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g fill="#22c55e">
            <circle cx="50" cy="50" r="40" opacity="0.6" />
            <circle cx="40" cy="40" r="20" />
            <circle cx="60" cy="45" r="25" />
            <circle cx="50" cy="65" r="20" />
          </g>
        </svg>
      );
    case 'BUSH':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g fill="#4ade80">
            <circle cx="30" cy="30" r="20" />
            <circle cx="50" cy="35" r="20" />
            <circle cx="40" cy="50" r="20" />
          </g>
        </svg>
      );
    case 'UMBRELLA':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2"><circle cx="50" cy="50" r="45" fill="#fff" /><path d="M50,5 L50,95 M5,50 L95,50 M18,18 L82,82 M18,82 L82,18" stroke="#e2e8f0" /><circle cx="50" cy="50" r="4" fill="#94a3b8" /></g>
        </svg>
      );
    case 'STAGE':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="12" y="42" width="76" height="34" rx="4" fill="#f8fafc" stroke="#94a3b8" />
            <path d="M16 70h68" />
            <path d="M22 42V24h56v18" />
            <path d="M26 30h48" stroke="#cbd5e1" />
            <path d="M32 34l8-6 8 6 8-6 8 6 8-6 8 6" stroke="#60a5fa" />
            <path d="M34 76v8M66 76v8" />
          </g>
        </svg>
      );
    case 'SUNBED':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 60L72 18" />
            <path d="M26 68L80 26" opacity="0.9" />
            <path d="M20 62h52c6 0 10 4 10 10v6H28c-6 0-10-4-10-10v-6z" />
            <path d="M30 70l-6 16M72 30l-7 17" />
            <path d="M20 62l-4 8M82 40l4 8" />
            <path d="M32 58h28" stroke="#93c5fd" strokeWidth="4" />
          </g>
        </svg>
      );
    case 'BED':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g>
            <rect x="10" y="24" width="80" height="46" rx="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <rect x="14" y="20" width="18" height="12" rx="3" fill="#e5e7eb" />
            <rect x="34" y="20" width="20" height="12" rx="3" fill="#dbeafe" />
            <rect x="56" y="20" width="18" height="12" rx="3" fill="#eef2ff" />
            <rect x="14" y="52" width="72" height="10" rx="3" fill="#f1f5f9" />
            <rect x="12" y="70" width="9" height="18" rx="2" fill="#94a3b8" />
            <rect x="79" y="70" width="9" height="18" rx="2" fill="#94a3b8" />
            <rect x="16" y="82" width="18" height="5" rx="2" fill="#cbd5e1" />
            <rect x="66" y="82" width="18" height="5" rx="2" fill="#cbd5e1" />
            <rect x="10" y="18" width="8" height="58" rx="3" fill="#d1d5db" />
          </g>
        </svg>
      );
    case 'STAIRS':
      return (
        <svg viewBox="0 0 100 100" className="interactive-map-object-svg">
          <g fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="5" y="5" width="90" height="90" /><line x1="5" y1="25" x2="95" y2="25" /><line x1="5" y1="50" x2="95" y2="50" /><line x1="5" y1="75" x2="95" y2="75" /></g>
        </svg>
      );
    default:
      return null;
  }
}

function MapObjectGraphic({ object, meta, label }) {
  const subType = String(meta.subType || '').toUpperCase();

  if (meta.svgUrl) {
    return <img src={meta.svgUrl} alt={label} className="interactive-map-object-svg" />;
  }

  if (meta.svgCode) {
    return <div className="interactive-map-object-svg" dangerouslySetInnerHTML={{ __html: meta.svgCode }} />;
  }

  if (hasBuiltinTemplate(subType)) {
    return <BuiltinObjectTemplate subType={subType} />;
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
    const safeId = String(object.id).replace(/[^a-zA-Z0-9_-]/g, '-');
    const patternId = `admin-map-texture-${safeId}`;
    const polygonPoints = pointsToSvg(points);
    const usesBuiltinPattern = !meta.textureUrl && hasBuiltinTexture(meta.texture);

    return (
      <svg className="interactive-map-object-svg" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
        {meta.textureUrl || usesBuiltinPattern ? (
          <defs>
            {meta.textureUrl ? (
              <pattern id={patternId} x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox">
                <image href={meta.textureUrl} x="0" y="0" width={object.width} height={object.height} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ) : (
              <BuiltinTexturePattern id={patternId} texture={meta.texture} />
            )}
          </defs>
        ) : null}
        <polygon
          points={polygonPoints}
          fill={meta.textureUrl || usesBuiltinPattern ? `url(#${patternId})` : getPolygonFill(meta)}
          opacity={meta.opacity}
          stroke={meta.strokeColor || '#64748b'}
          strokeWidth={meta.strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (object.type === 'PATH') {
    const pathData = meta.pathData || `M 0 0 L ${object.width} 0`;
    return (
      <svg className="interactive-map-object-svg" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
        <path d={pathData} stroke={meta.strokeColor || '#64748b'} strokeWidth={meta.strokeWidth || 4} fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  if (meta.textureUrl || meta.texture || getObjectAccent(object, label)) {
    const texture = meta.texture || getObjectAccent(object, label);
    return (
      <div
        className="interactive-map-object-svg"
        style={{
          background: meta.textureUrl ? `url(${meta.textureUrl})` : getPolygonFill({ texture }),
          opacity: meta.opacity,
          borderRadius: 4
        }}
      />
    );
  }

  if (object.type === 'LABEL') {
    return <span>{label}</span>;
  }

  return null;
}

function mapObjectLabel(object, t, language) {
  const labelStr = localizeField(object.label, language);
  if (labelStr) {
    return labelStr;
  }

  const fallback = t(`mapEditor.objectType.${object.type}`);
  return fallback && fallback !== `mapEditor.objectType.${object.type}` ? fallback : object.type || 'OBJECT';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function zoneDisplayName(zone, language) {
  return localizeField(zone?.name, language) || localizeField(zone?.name, 'ua') || localizeField(zone?.name, 'ru') || '';
}

function getZoneCodePrefix(zone, map, language) {
  const zoneText = [
    zoneDisplayName(zone, language),
    zoneDisplayName(zone, 'ua'),
    zoneDisplayName(zone, 'ru'),
    zoneDisplayName(zone, 'en')
  ].join(' ').toLowerCase();
  const mapText = [
    localizeField(map?.name, language),
    localizeField(map?.name, 'ua'),
    localizeField(map?.name, 'ru'),
    localizeField(map?.name, 'en'),
    map?.slug
  ].join(' ').toLowerCase();

  if (/(пирс|пірс|pier)/i.test(zoneText)) return 'П';
  if (/(терас|terrace)/i.test(zoneText)) return 'T';
  if (/(ресторан|restaurant|зал|hall)/i.test(zoneText)) return 'P';
  if (/(веч|ніч|ноч|night|evening|кальян|hookah)/i.test(`${zoneText} ${mapText}`)) return 'К';
  if (/(кровать|ліж|лежак|bed|sunbed|bali)/i.test(zoneText)) return 'К';

  return 'T';
}

function getZoneCodeHint(prefix) {
  switch (prefix) {
    case 'P':
      return 'P1 - ресторанний стіл 1';
    case 'T':
      return 'T1 - тераса, стіл 1';
    case 'К':
      return 'К1 - ліжко 1, у вечірній посадці кальянний столик 1';
    case 'П':
      return 'П1 - пірс 1';
    default:
      return 'Код формується за зоною';
  }
}

function getNextZoneCode(zoneId, tables, zones, map, language) {
  const numericZoneId = Number(zoneId);
  if (!Number.isInteger(numericZoneId)) return '';

  const zone = zones.find((item) => item.id === numericZoneId);
  const prefix = getZoneCodePrefix(zone, map, language);
  const matcher = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`, 'i');
  const maxNumber = tables.reduce((max, table) => {
    if (Number(table.zoneId) !== numericZoneId) return max;
    const match = String(table.code || '').trim().match(matcher);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);

  return `${prefix}${maxNumber + 1}`;
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
  const [objectActionState, setObjectActionState] = useState({ saving: false, error: '' });
  const [selectedObjectForm, setSelectedObjectForm] = useState({
    zoneId: '',
    tableId: '',
    tableCode: '',
    price: '',
    priceUnit: 'UAH',
    depositRequired: false,
    depositAmount: '',
    photoUrl: ''
  });
  const objectManagementRef = useRef(null);
  const objectPrimaryFieldRef = useRef(null);
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
  const mapRenderFrame = useMemo(() => ({
    width: mapDimensions.width + MAP_PREVIEW_GUTTER * 2,
    height: mapDimensions.height + MAP_PREVIEW_GUTTER * 2,
    offsetX: MAP_PREVIEW_GUTTER,
    offsetY: MAP_PREVIEW_GUTTER
  }), [mapDimensions.height, mapDimensions.width]);

  const [computedViewportHeight, setComputedViewportHeight] = useState('auto');

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const w = node.offsetWidth;
      if (!w) return;
      const h = w * mapDimensions.height / mapDimensions.width;
      const maxH = Math.min(window.innerHeight * 0.78, 860);
      setComputedViewportHeight(Math.max(360, Math.min(h, maxH)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [mapDimensions]);

  const { containerRef, transform, minScale, maxScale, handlers, actions } = useInteractiveMap({
    worldWidth: mapRenderFrame.width,
    worldHeight: mapRenderFrame.height,
    fitWorldWidth: mapDimensions.width,
    fitWorldHeight: mapDimensions.height,
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
      const meta = parseMetaJson(object.metaJson);
      const metaZoneId = Number(meta.zoneId);
      const zone = table ? zoneMap.get(table.zoneId) : (Number.isInteger(metaZoneId) ? zoneMap.get(metaZoneId) : null);
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
    }).sort(compareMapObjects);
  }, [state.mapData?.objects, tableMap, zoneMap]);

  const selectedTable = selectedTableId ? tableMap.get(selectedTableId) : null;
  const selectedObject = selectedObjectId ? mapEntities.find((object) => object.id === selectedObjectId) || null : null;
  const selectedObjectReservations = selectedObject?.tableId ? reservationsByTable[selectedObject.tableId] || [] : [];
  const selectedReservations = (selectedTable && reservationsByTable[selectedTable.id]) || [];
  const selectedStatus = selectedTable
    ? getTableDisplayStatus(selectedTable, reservationsByTable, heldTableIds, busyTableIds)
    : null;

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');
  const selectedFormZoneId = selectedObjectForm.zoneId ? Number(selectedObjectForm.zoneId) : null;
  const selectedFormZone = selectedFormZoneId ? zoneMap.get(selectedFormZoneId) : null;
  const selectedZonePrefix = selectedFormZone ? getZoneCodePrefix(selectedFormZone, state.mapData?.map, language) : '';
  const suggestedObjectCode = selectedFormZoneId
    ? getNextZoneCode(selectedFormZoneId, state.mapData?.tables || [], state.mapData?.zones || [], state.mapData?.map, language)
    : '';
  const objectTableOptions = useMemo(() => {
    const tables = state.mapData?.tables || [];
    if (!selectedFormZoneId) {
      return tables;
    }

    return tables.filter((table) => Number(table.zoneId) === selectedFormZoneId);
  }, [selectedFormZoneId, state.mapData?.tables]);

  useEffect(() => {
    if (!selectedObject) {
      return;
    }

    setSelectedObjectForm({
      zoneId: selectedObject.zone?.id || selectedObject.meta?.zoneId || '',
      tableId: selectedObject.tableId || '',
      tableCode: selectedObject.table?.code || selectedObject.meta?.tableCode || '',
      price: selectedObject.meta?.price ?? '',
      priceUnit: selectedObject.meta?.priceUnit || 'UAH',
      depositRequired: Boolean(selectedObject.meta?.depositRequired),
      depositAmount: selectedObject.meta?.depositAmount ?? '',
      photoUrl: selectedObject.meta?.photoUrl || ''
    });
  }, [selectedObject]);

  useEffect(() => {
    if (!selectedObjectId || !objectManagementRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      objectManagementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      objectPrimaryFieldRef.current?.focus({ preventScroll: true });
    });
  }, [selectedObjectId]);

  function handleObjectZoneChange(event) {
    const zoneId = event.target.value;
    setSelectedObjectForm((current) => {
      const currentTable = current.tableId ? tableMap.get(Number(current.tableId)) : null;
      const keepsCurrentTable = currentTable && zoneId && Number(currentTable.zoneId) === Number(zoneId);
      const nextCode = !current.tableCode || !keepsCurrentTable
        ? getNextZoneCode(zoneId, state.mapData?.tables || [], state.mapData?.zones || [], state.mapData?.map, language)
        : current.tableCode;

      return {
        ...current,
        zoneId,
        tableId: keepsCurrentTable ? current.tableId : '',
        tableCode: nextCode
      };
    });
  }

  function handleObjectTableChange(event) {
    const tableId = event.target.value;
    const table = tableId ? tableMap.get(Number(tableId)) : null;
    setSelectedObjectForm((current) => ({
      ...current,
      tableId,
      zoneId: table?.zoneId || current.zoneId,
      tableCode: table?.code || current.tableCode
    }));
  }

  const onBookTable = (table) => {
    // future booking flow callback
    console.info('booking hook', table);
  };

  const selectObject = (object) => {
    setSelectedObjectId(object.id);
    setSelectedTableId(null);
  };

  async function saveObjectChanges(nextObjects, nextTables = state.mapData?.tables || []) {
    if (!state.mapData?.map?.id) {
      return;
    }

    setObjectActionState({ saving: true, error: '' });
    const payload = {
      map: {
        width: state.mapData.map.width,
        height: state.mapData.map.height,
        backgroundImage: state.mapData.map.backgroundImage || null,
        backgroundColor: state.mapData.map.backgroundColor || null
      },
      tables: (nextTables || []).map((table) => ({
        id: table.id,
        zoneId: table.zoneId,
        code: table.code || null,
        name: table.name || null,
        photoUrl: table.photoUrl || null
      })),
      objects: nextObjects.map((object) => ({
        id: object.id,
        type: object.type,
        tableId: object.tableId || null,
        label: object.label || null,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
        zIndex: object.zIndex,
        styleJson: object.styleJson || null,
        metaJson: object.metaJson || null,
        isActive: object.isActive
      }))
    };

    const result = await apiRequest(`/api/admin/maps/${state.mapData.map.id}/editor`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!result.response.ok) {
      setObjectActionState({ saving: false, error: result.body?.message || 'Unable to save object.' });
      return;
    }

    setState((prev) => ({
      ...prev,
      mapData: {
        ...prev.mapData,
        ...result.body
      }
    }));
    setObjectActionState({ saving: false, error: '' });
  }

  function updateSelectedObject(updater) {
    if (!selectedObject) {
      return;
    }

    const nextObjects = (state.mapData?.objects || []).map((object) =>
      object.id === selectedObject.id ? updater(object) : object
    );
    saveObjectChanges(nextObjects);
  }

  function toggleSelectedObjectActive() {
    updateSelectedObject((object) => ({
      ...object,
      isActive: object.isActive === false
    }));
  }

  function toggleSelectedObjectMode() {
    updateSelectedObject((object) => {
      const meta = parseMetaJson(object.metaJson);
      return {
        ...object,
        metaJson: {
          ...(object.metaJson && typeof object.metaJson === 'object' ? object.metaJson : meta),
          interactionMode: meta.interactionMode === 'SELECTABLE' || meta.isSelectable ? 'DECOR' : 'SELECTABLE'
        }
      };
    });
  }

  function normalizeMetaValue(value) {
    if (value === '') return '';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }

  function saveSelectedObjectSettings(overrides = {}) {
    if (!selectedObject) {
      return;
    }

    const form = {
      ...selectedObjectForm,
      ...overrides
    };

    if (Object.keys(overrides).length) {
      setSelectedObjectForm(form);
    }

    const normalizedTableId = form.tableId ? Number(form.tableId) : null;
    const normalizedZoneId = form.zoneId ? Number(form.zoneId) : null;
    const normalizedTableCode = String(form.tableCode || '').trim();
    const nextTables = (state.mapData?.tables || []).map((table) => {
      if (!normalizedTableId || table.id !== normalizedTableId) {
        return table;
      }

      return {
        ...table,
        zoneId: normalizedZoneId || table.zoneId,
        code: normalizedTableCode || table.code || null
      };
    });
    const nextObjects = (state.mapData?.objects || []).map((object) => {
      if (object.id !== selectedObject.id) {
        return object;
      }

      const rawMeta = object.metaJson && typeof object.metaJson === 'object' ? object.metaJson : parseMetaJson(object.metaJson);
      return {
        ...object,
        tableId: normalizedTableId,
        metaJson: {
          ...rawMeta,
          zoneId: normalizedZoneId,
          tableCode: normalizedTableCode,
          price: normalizeMetaValue(form.price),
          priceUnit: form.priceUnit || 'UAH',
          depositRequired: Boolean(form.depositRequired),
          depositAmount: normalizeMetaValue(form.depositAmount),
          photoUrl: form.photoUrl || ''
        }
      };
    });

    saveObjectChanges(nextObjects, nextTables);
  }

  async function uploadSelectedObjectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('folder', 'map-objects');
    formData.append('image', file);
    setObjectActionState({ saving: true, error: '' });

    const result = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: formData
    });

    if (result.response.ok && result.body?.url) {
      saveSelectedObjectSettings({ photoUrl: result.body.url });
    } else {
      setObjectActionState({ saving: false, error: result.body?.message || 'Unable to upload object photo.' });
    }

    event.target.value = '';
  }

  async function updateReservationStatusOnMap(id, status) {
    const result = await apiRequest(`/api/admin/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    if (!result.response.ok) {
      setObjectActionState({ saving: false, error: result.body?.message || 'Unable to update reservation.' });
      return;
    }

    setState((prev) => ({
      ...prev,
      reservations: prev.reservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status: result.body?.reservation?.status || status } : reservation
      )
    }));
  }

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

              <div
                className="interactive-map-viewport"
                ref={containerRef}
                style={{
                  height: computedViewportHeight
                }}
                {...handlers}
              >
                <div
                  className="interactive-map-world"
                  style={{
                    width: mapRenderFrame.width,
                    height: mapRenderFrame.height,
                    backgroundColor: state.mapData.map.backgroundColor || '#eef2ff',
                    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`
                  }}
                >
                  <div
                    className="interactive-map-canvas"
                    style={{
                      backgroundColor: state.mapData.map.backgroundColor || '#eef2ff',
                      left: mapRenderFrame.offsetX,
                      top: mapRenderFrame.offsetY,
                      width: mapDimensions.width,
                      height: mapDimensions.height
                    }}
                  >
                    <div
                      className="interactive-map-background"
                      style={{
                        left: 0,
                        top: 0,
                        width: mapDimensions.width,
                        height: mapDimensions.height,
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
                        zIndex: getObjectZIndex(object)
                      };

                      if (!object.isTable) {
                        const objectLabel = mapObjectLabel(object, t, language);
                        const hasAsset = hasRenderableObjectGraphic(object, meta, objectLabel);
                        if (!hasAsset) {
                          return null;
                        }
                        return (
                          <button
                            key={object.id}
                            type="button"
                            className={`interactive-map-object manageable object-${String(object.type || 'custom').toLowerCase()} ${hasAsset ? 'has-asset' : ''} ${isSelectableObject ? 'selectable' : ''} ${selectedObjectId === object.id ? 'selected' : ''} ${object.isActive === false ? 'inactive' : ''}`.trim()}
                            style={{ ...baseStyle, ...parseStyleJson(object.styleJson) }}
                            title={objectLabel}
                            tabIndex={0}
                            onPointerDown={(event) => event.stopPropagation()}
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
                          className={`interactive-map-table ${status.toLowerCase()} ${selectedObjectId === object.id || selectedTableId === object.tableId ? 'selected' : ''}`}
                          style={{
                            ...baseStyle,
                            borderRadius: tableShape === 'ROUND' ? 999 : 12
                          }}
                          title={localizeField(object.table?.name, language) || object.table?.code || t('map.fields.table')}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => selectObject(object)}
                        >
                          <span>{object.table?.code || localizeField(object.table?.name, language) || 'T'}</span>
                        </button>
                      );
                    })}
                  </div>
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
              <div
                className="table-bottom-sheet object-management-sheet"
                ref={objectManagementRef}
                role="dialog"
                aria-live="polite"
                aria-label="Object business settings"
                tabIndex={-1}
              >
                <div className="table-sheet-head">
                  <div>
                    <span className="eyebrow">Керування позицією</span>
                    <h4>{selectedObject.table?.code || localizeField(selectedObject.table?.name, language) || selectedObject.meta?.tableCode || mapObjectLabel(selectedObject, t, language)}</h4>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedObjectId(null)}>Закрити</button>
                </div>

                <div className="object-admin-form">
                  {selectedObjectForm.photoUrl ? (
                    <div className="object-admin-photo">
                      <img src={selectedObjectForm.photoUrl} alt={mapObjectLabel(selectedObject, t, language)} />
                    </div>
                  ) : null}
                  <label>
                    Зона
                    <select
                      ref={objectPrimaryFieldRef}
                      value={selectedObjectForm.zoneId}
                      onChange={handleObjectZoneChange}
                    >
                      <option value="">Не вибрано</option>
                      {(state.mapData?.zones || []).map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zoneDisplayName(zone, language) || `Zone #${zone.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Код позиції
                    <input
                      type="text"
                      value={selectedObjectForm.tableCode}
                      placeholder={suggestedObjectCode || 'P1'}
                      onChange={(event) => setSelectedObjectForm((current) => ({ ...current, tableCode: event.target.value.toUpperCase() }))}
                    />
                    {selectedZonePrefix ? (
                      <span className="object-form-hint">
                        {getZoneCodeHint(selectedZonePrefix)}
                        {suggestedObjectCode ? ` · наступний: ${suggestedObjectCode}` : ''}
                      </span>
                    ) : null}
                  </label>
                  <label>
                    Номер столу
                    <select
                      value={selectedObjectForm.tableId}
                      onChange={handleObjectTableChange}
                    >
                      <option value="">Не прив’язано</option>
                      {objectTableOptions.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.code || localizeField(table.name, language) || `#${table.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ціна
                    <input type="number" min="0" step="1" value={selectedObjectForm.price} onChange={(event) => setSelectedObjectForm((current) => ({ ...current, price: event.target.value }))} />
                  </label>
                  <label>
                    Валюта
                    <input type="text" value={selectedObjectForm.priceUnit} onChange={(event) => setSelectedObjectForm((current) => ({ ...current, priceUnit: event.target.value }))} />
                  </label>
                  <label className="checkbox-label inline">
                    <input type="checkbox" checked={selectedObjectForm.depositRequired} onChange={(event) => setSelectedObjectForm((current) => ({ ...current, depositRequired: event.target.checked }))} />
                    Потрібна застава
                  </label>
                  <label>
                    Сума застави
                    <input type="number" min="0" step="1" value={selectedObjectForm.depositAmount} onChange={(event) => setSelectedObjectForm((current) => ({ ...current, depositAmount: event.target.value }))} />
                  </label>
                  <label className="object-admin-form-wide">
                    URL фото
                    <input type="url" value={selectedObjectForm.photoUrl} onChange={(event) => setSelectedObjectForm((current) => ({ ...current, photoUrl: event.target.value }))} />
                  </label>
                  <label className="btn btn-secondary btn-small object-upload-button">
                    Завантажити фото
                    <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={uploadSelectedObjectPhoto} />
                  </label>
                </div>

                <details className="object-admin-details">
                  <summary>Технічні дані</summary>
                  <div className="details-grid compact table-sheet-grid">
                    <div className="detail-row"><span className="muted">Тип</span><strong>{selectedObject.type || '—'}</strong></div>
                    <div className="detail-row"><span className="muted">Режим</span><strong>{selectedObject.meta?.interactionMode === 'SELECTABLE' || selectedObject.meta?.isSelectable ? 'Робочий об’єкт' : 'Декор'}</strong></div>
                    <div className="detail-row"><span className="muted">Активний</span><strong>{selectedObject.isActive === false ? 'Сховано від клієнта' : 'Видимий'}</strong></div>
                    <div className="detail-row"><span className="muted">Номер столу</span><strong>{selectedObject.table?.code || localizeField(selectedObject.table?.name, language) || 'Не прив’язано'}</strong></div>
                    <div className="detail-row"><span className="muted">Назва столу</span><strong>{localizeField(selectedObject.table?.name, language) || '—'}</strong></div>
                    <div className="detail-row"><span className="muted">SVG</span><strong>{selectedObject.meta?.svgUrl || selectedObject.meta?.svgCode ? 'Додано' : 'Немає'}</strong></div>
                    <div className="detail-row"><span className="muted">Ціна</span><strong>{selectedObject.meta?.price !== '' && selectedObject.meta?.price !== null && selectedObject.meta?.price !== undefined ? `${selectedObject.meta.price} ${selectedObject.meta?.priceUnit || 'UAH'}` : 'Не задано'}</strong></div>
                  </div>
                </details>

                {selectedObjectReservations.length ? (
                  <details className="object-reservation-list">
                    <summary>Пов’язані бронювання ({selectedObjectReservations.length})</summary>
                    <ul className="plain-list compact">
                      {selectedObjectReservations.slice(0, 5).map((reservation) => (
                        <li key={reservation.id}>
                          <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link> • {reservation.customerName || t('common.guest')} •{' '}
                          {formatDate(reservation.reservationDate, dateLocale)} {formatTime(reservation.timeFrom, dateLocale)} • <StatusPill status={reservation.status} />
                          <span className="reservation-inline-actions">
                            {reservation.status === 'PENDING' ? (
                              <>
                                <button type="button" className="btn btn-small" onClick={() => updateReservationStatusOnMap(reservation.id, 'CONFIRMED')}>Confirm</button>
                                <button type="button" className="btn btn-small btn-danger" onClick={() => updateReservationStatusOnMap(reservation.id, 'CANCELLED')}>Cancel</button>
                              </>
                            ) : null}
                            {reservation.status === 'CONFIRMED' ? (
                              <>
                                <button type="button" className="btn btn-small btn-success" onClick={() => updateReservationStatusOnMap(reservation.id, 'COMPLETED')}>Complete</button>
                                <button type="button" className="btn btn-small btn-danger" onClick={() => updateReservationStatusOnMap(reservation.id, 'CANCELLED')}>Cancel</button>
                              </>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {objectActionState.error ? <p className="error">{objectActionState.error}</p> : null}
                <div className="actions">
                  <button type="button" className="btn btn-primary" onClick={saveSelectedObjectSettings} disabled={objectActionState.saving}>
                    Зберегти налаштування
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={toggleSelectedObjectActive} disabled={objectActionState.saving}>
                    {selectedObject.isActive === false ? 'Показати клієнту' : 'Сховати від клієнта'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={toggleSelectedObjectMode} disabled={objectActionState.saving}>
                    {selectedObject.meta?.interactionMode === 'SELECTABLE' || selectedObject.meta?.isSelectable ? 'Зробити декором' : 'Зробити клікабельним'}
                  </button>
                  <button type="button" className="btn" onClick={() => window.location.assign('/admin/map-editor')}>
                    Відкрити редактор
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
