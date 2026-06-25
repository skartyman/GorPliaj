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

function getRoundedTimeKey(value = new Date()) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + 30);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return getTimeKey(date);
}

function getPositionDisplayName(table, language, fallback = '—') {
  return localizeField(table?.serviceName, language) || table?.code || localizeField(table?.name, language) || fallback;
}

function getBookingKindBadgeLabel(bookingKind, language) {
  if (bookingKind === 'BEACH') {
    return language === 'en' ? 'Beach' : (language === 'ru' ? 'Пляж' : 'Пляж');
  }

  return language === 'en' ? 'Table' : (language === 'ru' ? 'Стол' : 'Стіл');
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

function expandBounds(bounds, object) {
  const x = Number(object?.x) || 0;
  const y = Number(object?.y) || 0;
  const width = Math.max(Number(object?.width) || 0, 1);
  const height = Math.max(Number(object?.height) || 0, 1);
  const maxX = x + width;
  const maxY = y + height;

  if (!bounds) {
    return { minX: x, minY: y, maxX, maxY };
  }

  return {
    minX: Math.min(bounds.minX, x),
    minY: Math.min(bounds.minY, y),
    maxX: Math.max(bounds.maxX, maxX),
    maxY: Math.max(bounds.maxY, maxY)
  };
}

function padBounds(bounds, mapDimensions, padding = 96) {
  if (!bounds) {
    return null;
  }

  const minX = Math.max(0, bounds.minX - padding);
  const minY = Math.max(0, bounds.minY - padding);
  const maxX = Math.min(mapDimensions.width, bounds.maxX + padding);
  const maxY = Math.min(mapDimensions.height, bounds.maxY + padding);

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 80),
    height: Math.max(maxY - minY, 80)
  };
}

function parseZoneViewport(value, mapDimensions) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const x = Math.max(0, Number(value.x) || 0);
  const y = Math.max(0, Number(value.y) || 0);
  const width = Math.min(Math.max(Number(value.width) || 0, 1), Math.max(mapDimensions.width - x, 1));
  const height = Math.min(Math.max(Number(value.height) || 0, 1), Math.max(mapDimensions.height - y, 1));

  return width > 1 && height > 1 ? { x, y, width, height } : null;
}

function parseZonePolygonBounds(value, mapDimensions) {
  const points = Array.isArray(value?.points) ? value.points : [];
  if (points.length < 3) {
    return null;
  }

  const normalized = points.map((point) => ({
    x: Math.max(Number(point?.x) || 0, 0),
    y: Math.max(Number(point?.y) || 0, 0)
  }));
  const minX = Math.min(...normalized.map((point) => point.x));
  const minY = Math.min(...normalized.map((point) => point.y));
  const maxX = Math.max(...normalized.map((point) => point.x));
  const maxY = Math.max(...normalized.map((point) => point.y));

  return padBounds({ minX, minY, maxX, maxY }, mapDimensions);
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
    case 'dark_wood':
      return (
        <pattern id={id} x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
          <rect width="100" height="20" fill="#3E2723" />
          <line x1="0" y1="19" x2="100" y2="19" stroke="#5D4037" strokeWidth="1" />
          <path d="M20,10 Q50,5 80,10" stroke="#4E342E" fill="none" strokeWidth="0.5" opacity="0.3" />
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

function formatCountdown(reservation) {
  if (!reservation?.timeFrom) return '';
  const [h, m] = reservation.timeFrom.split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return '00:00';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ReservationCountdown({ reservation, className = 'table-countdown', style }) {
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(reservation));

  useEffect(() => {
    setTimeLeft(formatCountdown(reservation));
    const interval = setInterval(() => {
      setTimeLeft(formatCountdown(reservation));
    }, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  if (!timeLeft || timeLeft === '00:00') return null;
  return (
    <span className={className} style={style}>
      {timeLeft}
    </span>
  );
}

export default function MapPage() {
  console.log('[MAP] MapPage rendered', performance.now().toFixed(0));
  const [state, setState] = useState({
    loading: true,
    error: '',
    maps: [],
    mapData: null,
    reservations: [],
    availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
  });
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getDateKey());
  const [qrTicketCode, setQrTicketCode] = useState('');
  const [qrResult, setQrResult] = useState(null);
  const [activeZoneFocusId, setActiveZoneFocusId] = useState('all');
  const [objectActionState, setObjectActionState] = useState({ saving: false, error: '' });
  const [bookingFormState, setBookingFormState] = useState({
    open: false,
    saving: false,
    error: '',
    success: '',
    form: null
  });
  const [selectedObjectForm, setSelectedObjectForm] = useState({
    zoneId: '',
    tableId: '',
    tableCode: '',
    price: '',
    priceUnit: 'UAH',
    depositRequired: false,
    depositAmount: '',
    seatsMin: 1,
    seatsMax: 4,
    isBookable: true,
    photoUrl: ''
  });
  const objectManagementRef = useRef(null);
  const objectPrimaryFieldRef = useRef(null);
  const loadMapDataRef = useRef();
  const { t, language } = useAdminI18n();

  useEffect(() => {
    async function loadAvailableMaps() {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: ''
      }));

      const mapsResult = await apiRequest('/api/admin/maps');
      if (!mapsResult.response.ok) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: mapsResult.body?.message || t('map.errors.load'),
          maps: [],
          mapData: null,
          reservations: [],
          availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
        }));
        return;
      }

      const maps = Array.isArray(mapsResult.body?.maps) ? mapsResult.body.maps : [];
      const preferredMap = maps.find((item) => item.isDefault) || maps[0] || null;

      setState((prev) => ({
        ...prev,
        maps,
        loading: Boolean(preferredMap),
        error: preferredMap ? '' : t('map.errors.load'),
        mapData: preferredMap ? prev.mapData : null,
        reservations: preferredMap ? prev.reservations : [],
        availability: preferredMap ? prev.availability : { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      }));
      setSelectedMapId(preferredMap?.id ? Number(preferredMap.id) : null);
    }

    loadAvailableMaps().catch(() => {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: t('map.errors.load'),
        maps: [],
        mapData: null,
        reservations: [],
        availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      }));
    });
  }, []);

  async function loadMapData() {
    if (!selectedMapId) return;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const [mapResult, reservationsResult, availabilityResult] = await Promise.all([
      apiRequest(`/api/maps/${selectedMapId}`),
      apiRequest('/api/admin/reservations'),
      apiRequest(`/api/maps/${selectedMapId}/availability?date=${selectedDate}&timeFrom=${getTimeKey(new Date())}`)
    ]);
    if (!mapResult.response.ok) {
      setState((prev) => ({ ...prev, loading: false, error: mapResult.body?.message || t('map.errors.load'), mapData: null, reservations: [], availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] } }));
      return;
    }
    setState((prev) => ({
      ...prev,
      loading: false,
      error: '',
      mapData: mapResult.body,
      reservations: reservationsResult.response.ok && Array.isArray(reservationsResult.body) ? reservationsResult.body : [],
      availability: availabilityResult.response.ok && availabilityResult.body ? availabilityResult.body : { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
    }));
  }

  loadMapDataRef.current = loadMapData;

  useEffect(() => {
    loadMapData().catch(() => {
      setState((prev) => ({ ...prev, loading: false, error: t('map.errors.load'), mapData: null, reservations: [], availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] } }));
    });
  }, [selectedMapId, selectedDate]);



  useEffect(() => {
    function globalClick(e) { console.log('[MAP] GLOBAL CLICK', e.target.tagName, e.target.className); }
    document.addEventListener('click', globalClick, true);
    return () => document.removeEventListener('click', globalClick, true);
  }, []);

  async function handleFreeTableArrive(table) {
    if (!table) return;
    const result = await apiRequest(`/api/admin/tables/${table.id}/arrive`, { method: 'POST' });
    if (result.response.ok) {
      loadMapData();
    } else {
      alert(result.body?.message || 'Помилка');
    }
  }

  async function handleQRArrive() {
    const code = qrTicketCode.trim();
    if (!code) return;
    setQrResult({ type: 'loading', message: 'Перевіряємо...' });
    const result = await apiRequest(`/api/admin/reservations/arrive-by-ticket/${encodeURIComponent(code)}`, { method: 'POST' });
    if (result.response.ok) {
      setQrResult({ type: 'success', message: 'Гостя відмічено!' });
      setQrTicketCode('');
      loadMapData();
    } else {
      setQrResult({ type: 'error', message: result.body?.message || 'Не вдалося відмітити гостя' });
    }
  }

  const mapDimensions = useMemo(() => ({
    width: state.mapData?.map?.width || 1200,
    height: state.mapData?.map?.height || 760
  }), [state.mapData?.map?.width, state.mapData?.map?.height]);
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

    state.reservations.forEach((reservation) => {
      if (String(reservation.reservationDate).slice(0, 10) !== selectedDate || !reservation.table?.id) {
        return;
      }

      if (!grouped[reservation.table.id]) {
        grouped[reservation.table.id] = [];
      }
      grouped[reservation.table.id].push(reservation);
    });

    return grouped;
  }, [state.reservations, selectedDate]);

  const heldTableIds = useMemo(() => new Set(state.availability.heldTableIds || []), [state.availability.heldTableIds]);
  const busyTableIds = useMemo(() => new Set(state.availability.busyTableIds || []), [state.availability.busyTableIds]);

  const mapEntities = useMemo(() => {
    const objects = state.mapData?.objects || [];

    // Find all tableIds that are represented by non-TABLE objects (e.g. CUSTOM, DECOR graphics)
    const customRepresentedTableIds = new Set(
      objects
        .filter((obj) => obj.type !== 'TABLE' && obj.tableId)
        .map((obj) => obj.tableId)
    );

    // Filter out TABLE objects that are already represented by custom graphics
    const filteredObjects = objects.filter((obj) => {
      if (obj.type === 'TABLE' && obj.tableId && customRepresentedTableIds.has(obj.tableId)) {
        return false; // Skip this duplicate table button
      }
      return true;
    });

    return filteredObjects.map((object) => {
      const isTable = object.type === 'TABLE';
      const table = object.tableId ? tableMap.get(object.tableId) : null;
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

  const zoneFocusItems = useMemo(() => {
    const zones = state.mapData?.zones || [];
    if (!zones.length || !mapEntities.length) {
      return [];
    }

    const boundsByZoneId = new Map();
    mapEntities.forEach((object) => {
      const zoneId = object.zone?.id || object.table?.zoneId || object.meta?.zoneId;
      if (!zoneId) {
        return;
      }

      boundsByZoneId.set(zoneId, expandBounds(boundsByZoneId.get(zoneId), object));
    });

    return zones
      .map((zone) => {
        const bounds =
          parseZonePolygonBounds(zone.polygonJson, mapDimensions) ||
          parseZoneViewport(zone.viewportJson, mapDimensions) ||
          padBounds(boundsByZoneId.get(zone.id), mapDimensions);
        if (!bounds) {
          return null;
        }

        return {
          zone,
          bounds: {
            x: bounds.x + mapRenderFrame.offsetX,
            y: bounds.y + mapRenderFrame.offsetY,
            width: bounds.width,
            height: bounds.height
          }
        };
      })
      .filter(Boolean);
  }, [mapDimensions, mapEntities, mapRenderFrame.offsetX, mapRenderFrame.offsetY, state.mapData?.zones]);

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
      depositRequired: Number(selectedObject.table?.deposit || selectedObject.meta?.depositAmount || 0) > 0,
      depositAmount: selectedObject.table?.deposit ?? selectedObject.meta?.depositAmount ?? '',
      seatsMin: selectedObject.table?.seatsMin ?? 1,
      seatsMax: selectedObject.table?.seatsMax ?? 4,
      isBookable: selectedObject.table?.isBookable ?? true,
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

  function buildBookingForm(table) {
    return {
      tableId: table.id,
      mapId: state.mapData?.map?.id || table.mapId || '',
      zoneId: table.zoneId || '',
      bookingKind: table.bookingKind || 'TABLE',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      guests: table.seatsMin || 1,
      reservationDate: getDateKey(),
      timeFrom: getRoundedTimeKey(),
      timeTo: '',
      source: 'WALK_IN',
      status: 'PENDING',
      commentCustomer: '',
      commentAdmin: '',
      depositRequired: Number(table.deposit || 0) > 0,
      depositAmount: Number(table.deposit || 0) > 0 ? Number(table.deposit || 0) : '',
      paidInCash: false
    };
  }

  const onBookTable = (table) => {
    if (!table) {
      return;
    }

    setBookingFormState({
      open: true,
      saving: false,
      error: '',
      success: '',
      form: buildBookingForm(table)
    });
  };

  function closeBookingForm() {
    setBookingFormState((current) => ({
      ...current,
      open: false,
      saving: false,
      error: '',
      success: ''
    }));
  }

  function updateBookingForm(field, value) {
    setBookingFormState((current) => ({
      ...current,
      error: '',
      success: '',
      form: {
        ...(current.form || {}),
        [field]: value
      }
    }));
  }

  function focusWholeMap() {
    console.log('[MAP] focusWholeMap clicked');
    setActiveZoneFocusId('all');
    actions.fitToView();
  }

  function focusZone(zoneId, bounds) {
    setActiveZoneFocusId(String(zoneId));
    actions.focusRect(bounds);
  }

  function handleMapSelect(nextMapId) {
    const normalizedMapId = Number(nextMapId);
    if (!Number.isInteger(normalizedMapId) || normalizedMapId <= 0 || normalizedMapId === Number(selectedMapId)) {
      return;
    }

    setSelectedMapId(normalizedMapId);
    setSelectedTableId(null);
    setSelectedObjectId(null);
    setActiveZoneFocusId('all');
    setObjectActionState({ saving: false, error: '' });
    setBookingFormState({
      open: false,
      saving: false,
      error: '',
      success: '',
      form: null
    });
  }

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
        photoUrl: table.photoUrl || null,
        seatsMin: table.seatsMin ?? 1,
        seatsMax: table.seatsMax ?? 4,
        deposit: table.deposit ?? 0,
        isActive: table.isActive ?? true,
        isBookable: table.isBookable ?? true
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
        code: normalizedTableCode || table.code || null,
        seatsMin: Number(form.seatsMin) || table.seatsMin || 1,
        seatsMax: Number(form.seatsMax) || table.seatsMax || 4,
        deposit: form.depositRequired ? Math.max(0, Number(form.depositAmount) || 0) : 0,
        isBookable: Boolean(form.isBookable)
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
    loadMapData();
  }

  async function submitBookingForm(event) {
    event.preventDefault();

    if (!bookingFormState.form) {
      return;
    }

    setBookingFormState((current) => ({
      ...current,
      saving: true,
      error: '',
      success: ''
    }));

    const payload = {
      ...bookingFormState.form,
      guests: Number(bookingFormState.form.guests),
      depositRequired: Boolean(bookingFormState.form.depositRequired),
      depositAmount: bookingFormState.form.depositRequired ? Number(bookingFormState.form.depositAmount || 0) : 0,
      paidInCash: Boolean(bookingFormState.form.paidInCash)
    };

    const result = await apiRequest('/api/admin/reservations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!result.response.ok) {
      setBookingFormState((current) => ({
        ...current,
        saving: false,
        error: result.body?.message || 'Unable to create reservation.'
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      reservations: result.body?.reservation ? [result.body.reservation, ...prev.reservations] : prev.reservations
    }));

    setBookingFormState((current) => ({
      ...current,
      saving: false,
      success: 'Бронь створено.',
      open: false
    }));
    loadMapData();
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
          </div>
        </section>

        {state.loading ? <div className="map-state">{t('map.loading')}</div> : null}
        {state.error ? <div className="map-state error">{state.error}</div> : null}

        {!state.loading && !state.error && !state.mapData?.map ? (
          <div className="map-state muted">Map is empty. Add map data in editor.</div>
        ) : null}

        {!state.loading && !state.error && state.mapData?.map ? (
          <>
            <div className="map-header-controls">
              <input
                type="date"
                className="map-date-picker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button type="button" className="btn" onClick={() => loadMapDataRef.current()}>
                Оновити
              </button>
              <div className="qr-search">
                <input
                  type="text"
                  placeholder="Код квитка"
                  value={qrTicketCode}
                  onChange={(e) => setQrTicketCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQRArrive(); }}
                />
                <button type="button" className="btn" onClick={handleQRArrive}>Scan QR</button>
              </div>
            </div>

            {qrResult ? (
              <div className={`qr-result ${qrResult.type}`}>
                {qrResult.type === 'loading' ? '⏳' : null}
                {qrResult.type === 'success' ? '✅' : null}
                {qrResult.type === 'error' ? '❌' : null}
                {' '}{qrResult.message}
                <button type="button" className="btn btn-small" onClick={() => setQrResult(null)} style={{ marginLeft: 8 }}>✕</button>
              </div>
            ) : null}

            <div className="map-stats">
              <span className="stat free">Вільно: {state.availability.freeTableIds?.length ?? 0}</span>
              <span className="stat pending">Очікує: {state.availability.heldTableIds?.length ?? 0}</span>
              <span className="stat confirmed">Підтв.: {(state.availability.busyTableIds?.length ?? 0) - (state.availability.heldTableIds?.length ?? 0)}</span>
              <span className="stat total">Всього: {state.mapData.tables?.length ?? 0}</span>
            </div>

            {state.maps.length > 1 ? (
              <div className="map-variant-tabs" aria-label="Map variants">
                {state.maps.map((mapItem) => (
                  <button
                    key={mapItem.id}
                    type="button"
                    className={`map-variant-tab ${Number(selectedMapId) === Number(mapItem.id) ? 'active' : ''}`}
                    onClick={() => handleMapSelect(mapItem.id)}
                    aria-pressed={Number(selectedMapId) === Number(mapItem.id)}
                  >
                    {localizeField(mapItem.name, language) || mapItem.slug || `Map #${mapItem.id}`}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="interactive-map-shell">
              {zoneFocusItems.length ? (
                <div className="interactive-map-zone-tabs" aria-label="Map zones">
                  <button
                    type="button"
                    className={`map-zone-tab ${activeZoneFocusId === 'all' ? 'active' : ''}`}
                    onClick={focusWholeMap}
                    aria-pressed={activeZoneFocusId === 'all'}
                  >
                    Вся карта
                  </button>
                  {zoneFocusItems.map(({ zone, bounds }) => (
                    <button
                      key={zone.id}
                      type="button"
                      className={`map-zone-tab ${activeZoneFocusId === String(zone.id) ? 'active' : ''}`}
                      onClick={() => focusZone(zone.id, bounds)}
                      aria-pressed={activeZoneFocusId === String(zone.id)}
                    >
                      {zoneDisplayName(zone, language) || `Zone #${zone.id}`}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="interactive-map-controls">
                <button type="button" className="map-control" onClick={() => { console.log('[MAP] zoom+'); actions.zoomIn(); }} aria-label="Zoom in">+</button>
                <button type="button" className="map-control" onClick={() => { console.log('[MAP] zoom-'); actions.zoomOut(); }} aria-label="Zoom out">−</button>
                <button type="button" className="map-control fit" onClick={() => { console.log('[MAP] fit'); focusWholeMap(); }} aria-label="Fit map">⤢</button>
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

                        const isBookable = !!object.tableId;
                        const status = isBookable
                          ? getTableDisplayStatus(object.table, reservationsByTable, heldTableIds, busyTableIds)
                          : null;
                        const activeReservation = isBookable
                          ? (reservationsByTable[object.table?.id] || []).find((r) => ['CONFIRMED', 'AWAITING_PAYMENT', 'PENDING'].includes(r.status))
                          : null;
                        const isSelected = isBookable && (selectedObjectId === object.id || selectedTableId === object.tableId);

                        const classNames = [
                          'interactive-map-object',
                          hasAsset ? 'has-asset' : '',
                          object.isActive === false ? 'inactive' : '',
                          isBookable ? 'selectable' : '',
                          isBookable ? status.toLowerCase() : '',
                          isSelected ? 'selected' : ''
                        ].filter(Boolean).join(' ');

                        return (
                          <div
                            key={object.id}
                            role={isBookable ? 'button' : undefined}
                            tabIndex={isBookable ? 0 : undefined}
                            className={classNames}
                            style={{ ...baseStyle, ...parseStyleJson(object.styleJson) }}
                            title={objectLabel}
                            onPointerDown={isBookable ? (event) => {
                              console.log('[MAP] object pdown', object.tableId);
                              event.stopPropagation();
                            } : undefined}
                            onClick={isBookable ? () => {
                              console.log('[MAP] object click', object.tableId);
                              setSelectedTableId(object.tableId);
                              setSelectedObjectId(null);
                            } : undefined}
                          >
                            <MapObjectGraphic object={object} meta={meta} label={objectLabel} />
                            {isBookable && (
                              <div className={`object-status-badge ${status.toLowerCase()}`}>
                                <span className="object-code-text">{object.table?.code || '—'}</span>
                                {status !== 'FREE' && status !== 'UNAVAILABLE' && activeReservation ? (
                                  <ReservationCountdown reservation={activeReservation} className="object-countdown" />
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const status = getTableDisplayStatus(object.table, reservationsByTable, heldTableIds, busyTableIds);
                      const tableShape = String(object.table?.shape || 'ROUND').toUpperCase();
                      const activeReservation = (reservationsByTable[object.table?.id] || []).find((r) => ['CONFIRMED', 'AWAITING_PAYMENT', 'PENDING'].includes(r.status));

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
                          onPointerDown={(event) => { console.log('[MAP] table pdown', object.tableId); event.stopPropagation(); }}
                          onClick={() => { console.log('[MAP] table click', object.tableId); setSelectedTableId(object.tableId); setSelectedObjectId(null); }}
                        >
                          <span>{object.table?.code || localizeField(object.table?.name, language) || 'T'}</span>
                          {status !== 'FREE' && status !== 'UNAVAILABLE' && activeReservation ? (
                            <ReservationCountdown reservation={activeReservation} />
                          ) : null}
                          {status === 'FREE' ? (
                            <span
                              className="table-arrive-btn"
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); handleFreeTableArrive(object.table); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleFreeTableArrive(object.table); } }}
                            >
                              Гості прийшли
                            </span>
                          ) : null}
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
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedTableId(null)}>{t('map.fields.close')}</button>
                </div>

                <div className="details-grid compact table-sheet-grid">
                  <div className="detail-row"><span className="muted">{t('map.fields.code')}</span><strong>{selectedTable.code || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">{t('map.fields.capacity')}</span><strong>{selectedTable.seatsMin || '—'}-{selectedTable.seatsMax || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">{t('map.fields.deposit')}</span><strong>{selectedTable.deposit || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">{t('map.fields.zone')}</span><strong>{localizeField(zoneMap.get(selectedTable.zoneId)?.name, language) || '—'}</strong></div>
                  <div className="detail-row"><span className="muted">{t('map.fields.status')}</span><strong><StatusPill status={selectedStatus} /></strong></div>
                </div>

                {selectedStatus === 'FREE' ? (
                  <div className="actions">
                    <button type="button" className="btn" onClick={() => handleFreeTableArrive(selectedTable)}>Гості прийшли</button>
                    <button type="button" className="btn" onClick={() => onBookTable(selectedTable)}>Створити бронь</button>
                  </div>
                ) : null}

                {!selectedReservations.length ? <p className="muted">{t('map.noActiveReservations')}</p> : null}
                {selectedReservations.length ? (
                  <ul className="plain-list compact">
                    {selectedReservations.slice(0, 5).map((reservation) => (
                      <li key={reservation.id}>
                        <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link> • {reservation.customerName || t('common.guest')} •{' '}
                        {formatDate(reservation.reservationDate, dateLocale)} {formatTime(reservation.timeFrom, dateLocale)} • <StatusPill status={reservation.status} />
                        {reservation.status !== 'COMPLETED' && reservation.status !== 'CANCELLED' ? (
                          <ReservationCountdown reservation={reservation} style={{ position: 'static', display: 'inline-block', marginLeft: 6 }} />
                        ) : null}
                        {reservation.paidInCash ? <span className="paid-cash-badge" style={{ marginLeft: 6 }}>Готівка</span> : null}
                        <span className="reservation-inline-actions">
                          {reservation.status === 'PENDING' ? (
                            <>
                              <button type="button" className="btn btn-small" onClick={() => updateReservationStatusOnMap(reservation.id, 'CONFIRMED')}>Confirm</button>
                              <button type="button" className="btn btn-small btn-danger" onClick={() => updateReservationStatusOnMap(reservation.id, 'CANCELLED')}>Cancel</button>
                            </>
                          ) : null}
                          {reservation.status === 'CONFIRMED' ? (
                            <>
                              <button type="button" className="btn btn-small btn-success" onClick={() => updateReservationStatusOnMap(reservation.id, 'COMPLETED')}>Прийшли</button>
                              <button type="button" className="btn btn-small btn-danger" onClick={() => updateReservationStatusOnMap(reservation.id, 'CANCELLED')}>Cancel</button>
                            </>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {bookingFormState.error ? <p className="error">{bookingFormState.error}</p> : null}
                {bookingFormState.success ? <p className="success-message">{bookingFormState.success}</p> : null}

                {bookingFormState.open && bookingFormState.form?.tableId === selectedTable.id ? (
                  <form className="object-admin-form booking-admin-form" onSubmit={submitBookingForm}>
                    <label>
                      Ім'я гостя
                      <input type="text" required value={bookingFormState.form.customerName} onChange={(event) => updateBookingForm('customerName', event.target.value)} />
                    </label>
                    <label>
                      Телефон
                      <input type="text" required value={bookingFormState.form.customerPhone} onChange={(event) => updateBookingForm('customerPhone', event.target.value)} />
                    </label>
                    <label>
                      Email
                      <input type="email" value={bookingFormState.form.customerEmail} onChange={(event) => updateBookingForm('customerEmail', event.target.value)} />
                    </label>
                    <label>
                      Гостей
                      <input type="number" min={selectedTable.seatsMin || 1} max={selectedTable.seatsMax || 99} required value={bookingFormState.form.guests} onChange={(event) => updateBookingForm('guests', event.target.value)} />
                    </label>
                    <label>
                      Дата
                      <input type="date" required value={bookingFormState.form.reservationDate} onChange={(event) => updateBookingForm('reservationDate', event.target.value)} />
                    </label>
                    <label>
                      Початок
                      <input type="time" required value={bookingFormState.form.timeFrom} onChange={(event) => updateBookingForm('timeFrom', event.target.value)} />
                    </label>
                    <label>
                      Кінець
                      <input type="time" value={bookingFormState.form.timeTo} onChange={(event) => updateBookingForm('timeTo', event.target.value)} />
                    </label>
                    <label>
                      Джерело
                      <select value={bookingFormState.form.source} onChange={(event) => updateBookingForm('source', event.target.value)}>
                        <option value="WALK_IN">Walk-in</option>
                        <option value="PHONE">Phone</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="WEB">Web</option>
                      </select>
                    </label>
                    <label>
                      Статус
                      <select value={bookingFormState.form.status} onChange={(event) => updateBookingForm('status', event.target.value)}>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                      </select>
                    </label>
                    <label className="checkbox-label inline">
                      <input type="checkbox" checked={Boolean(bookingFormState.form.depositRequired)} onChange={(event) => updateBookingForm('depositRequired', event.target.checked)} />
                      Є депозит
                    </label>
                    <label>
                      Сума депозиту
                      <input type="number" min="0" step="1" disabled={!bookingFormState.form.depositRequired} value={bookingFormState.form.depositAmount} onChange={(event) => updateBookingForm('depositAmount', event.target.value)} />
                    </label>
                    <label className="checkbox-label inline">
                      <input type="checkbox" checked={Boolean(bookingFormState.form.paidInCash)} onChange={(event) => updateBookingForm('paidInCash', event.target.checked)} />
                      Гість платить готівкою
                    </label>
                    <label className="object-admin-form-wide">
                      Коментар гостя
                      <textarea rows="3" value={bookingFormState.form.commentCustomer} onChange={(event) => updateBookingForm('commentCustomer', event.target.value)} />
                    </label>
                    <label className="object-admin-form-wide">
                      Коментар адміністратора
                      <textarea rows="3" value={bookingFormState.form.commentAdmin} onChange={(event) => updateBookingForm('commentAdmin', event.target.value)} />
                    </label>
                    <div className="actions booking-admin-actions object-admin-form-wide">
                      <button type="button" className="btn btn-secondary" onClick={closeBookingForm}>Скасувати</button>
                      <button type="submit" className="btn" disabled={bookingFormState.saving}>
                        {bookingFormState.saving ? 'Зберігаємо...' : 'Створити бронь'}
                      </button>
                    </div>
                  </form>
                ) : !bookingFormState.open ? (
                  <div className="actions">
                    <button type="button" className="btn" onClick={() => onBookTable(selectedTable)}>Створити бронь</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
