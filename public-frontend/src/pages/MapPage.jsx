import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { holdsApi, mapApi } from '../lib/api';
import { clamp, clampTranslate, getInitialViewTransform, getObjectCenter, getPublicMapData, zoomAroundViewportPoint } from '../lib/map';
import { localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

const MAP_PADDING = 24;
const MAP_PREVIEW_GUTTER = 240;
const PINCH_SENSITIVITY = 0.006;
const DEFAULT_BED_ASSET_URL = 'https://pub-6d1f04082d9e4584a48596bdac463b42.r2.dev/menu/1778407987243-d869a9bf9505fca824818b2d.png';
const STATIC_TYPE_ACCENTS = {
  BAR: 'bar',
  STAGE: 'stage',
  ENTRANCE: 'entrance',
  WC: 'wc',
  LABEL: 'label',
  DECOR: 'decor',
  STAIRS: 'stairs',
  PATH: 'path'
};

function parseStyleJson(styleJson) {
  if (!styleJson) return {};
  try {
    const style = typeof styleJson === 'string' ? JSON.parse(styleJson) : styleJson;
    return {
      background: typeof style?.background === 'string' ? style.background : undefined,
      borderColor: typeof style?.borderColor === 'string' ? style.borderColor : undefined,
      color: typeof style?.color === 'string' ? style.color : undefined,
      borderRadius: Number.isFinite(style?.borderRadius) ? `${style.borderRadius}px` : undefined,
      opacity: Number.isFinite(style?.opacity) ? Math.max(0.2, Math.min(1, style.opacity)) : undefined,
      fontSize: Number.isFinite(style?.fontSize) ? style.fontSize : undefined,
      textAlign: typeof style?.textAlign === 'string' ? style.textAlign : undefined,
      containerPadding: Number.isFinite(style?.containerPadding) ? style.containerPadding : undefined,
      lineColor: typeof style?.lineColor === 'string' ? style.lineColor : undefined,
      annotationLine: style?.annotationLine && typeof style.annotationLine === 'object' ? style.annotationLine : undefined
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
      photoUrl: typeof parsed.photoUrl === 'string' ? parsed.photoUrl : ''
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

function getObjectRenderPriority(object, meta = parseMetaJson(object?.metaJson)) {
  const type = String(object?.type || '').toUpperCase();
  const subType = String(meta?.subType || '').toUpperCase();
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

const POSITION_TYPE_LABELS = {
  TABLE: { ua: 'Стіл', ru: 'Стол', en: 'Table' },
  SUNBED: { ua: 'Шезлонг', ru: 'Шезлонг', en: 'Sunbed' },
  BUNGALOW: { ua: 'Бунгало', ru: 'Бунгало', en: 'Bungalow' },
  KROVAT: { ua: 'Ліжко', ru: 'Кровать', en: 'Daybed' },
  PIER: { ua: 'Пірс', ru: 'Пирс', en: 'Pier' },
  RESTAURANT: { ua: 'Ресторан', ru: 'Ресторан', en: 'Restaurant' },
  TERRACE: { ua: 'Тераса', ru: 'Терраса', en: 'Terrace' }
};

function positionTypeLabel(value, locale) {
  const type = String(value || '').toUpperCase();
  const label = POSITION_TYPE_LABELS[type];
  if (label) return localizeField(label, locale);
  return type;
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

function zoneDisplayName(zone, locale) {
  return localizeField(zone?.name, locale) || localizeField(zone?.name, 'ua') || '';
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
  if (String(object.type || '').toUpperCase() === 'TABLE') return 'table';
  const normalized = String(label || '').toLowerCase();
  if (/(sand|пісок|песок)/i.test(normalized)) return 'sand';
  if (/(sea|море)/i.test(normalized)) return 'sea';
  if (/(deck|настил)/i.test(normalized)) return 'deck';
  if (/(wooden path|дерев'яна доріжка|деревянная дорожка)/i.test(normalized)) return 'path';
  return STATIC_TYPE_ACCENTS[String(object.type || '').toUpperCase()] || 'static';
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
    object.type === 'TEXT' ||
    accent
  );
}

function isSelectableMapObject(object, meta) {
  return object?.isActive !== false && (meta.interactionMode === 'SELECTABLE' || meta.isSelectable);
}

function resolveAccentTexture(accent) {
  if (accent === 'sand') return 'sand';
  if (accent === 'sea') return 'water';
  if (accent === 'deck' || accent === 'path') return 'wood';
  return '';
}

function BuiltinObjectTemplate({ subType }) {
  switch (String(subType || '').toUpperCase()) {
    case 'TREE':
      return (
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
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
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
          <g fill="#4ade80">
            <circle cx="30" cy="30" r="20" />
            <circle cx="50" cy="35" r="20" />
            <circle cx="40" cy="50" r="20" />
          </g>
        </svg>
      );
    case 'UMBRELLA':
      return (
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
          <g fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2"><circle cx="50" cy="50" r="45" fill="#fff" /><path d="M50,5 L50,95 M5,50 L95,50 M18,18 L82,82 M18,82 L82,18" stroke="#e2e8f0" /><circle cx="50" cy="50" r="4" fill="#94a3b8" /></g>
        </svg>
      );
    case 'STAGE':
      return (
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
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
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
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
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
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
        <svg viewBox="0 0 100 100" className="public-map-object-asset">
          <g fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="5" y="5" width="90" height="90" /><line x1="5" y1="25" x2="95" y2="25" /><line x1="5" y1="50" x2="95" y2="50" /><line x1="5" y1="75" x2="95" y2="75" /></g>
        </svg>
      );
    default:
      return null;
  }
}

function PublicMapObjectGraphic({ object, meta, label }) {
  const subType = String(meta.subType || '').toUpperCase();

  if (meta.svgUrl) {
    return <img src={meta.svgUrl} alt={label} className="public-map-object-asset" />;
  }

  if (meta.svgCode) {
    return <div className="public-map-object-asset" dangerouslySetInnerHTML={{ __html: meta.svgCode }} />;
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
    const patternId = `public-map-texture-${safeId}`;
    const polygonPoints = pointsToSvg(points);
    const usesBuiltinPattern = !meta.textureUrl && hasBuiltinTexture(meta.texture);

    return (
      <svg className="public-map-object-asset" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
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
      <svg className="public-map-object-asset" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
        <path d={pathData} stroke={meta.strokeColor || '#64748b'} strokeWidth={meta.strokeWidth || 4} fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  const accent = getObjectAccent(object, label);
  const accentTexture = meta.texture || resolveAccentTexture(accent);
  if (meta.textureUrl || accentTexture) {
    return (
      <div
        className="public-map-object-asset"
        style={{
          background: meta.textureUrl ? `url(${meta.textureUrl})` : getPolygonFill({ texture: accentTexture }),
          opacity: meta.opacity,
          borderRadius: 4
        }}
      />
    );
  }

  if (object.type === 'LABEL') {
    return <span>{label}</span>;
  }

  return (
    <div className="public-map-object-asset" style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: 4 }}>
      <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
    </div>
  );
}

function annotationLineStart(object, target) {
  if (!target) return null;
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const halfW = object.width / 2;
  const halfH = object.height / 2;
  let t;
  if (halfW <= 0 || halfH <= 0) return { x: cx, y: cy };
  if (absDx * halfH > absDy * halfW) {
    t = halfW / absDx;
  } else {
    t = halfH / absDy;
  }
  return {
    x: cx + dx * t,
    y: cy + dy * t
  };
}

function MapTextObject({ object, style, meta, label }) {
  const lineTarget = meta?.annotationLine || style?.annotationLine;
  const fontSize = style?.fontSize || 14;
  const textAlign = style?.textAlign || 'left';
  const containerPadding = style?.containerPadding ?? 6;
  const lineColor = style?.lineColor || '#94a3b8';
  const color = style?.color || '#1e293b';
  const background = style?.background;
  const borderColor = style?.borderColor;
  const borderRadius = style?.borderRadius;
  const opacity = style?.opacity;

  const textContainerStyle = {
    background: background || undefined,
    border: borderColor ? `1px solid ${borderColor}` : undefined,
    borderRadius: borderRadius || undefined,
    padding: containerPadding,
    color,
    fontSize: `${fontSize}px`,
    textAlign: textAlign === 'top' || textAlign === 'bottom' ? 'left' : textAlign,
    lineHeight: 1.3,
    maxWidth: '100%',
    overflow: 'hidden',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    position: 'relative',
    zIndex: 1,
    opacity
  };

  let lineStart = null;
  if (lineTarget) {
    lineStart = annotationLineStart(object, lineTarget);
  }

  const alignItems = textAlign === 'top' ? 'flex-start'
    : textAlign === 'bottom' ? 'flex-end'
    : textAlign === 'center' ? 'center'
    : 'flex-start';

  const justifyContent = textAlign === 'center' ? 'center'
    : textAlign === 'right' ? 'flex-end'
    : 'flex-start';

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems,
      justifyContent,
      pointerEvents: 'none',
      overflow: 'visible'
    }}>
      {lineStart && lineTarget ? (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: object.width,
            height: object.height,
            pointerEvents: 'none',
            overflow: 'visible',
            zIndex: 0
          }}
        >
          <line
            x1={lineStart.x - object.x}
            y1={lineStart.y - object.y}
            x2={lineTarget.x - object.x}
            y2={lineTarget.y - object.y}
            stroke={lineColor}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </svg>
      ) : null}
      <div style={textContainerStyle}>
        {label}
      </div>
    </div>
  );
}

export default function MapPage() {
  const { t, locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', result: null });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeZoneFocusId, setActiveZoneFocusId] = useState('all');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0, minScale: 0.45, maxScale: 3.5, initial: null });
  const viewportRef = useRef(null);
  const focusedFromQueryRef = useRef('');
  const pointersRef = useRef(new Map());
  const dragStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: 1, translateX: 0, translateY: 0 });
  const transformRef = useRef(transform);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const defaultDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  }, []);
  const [date, setDate] = useState(searchParams.get('date') || defaultDate);
  const [timeFrom, setTimeFrom] = useState(searchParams.get('timeFrom') || '12:00');
  const [guests, setGuests] = useState(Number(searchParams.get('guests') || '2'));
  const [holdAcquiring, setHoldAcquiring] = useState(false);
  const [holdError, setHoldError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    next.set('date', date);
    next.set('timeFrom', timeFrom);
    next.set('guests', String(guests));
    setSearchParams(next, { replace: true });
  }, [date, timeFrom, guests]);

  useMeta(`${t('mapTitle')} · GorPliaj`, 'Interactive venue map with live table statuses.');
  const mapId = searchParams.get('mapId') || '';
  const focusTableId = Number(searchParams.get('tableId') || '0');
  const focusObjectId = Number(searchParams.get('objectId') || '0');
  const draft = searchParams.get('draft') === '1';
  const mapDimensions = useMemo(() => ({
    width: state.result?.map?.width || 1200,
    height: state.result?.map?.height || 760
  }), [state.result?.map?.height, state.result?.map?.width]);
  const mapRenderFrame = useMemo(() => ({
    width: mapDimensions.width + MAP_PREVIEW_GUTTER * 2,
    height: mapDimensions.height + MAP_PREVIEW_GUTTER * 2,
    offsetX: MAP_PREVIEW_GUTTER,
    offsetY: MAP_PREVIEW_GUTTER
  }), [mapDimensions.height, mapDimensions.width]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    getPublicMapData(mapApi, { date, timeFrom, mapId, draft })
      .then((result) => setState({ loading: false, error: '', result }))
      .catch((error) => setState({ loading: false, error: error?.message || t('mapLoadFailed'), result: null }));
  }, [date, draft, mapId, timeFrom, t]);

  useEffect(() => {
    if (!state.result || !viewportRef.current) return undefined;

    const syncSize = () => {
      const rect = viewportRef.current.getBoundingClientRect();
      const nextSize = { width: rect.width, height: rect.height };
      setViewportSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize
      );
    };
    const observer = new ResizeObserver(syncSize);
    observer.observe(viewportRef.current);
    syncSize();

    return () => observer.disconnect();
  }, [state.result]);

  useEffect(() => {
    if (!state.result || !viewportSize.width || !viewportSize.height) return;

    const fit = getInitialViewTransform(mapDimensions.width, mapDimensions.height, viewportSize.width, viewportSize.height, MAP_PADDING);
    const initial = {
      ...fit,
      translateX: (viewportSize.width - mapRenderFrame.width * fit.scale) / 2,
      translateY: (viewportSize.height - mapRenderFrame.height * fit.scale) / 2
    };
    const minScale = clamp(initial.scale * 0.55, 0.25, 2);
    const maxScale = Math.max(minScale + 0.35, Math.max(2.4, initial.scale * 3));
    const constrained = clampTranslate(mapRenderFrame.width, mapRenderFrame.height, viewportSize.width, viewportSize.height, initial.scale, initial.translateX, initial.translateY);
    setTransform({
      scale: initial.scale,
      translateX: constrained.translateX,
      translateY: constrained.translateY,
      minScale,
      maxScale,
      initial
    });
  }, [mapDimensions.height, mapDimensions.width, mapRenderFrame.height, mapRenderFrame.width, state.result, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (!state.result) return;
    const tables = state.result.map.zones.flatMap((zone) => zone.tables);
    setSelectedTable(selectedTableId ? tables.find((item) => item.id === selectedTableId) || null : null);
  }, [selectedTableId, state.result]);

  const tableById = useMemo(() => {
    if (!state.result) return new Map();
    return new Map(state.result.map.zones.flatMap((zone) => zone.tables).map((table) => [table.id, table]));
  }, [state.result]);
  const renderObjects = useMemo(
    () => [...(state.result?.map.objects || [])].sort(compareMapObjects),
    [state.result]
  );
  const selectedObject = useMemo(
    () => selectedObjectId ? renderObjects.find((object) => object.id === selectedObjectId) || null : null,
    [renderObjects, selectedObjectId]
  );
  const selectedObjectMeta = useMemo(() => parseMetaJson(selectedObject?.metaJson), [selectedObject]);
  const selectedObjectTable = selectedObject?.tableId ? tableById.get(selectedObject.tableId) || null : null;
  const selectedObjectLabel = selectedObject ? localizeField(selectedObject.label, locale) || selectedObject.type : '';
  const selectedObjectCanBook = Boolean(
    selectedObjectTable &&
    selectedObjectTable.status === 'free' &&
    tableFitsGuests(selectedObjectTable)
  );

  const zoneFocusItems = useMemo(() => {
    const zones = state.result?.map?.zones || [];
    if (!zones.length) {
      return [];
    }

    const boundsByZoneId = new Map();
    renderObjects.forEach((object) => {
      const table = object.tableId ? tableById.get(object.tableId) : null;
      const meta = parseMetaJson(object.metaJson);
      const zoneId = table?.zoneId || meta.zoneId;
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
  }, [mapDimensions, mapRenderFrame.offsetX, mapRenderFrame.offsetY, renderObjects, state.result?.map?.zones, tableById]);

  const canInteractWithMap = Boolean(state.result && transform.initial);
  const resetTransform = transform.initial || {
    scale: 1,
    translateX: 0,
    translateY: 0
  };

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || !canInteractWithMap) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      const current = transformRef.current;
      const rect = node.getBoundingClientRect();
      zoomTo(current.scale * (event.deltaY > 0 ? 0.92 : 1.08), event.clientX - rect.left, event.clientY - rect.top);
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [canInteractWithMap, transform.maxScale, transform.minScale]);

  function applyTransform(nextScale, nextX, nextY) {
    if (!state.result || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const constrained = clampTranslate(mapRenderFrame.width, mapRenderFrame.height, rect.width, rect.height, nextScale, nextX, nextY);
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

  function fitWholeMap() {
    setActiveZoneFocusId('all');
    applyTransform(resetTransform.scale, resetTransform.translateX, resetTransform.translateY);
  }

  function focusZoneBounds(zoneId, bounds) {
    if (!bounds || !viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const width = Math.max(Number(bounds.width) || 0, 1);
    const height = Math.max(Number(bounds.height) || 0, 1);
    const padding = isMobileViewport ? 28 : 54;
    const availableWidth = Math.max(rect.width - padding * 2, 1);
    const availableHeight = Math.max(rect.height - padding * 2, 1);
    const nextScale = clamp(Math.min(availableWidth / width, availableHeight / height), transform.minScale, transform.maxScale);
    const centerX = (Number(bounds.x) || 0) + width / 2;
    const centerY = (Number(bounds.y) || 0) + height / 2;
    const nextX = rect.width / 2 - centerX * nextScale;
    const nextY = rect.height / 2 - centerY * nextScale;

    setActiveZoneFocusId(String(zoneId));
    applyTransform(nextScale, nextX, nextY);
  }

  function centerOnObject(object) {
    if (!viewportRef.current || !object) return;
    const center = getObjectCenter(object);
    const rect = viewportRef.current.getBoundingClientRect();
    const targetX = rect.width / 2 - (center.x + mapRenderFrame.offsetX) * transform.scale;
    const targetY = rect.height * (isMobileViewport ? 0.38 : 0.5) - (center.y + mapRenderFrame.offsetY) * transform.scale;
    applyTransform(transform.scale, targetX, targetY);
  }

  function selectTable(tableId) {
    setSelectedTableId(tableId);
    setSelectedObjectId(null);
    if (!viewportRef.current || !state.result) return;
    const selectedObject = state.result.map.objects.find((item) => item.tableId === tableId);
    if (!selectedObject) return;
    centerOnObject(selectedObject);
  }

  function tableFitsGuests(table) {
    return !guests || (guests >= table.seatsMin && guests <= table.seatsMax);
  }

  function selectObject(object) {
    const meta = parseMetaJson(object.metaJson);
    if (!isSelectableMapObject(object, meta)) {
      return;
    }

    setSelectedObjectId(object.id);
    setSelectedTableId(null);
    centerOnObject(object);
  }

  async function acquireHoldAndNavigate(tableId, bookingKind) {
    setHoldAcquiring(true);
    setHoldError('');
    try {
      const hold = await holdsApi.create({ tableId, date, timeFrom, locale });
      const kindParam = bookingKind === 'BEACH' ? '&kind=BEACH' : '';
      navigate(`/booking?date=${date}&timeFrom=${timeFrom}&guests=${guests}&bookableUnitId=table:${tableId}&mapId=${state.result.map.id}&zoneId=${selectedTable?.zoneId || selectedObjectTable?.zoneId || ''}&flow=STANDARD${kindParam}&holdToken=${hold.holdToken}&holdExpiresAt=${encodeURIComponent(hold.expiresAt)}`);
    } catch (error) {
      setHoldError(error.message);
    } finally {
      setHoldAcquiring(false);
    }
  }

  useEffect(() => {
    if (!state.result || !transform.initial) return;

    const focusKey = `${state.result.map.id}:${focusTableId || 0}:${focusObjectId || 0}`;
    if (focusedFromQueryRef.current === focusKey) {
      return;
    }

    if (focusObjectId > 0) {
      const targetObject = renderObjects.find((object) => object.id === focusObjectId);
      if (targetObject) {
        focusedFromQueryRef.current = focusKey;
        selectObject(targetObject);
        return;
      }
    }

    if (focusTableId > 0) {
      const targetTable = tableById.get(focusTableId);
      if (targetTable) {
        focusedFromQueryRef.current = focusKey;
        selectTable(targetTable.id);
      }
    }
  }, [focusObjectId, focusTableId, renderObjects, state.result, tableById, transform.initial]);

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
    return <div className="state-msg">{t('mapLoading') || 'Loading map...'}</div>;
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

      <div className="map-filter-bar" style={{ display: 'flex', gap: 12, padding: '0 0 12px', flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {t('mapDate') || (locale === 'ua' ? 'Дата' : locale === 'ru' ? 'Дата' : 'Date')}
          <input type="date" className="form-input" value={date} min={today} onChange={(e) => setDate(e.target.value)} style={{ fontSize: '0.85rem' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {t('mapTime') || (locale === 'ua' ? 'Час' : locale === 'ru' ? 'Время' : 'Time')}
          <input type="time" className="form-input" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} style={{ fontSize: '0.85rem' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {t('mapGuests') || (locale === 'ua' ? 'Гостей' : locale === 'ru' ? 'Гостей' : 'Guests')}
          <input type="number" className="form-input" value={guests} min={1} max={20} onChange={(e) => setGuests(Number(e.target.value) || 0)} style={{ fontSize: '0.85rem', width: 70 }} />
        </label>
        {timeFrom > '13:00' ? (
          <p style={{ width: '100%', margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>
            {locale === 'ua' ? 'Пляжні послуги — до 13:00' : locale === 'ru' ? 'Пляжные услуги — до 13:00' : 'Beach services — until 1:00 PM'}
          </p>
        ) : null}
      </div>

      <div className="map-container map-preview-container">
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
              onClick={fitWholeMap}
              disabled={!canInteractWithMap}
            >
              {t('mapFit')}
            </button>
            <span className="map-zoom-pill">{Math.round(transform.scale * 100)}%</span>
          </div>

          <div className={`public-map-shell ${isDragging ? 'is-dragging' : ''}`}>
            {zoneFocusItems.length ? (
              <div className="public-map-zone-tabs" aria-label="Map zones">
                <button
                  type="button"
                  className={`public-map-zone-tab ${activeZoneFocusId === 'all' ? 'active' : ''}`}
                  onClick={fitWholeMap}
                  aria-pressed={activeZoneFocusId === 'all'}
                >
                  Вся карта
                </button>
                {zoneFocusItems.map(({ zone, bounds }) => (
                  <button
                    key={zone.id}
                    type="button"
                    className={`public-map-zone-tab ${activeZoneFocusId === String(zone.id) ? 'active' : ''}`}
                    onClick={() => focusZoneBounds(zone.id, bounds)}
                    aria-pressed={activeZoneFocusId === String(zone.id)}
                  >
                    {zoneDisplayName(zone, locale) || `Zone #${zone.id}`}
                  </button>
                ))}
              </div>
            ) : null}
            <div
              className="public-map-viewport"
              ref={viewportRef}
              role="application"
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
                  width: mapRenderFrame.width,
                  height: mapRenderFrame.height,
                  backgroundColor: state.result.map.backgroundColor || '#d8e7f8',
                  transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`
                }}
              >
                <div
                  className="public-map-canvas"
                  style={{
                    backgroundColor: state.result.map.backgroundColor || '#d8e7f8',
                    left: mapRenderFrame.offsetX,
                    top: mapRenderFrame.offsetY,
                    width: mapDimensions.width,
                    height: mapDimensions.height
                  }}
                >
                  <div
                    className="public-map-background"
                    style={{
                      left: 0,
                      top: 0,
                      width: mapDimensions.width,
                      height: mapDimensions.height,
                      backgroundColor: state.result.map.backgroundColor || '#d8e7f8',
                      backgroundImage: state.result.map.backgroundImage ? `url(${state.result.map.backgroundImage})` : 'none'
                    }}
                  />

                  {renderObjects.map((object) => {
                    const isTable = object.type === 'TABLE';
                    const table = isTable && object.tableId ? tableById.get(object.tableId) : null;
                    const linkedTable = !isTable && object.tableId ? tableById.get(object.tableId) : null;
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
                            zIndex: getObjectZIndex(object),
                            borderRadius: object.width === object.height ? 999 : 8
                          }}
                          onClick={() => selectTable(table.id)}
                          onPointerDown={(event) => event.stopPropagation()}
                          disabled={disabled}
                        >
                          {table.code}
                        </button>
                      );
                    }

                    if (object.isActive === false) {
                      return null;
                    }

                    if (object.type === 'TEXT') {
                      const style = parseStyleJson(object.styleJson);
                      const { opacity: _opacity, fontSize: _fontSize, textAlign: _textAlign, containerPadding: _cp, lineColor: _lc, annotationLine: _al, ...outerStyle } = style;
                      return (
                        <div
                          key={object.id}
                          className="public-map-object object-text has-asset"
                          style={{
                            left: object.x,
                            top: object.y,
                            width: object.width,
                            height: object.height,
                            transform: `rotate(${object.rotation}deg)`,
                            zIndex: getObjectZIndex(object),
                            ...outerStyle
                          }}
                        >
                          <MapTextObject object={object} style={style} meta={meta} label={objectLabel} />
                        </div>
                      );
                    }

                    const hasAsset = hasRenderableObjectGraphic(object, meta, objectLabel);
                    if (!hasAsset) {
                      return null;
                    }

                    const isSelectableObject = isSelectableMapObject(object, meta);
                    const Component = isSelectableObject ? 'button' : 'div';
                    return (
                      <Component
                        key={object.id}
                        type={isSelectableObject ? 'button' : undefined}
                        className={`public-map-object object-${String(object.type).toLowerCase()} ${hasAsset ? 'has-asset' : ''} ${isSelectableObject ? 'selectable' : ''} ${selectedObjectId === object.id ? 'selected' : ''} ${linkedTable ? linkedTable.status : ''} ${linkedTable && !tableFitsGuests(linkedTable) ? 'no-fit' : ''}`}
                        style={{
                          left: object.x,
                          top: object.y,
                          width: object.width,
                          height: object.height,
                          transform: `rotate(${object.rotation}deg)`,
                          zIndex: getObjectZIndex(object),
                          ...parseStyleJson(object.styleJson)
                        }}
                        title={objectLabel}
                        tabIndex={isSelectableObject ? 0 : undefined}
                        onPointerDown={isSelectableObject ? (event) => event.stopPropagation() : undefined}
                        onClick={isSelectableObject ? () => selectObject(object) : undefined}
                      >
                        <PublicMapObjectGraphic object={object} meta={meta} label={objectLabel} />
                      </Component>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {!canInteractWithMap ? <p className="muted">Preparing map...</p> : null}

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

        <aside className={`map-side-panel ${isMobileViewport ? 'mobile-sheet' : ''} ${selectedTable || selectedObject ? 'is-open' : ''}`}>
          <h3>{t('mapSelectedTitle')}</h3>
          {selectedTable ? (
            <>
              <p>
                <strong>{localizeField(selectedTable.name, locale) || selectedTable.code}</strong>
              </p>
              {selectedTable.positionType ? (
                <p className="muted">{positionTypeLabel(selectedTable.positionType, locale)}</p>
              ) : null}
              {selectedTable.rowSortOrder != null ? (
                <p className="muted">{localizeField({ ua: 'Ряд', ru: 'Ряд', en: 'Row' }, locale)} {selectedTable.rowSortOrder}</p>
              ) : null}
              <p className="muted">
                {t('mapSeats')}: {selectedTable.seatsMin}-{selectedTable.seatsMax}
              </p>
              {selectedTable.bookingKind === 'BEACH' && timeFrom > '13:00' ? (
                <p className="muted" style={{ color: 'var(--danger)' }}>
                  {locale === 'ua' ? 'Пляжні послуги доступні до 13:00. Оберіть час до 13:00 або іншу дату.' : locale === 'ru' ? 'Пляжные услуги доступны до 13:00. Выберите время до 13:00 или другую дату.' : 'Beach services are bookable until 1:00 PM. Choose a time before 1:00 PM or another date.'}
                </p>
              ) : null}
              {selectedTable.bookingKind === 'BEACH' && timeFrom > '13:00' ? (
                <span className="btn btn-primary disabled">{t('mapGoToBooking')}</span>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={holdAcquiring}
                  onClick={() => acquireHoldAndNavigate(selectedTable.id, selectedTable.bookingKind)}
                >
                  {holdAcquiring ? t('mapBooking') : t('mapGoToBooking')}
                </button>
              )}
            </>
          ) : selectedObject ? (
            <>
              <p>
                <strong>{selectedObjectLabel}</strong>
                {selectedObjectTable ? <span className="muted"> ({selectedObjectTable.code})</span> : null}
              </p>
              {selectedObjectTable?.positionType ? (
                <p className="muted">{positionTypeLabel(selectedObjectTable.positionType, locale)}</p>
              ) : null}
              {selectedObjectTable?.rowSortOrder != null ? (
                <p className="muted">{localizeField({ ua: 'Ряд', ru: 'Ряд', en: 'Row' }, locale)} {selectedObjectTable.rowSortOrder}</p>
              ) : null}
              {selectedObjectMeta.photoUrl ? (
                <div className="map-object-photo">
                  <img src={selectedObjectMeta.photoUrl} alt={selectedObjectLabel} />
                </div>
              ) : null}
              {selectedObjectMeta.price !== '' && selectedObjectMeta.price !== null && selectedObjectMeta.price !== undefined ? (
                <p className="muted">
                  {t('mapPrice')}: {selectedObjectMeta.price} {selectedObjectMeta.priceUnit || 'UAH'}
                </p>
              ) : null}
              {selectedObjectTable?.deposit || selectedObjectMeta.depositRequired || selectedObjectMeta.depositAmount ? (
                <p className="muted">
                  {t('mapDeposit')}: {selectedObjectTable?.deposit || selectedObjectMeta.depositAmount || 'required'} {selectedObjectTable?.deposit || selectedObjectMeta.depositAmount ? (selectedObjectMeta.priceUnit || 'UAH') : ''}
                </p>
              ) : null}
              {selectedObjectTable ? (
                <>
                  <p className="muted">
                    {t('mapSeats')}: {selectedObjectTable.seatsMin}-{selectedObjectTable.seatsMax}
                  </p>
                  <p className="muted">
                    {t('mapStatus')}: {selectedObjectTable.status === 'free' && tableFitsGuests(selectedObjectTable) ? t('mapFree') : t('mapBusy')}
                  </p>
                  {selectedObjectTable.bookingKind === 'BEACH' && timeFrom > '13:00' ? (
                    <p className="muted" style={{ color: 'var(--danger)' }}>
                      {locale === 'ua' ? 'Пляжні послуги доступні до 13:00. Оберіть час до 13:00 або іншу дату.' : locale === 'ru' ? 'Пляжные услуги доступны до 13:00. Выберите время до 13:00 или другую дату.' : 'Beach services are bookable until 1:00 PM. Choose a time before 1:00 PM or another date.'}
                    </p>
                  ) : null}
                  {selectedObjectCanBook ? (
                    selectedObjectTable.bookingKind === 'BEACH' && timeFrom > '13:00' ? (
                      <span className="btn btn-primary disabled">{t('mapGoToBooking')}</span>
                    ) : (
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={holdAcquiring}
                      onClick={() => acquireHoldAndNavigate(selectedObjectTable.id, selectedObjectTable.bookingKind)}
                    >
                      {holdAcquiring ? t('mapBooking') : t('mapGoToBooking')}
                    </button>
                    )
                  ) : (
                    <p className="muted">{locale === 'ua' ? 'Ця позиція недоступна для обраної дати, часу або кількості гостей.' : locale === 'ru' ? 'Эта позиция недоступна для выбранной даты, времени или количества гостей.' : 'This object is not available for the selected date, time, or guest count.'}</p>
                  )}
                </>
              ) : (
                <p className="muted">This object is clickable, but it is not linked to a booking place yet.</p>
              )}
            </>
          ) : (
            <p className="muted">{t('mapSelectHint')}</p>
          )}
          {holdError ? <p className="muted" style={{ color: 'var(--danger)', marginTop: 8 }}>{holdError}</p> : null}
        </aside>
      </div>
    </>
  );
}
