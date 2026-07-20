import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { holdsApi, mapApi, bookingsApi, eventsApi, guestApi } from '../lib/api';
import { captureAnalytics, captureException, getDistinctId } from '../lib/analytics';
import { clamp, clampTranslate, getInitialViewTransform, getObjectCenter, getPublicMapData, zoomAroundViewportPoint, getUsefulContentBounds } from '../lib/map';
import FavTooltip from '../components/FavTooltip';
import PhoneInput from '../components/PhoneInput';
import { localizeField, localizedCopy } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useGuest } from '../state/guest';
import { useMeta } from '../hooks/useMeta';
import { generateTimeSlots, getDefaultTime } from '../utils/timeSlots';
import {
  money,
  getUnitDisplayName,
  formatUkrainianDate,
  bookingKindTitle,
  unitStatusLabel,
  positionTypeLabel,
  buildEventDateOptions
} from '../utils/bookingHelpers';
import {
  parseStyleJson,
  parseMetaJson,
  getObjectZIndex,
  compareMapObjects,
  hasRenderableObjectGraphic,
  isSelectableMapObject,
  zoneDisplayName,
  pointsToSvg,
  STATIC_TYPE_ACCENTS
} from '../utils/mapHelpers';

const MAP_PADDING = 24;
const MAP_PREVIEW_GUTTER = 20;
const PINCH_SENSITIVITY = 0.006;
const EVENING_TABLE_START = '20:00';

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

function toLocalMinutes(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return Number(obj.hour) * 60 + Number(obj.minute);
}

function minutesToTime(value) {
  const minutes = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function buildEventArrivalSlots(session, date, today, currentTime) {
  if (!session?.startsAt || !session?.endsAt) return [];
  const start = toLocalMinutes(session.startsAt);
  const end = toLocalMinutes(session.endsAt);
  if (start === null || end === null) return [];
  const first = Math.max(0, start - 60);
  const last = end >= first ? end : 23 * 60 + 30;
  const slots = [];
  for (let minute = first; minute <= last; minute += 30) {
    const time = minutesToTime(minute);
    if (date === today && time <= currentTime) continue;
    slots.push(time);
  }
  return slots;
}

function generateTableTimeSlots(date, today, currentTime, start = '09:00', end = '22:00') {
  const slots = [];
  const [startHour, startMinute = 0] = String(start || '09:00').split(':').map(Number);
  const [endHour, endMinute = 0] = String(end || '22:00').split(':').map(Number);
  const startValue = startHour * 60 + startMinute;
  const endValue = endHour * 60 + endMinute;

  for (let hour = startHour; hour <= endHour; hour += 1) {
    for (const min of ['00', '30']) {
      const timeStr = `${String(hour).padStart(2, '0')}:${min}`;
      const timeValue = hour * 60 + Number(min);
      if (timeValue < startValue || timeValue > endValue) continue;
      if (date === today && timeStr <= currentTime) continue;
      slots.push(timeStr);
    }
  }

  return slots;
}

function isPierCode(value) {
  return /^P-\d+/i.test(String(value || '').trim());
}

function getObjectRenderPriority(object, meta = parseMetaJson(object?.metaJson)) {
  const type = String(object?.type || '').toUpperCase();
  const subType = String(meta?.subType || '').toUpperCase();
  if (subType === 'POLYGON') return 0;
  if (type === 'PATH') return 1;
  if (type === 'TABLE') return 3;
  return 2;
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

function mapHasRenderableObjectGraphic(object, meta, label) {
  const subType = String(meta.subType || '').toUpperCase();
  if (subType === 'IMAGE' && !meta.svgUrl && !meta.svgCode) return false;
  const accent = getObjectAccent(object, label);
  return Boolean(
    meta.svgUrl ||
    meta.svgCode ||
    (meta.textureUrl && subType !== 'IMAGE') ||
    meta.texture ||
    subType === 'POLYGON' ||
    hasBuiltinTemplate(subType) ||
    object.type === 'PATH' ||
    object.type === 'LABEL' ||
    object.type === 'TEXT' ||
    accent
  );
}

function mapIsSelectableMapObject(object, meta) {
  return object?.isActive !== false && (object.tableId || meta.interactionMode === 'SELECTABLE' || meta.isSelectable);
}

function resolveAccentTexture(accent) {
  if (accent === 'sand') return 'sand';
  if (accent === 'sea') return 'water';
  if (accent === 'deck' || accent === 'path') return 'wood';
  return '';
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
    const polyPoints = meta.points?.length
      ? meta.points
      : [
          { x: 0, y: 0 },
          { x: object.width, y: 0 },
          { x: object.width, y: object.height },
          { x: 0, y: object.height }
        ];
    const safeId = String(object.id).replace(/[^a-zA-Z0-9_-]/g, '-');
    const patternId = `public-map-texture-${safeId}`;
    const polygonPoints = pointsToSvg(polyPoints);
    const usesBuiltinPattern = !meta.textureUrl && hasBuiltinTexture(meta.texture);
    const isWaterSurface = String(meta.texture || '').toLowerCase() === 'water';

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
          stroke={isWaterSurface ? 'none' : (meta.strokeColor || '#64748b')}
          strokeWidth={isWaterSurface ? 0 : meta.strokeWidth}
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
  const canUseTextureImage = subType !== 'IMAGE' && meta.textureUrl;
  if (canUseTextureImage || accentTexture) {
    return (
      <div
        className="public-map-object-asset"
        style={{
          background: canUseTextureImage ? `url(${meta.textureUrl})` : getPolygonFill({ texture: accentTexture }),
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

function MapTextObject({ object, style, meta, label }) {
  const textContent = meta?.text || label || '';
  const fontSize = meta?.fontSize || style?.fontSize || 14;
  const fontColor = meta?.fontColor || style?.color || '#1e293b';
  const calloutDir = meta?.calloutLine || '';

  const halfW = object.width / 2;
  const halfH = object.height / 2;
  const ext = 40;

  let calloutLine = null;
  if (calloutDir === 'UP') {
    calloutLine = <line x1={halfW} y1={0} x2={halfW} y2={-ext} stroke={fontColor} strokeWidth={1.5} />;
  } else if (calloutDir === 'DOWN') {
    calloutLine = <line x1={halfW} y1={object.height} x2={halfW} y2={object.height + ext} stroke={fontColor} strokeWidth={1.5} />;
  } else if (calloutDir === 'LEFT') {
    calloutLine = <line x1={0} y1={halfH} x2={-ext} y2={halfH} stroke={fontColor} strokeWidth={1.5} />;
  } else if (calloutDir === 'RIGHT') {
    calloutLine = <line x1={object.width} y1={halfH} x2={object.width + ext} y2={halfH} stroke={fontColor} strokeWidth={1.5} />;
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      pointerEvents: 'none'
    }}>
      {calloutLine ? (
        <svg style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          overflow: 'visible', pointerEvents: 'none', zIndex: 0
        }}>
          {calloutLine}
        </svg>
      ) : null}
      <div style={{
        background: style?.background || 'rgba(255,248,240,0.9)',
        border: style?.borderColor ? `1px solid ${style.borderColor}` : '1px solid #d4c5a9',
        borderRadius: style?.borderRadius || '8px',
        padding: '6px 10px',
        opacity: style?.opacity,
        maxWidth: '100%',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1
      }}>
        <span style={{
          fontSize: `${fontSize}px`,
          color: fontColor,
          fontWeight: 600,
          textAlign: 'center',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap'
        }}>
          {textContent}
        </span>
      </div>
    </div>
  );
}

function VisualSchedule({ bookingKind, locale }) {
  const isBeach = bookingKind === 'BEACH';
  const startHour = 8;
  const endHour = 22;
  const totalHours = endHour - startHour;

  const activeStart = 9;
  const tableWidthPercent = ((20 - 9) / totalHours) * 100;
  const beachArrivalWidthPercent = ((13 - 9) / totalHours) * 100;
  const beachLeisureWidthPercent = ((20 - 9) / totalHours) * 100;

  const leftPercent = ((activeStart - startHour) / totalHours) * 100;

  const label = isBeach
    ? {
        ua: 'Пляж: бронь на весь день (обовʼязкова явка 09:00 - 13:00)',
        ru: 'Пляж: бронь на весь день (обязательная явка 09:00 - 13:00)',
        en: 'Beach: full day booking (mandatory arrival 09:00 - 13:00)'
      }
    : {
        ua: 'Столи: час бронювання 09:00 - 20:00',
        ru: 'Столы: время бронирования 09:00 - 20:00',
        en: 'Tables: booking hours 09:00 - 20:00'
      };

  const getCopy = (dict) => dict[locale === 'ua' ? 'ua' : locale === 'ru' ? 'ru' : 'en'] || dict['en'];

  return (
    <div className="visual-schedule" style={{
      marginTop: '10px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: 'var(--bg)',
      border: '1px solid var(--line)',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text)' }}>
        <span>{getCopy(label)}</span>
      </div>

      <div style={{ position: 'relative', height: '8px', backgroundColor: 'var(--line-light, rgba(255,255,255,0.12))', borderRadius: '4px', overflow: 'hidden', margin: '8px 0 4px' }}>
        {isBeach ? (
          <>
            <div style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              width: `${beachLeisureWidthPercent}%`,
              height: '100%',
              backgroundColor: 'var(--brand)',
              opacity: 0.35,
              borderRadius: '4px'
            }} title={getCopy({ ua: 'Час відпочинку', ru: 'Время отдыха', en: 'Leisure time' })} />

            <div style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              width: `${beachArrivalWidthPercent}%`,
              height: '100%',
              backgroundColor: 'var(--brand)',
              borderRadius: '4px'
            }} title={getCopy({ ua: 'Обовʼязкова явка', ru: 'Обязательная явка', en: 'Mandatory arrival' })} />
          </>
        ) : (
          <div style={{
            position: 'absolute',
            left: `${leftPercent}%`,
            width: `${tableWidthPercent}%`,
            height: '100%',
            backgroundColor: 'var(--success)',
            borderRadius: '4px'
          }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--muted)', fontWeight: '500', marginTop: '6px' }}>
        <span>08:00</span>
        <span style={{ color: isBeach ? 'var(--brand)' : 'inherit', fontWeight: isBeach ? '700' : '500' }}>09:00</span>
        {isBeach ? (
          <>
            <span style={{ color: 'var(--brand)', fontWeight: '700' }}>13:00</span>
            <span style={{ color: 'var(--brand)', opacity: 0.8 }}>20:00</span>
          </>
        ) : (
          <span style={{ color: 'var(--success)', fontWeight: '700' }}>20:00</span>
        )}
        <span>22:00</span>
      </div>

      {isBeach && (
        <div style={{ display: 'flex', gap: 10, marginTop: '6px', fontSize: '0.62rem', color: 'var(--muted)', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: 'var(--brand)', borderRadius: '2px' }} />
            {getCopy({ ua: 'Реєстрація (явка)', ru: 'Регистрация (явка)', en: 'Mandatory Check-in' })}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: 'var(--brand)', opacity: 0.35, borderRadius: '2px' }} />
            {getCopy({ ua: 'Час відпочинку (бронь діє)', ru: 'Время отдыха (бронь действует)', en: 'Rest Time (booking active)' })}
          </span>
        </div>
      )}
    </div>
  );
}

function SidePanelHint({ locale }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted, #64748b)' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
      <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', margin: '0 0 8px' }}>
        {locale === 'ua' ? 'Оберіть місце на мапі' : locale === 'ru' ? 'Выберите место на карте' : 'Select a place on the map'}
      </p>
      <p style={{ fontSize: '0.82rem', lineHeight: 1.4, margin: 0 }}>
        {locale === 'ua' ? 'Клацніть на стіл, шезлонг або ліжко, щоб забронювати.' : locale === 'ru' ? 'Кликните на стол, шезлонг или кровать, чтобы забронировать.' : 'Click on a table, sunbed, or daybed to book.'}
      </p>
    </div>
  );
}

function SidePanelBusy({ locale, table, tablePhoto, onClose }) {
  return (
    <>
      <button
        type="button"
        className="panel-close-btn"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'none',
          border: 'none',
          fontSize: '24px',
          color: 'var(--text-muted, #64748b)',
          cursor: 'pointer',
          lineHeight: 1,
          padding: '4px 8px',
          zIndex: 10
        }}
        aria-label="Close panel"
      >
        ×
      </button>
      <h3 style={{ margin: '0 0 12px' }}>
        {locale === 'ua' ? 'Місце зайняте' : locale === 'ru' ? 'Место занято' : 'Place is occupied'}
      </h3>
      {tablePhoto ? (
        <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden' }}>
          <img src={tablePhoto} alt={localizeField(table?.name, locale) || table?.code || ''} style={{ width: '100%', display: 'block' }} />
        </div>
      ) : null}
      <p style={{ fontWeight: 600 }}>{localizeField(table?.name, locale) || table?.code || ''}</p>
      {table?.positionType ? (
        <p className="muted" style={{ margin: '4px 0' }}>{positionTypeLabel(table.positionType, [], locale, localizedCopy)}</p>
      ) : null}
      {table?.seatsMin != null && table?.seatsMax != null ? (
        <p className="muted" style={{ margin: '4px 0' }}>
          {locale === 'ua' ? 'Місць' : locale === 'ru' ? 'Мест' : 'Seats'}: {table.seatsMin}-{table.seatsMax}
        </p>
      ) : null}
      <p className="muted" style={{ margin: '8px 0 0', color: 'var(--danger)' }}>
        {locale === 'ua' ? 'Це місце наразі зайняте або утримується.' : locale === 'ru' ? 'Это место сейчас занято или удерживается.' : 'This place is currently occupied or held.'}
      </p>
    </>
  );
}

export default function UnifiedBookingPage() {
  const { t, locale } = useLocale();
  const c = useCallback((values) => localizedCopy(values, locale), [locale]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState({ loading: true, error: '', result: null });
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeZoneFocusId, setActiveZoneFocusId] = useState('all');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoFocusing, setIsAutoFocusing] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showTwoFingerHint, setShowTwoFingerHint] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0, minScale: 0.45, maxScale: 3.5, initial: null });
  const safeTransform = transform || { scale: 1, translateX: 0, translateY: 0, minScale: 0.45, maxScale: 3.5, initial: null };
  const viewportRef = useRef(null);
  const mapBoardRef = useRef(null);
  const zoneTabsRef = useRef(null);
  const sidePanelRef = useRef(null);
  const focusedFromQueryRef = useRef('');
  const pointersRef = useRef(new Map());
  const dragStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: 1, translateX: 0, translateY: 0, worldX: 0, worldY: 0 });
  const gestureMovedRef = useRef(false);
  const transformRef = useRef(safeTransform);
  const autoFocusTimerRef = useRef(null);
  const autoFocusScaleRef = useRef(null);
  const twoFingerHintTimerRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const today = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${obj.year}-${obj.month}-${obj.day}`;
  }, []);
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${obj.year}-${obj.month}-${obj.day}`;
  }, []);
  const currentTime = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Kyiv',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${obj.hour}:${obj.minute}`;
  }, []);

  const [bookingKind, setBookingKind] = useState(searchParams.get('kind') === 'TABLE' ? 'TABLE' : 'BEACH');

  const [form, setForm] = useState({
    date: searchParams.get('date') || defaultDate,
    guests: clamp(Math.trunc(Number(searchParams.get('guests') || '2')) || 2, 1, 20),
    timeFrom: searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    commentCustomer: '',
    agreeAll: false
  });

  const { guest, isLoggedIn } = useGuest();
  const guestLoggedIn = isLoggedIn && Boolean(guest && guest.name && guest.phone);

  useEffect(() => {
    if (guest && (guest.name || guest.phone || guest.email)) {
      setForm((prev) => ({
        ...prev,
        customerName: prev.customerName || guest.name || '',
        customerPhone: prev.customerPhone || guest.phone || '',
        customerEmail: prev.customerEmail || guest.email || ''
      }));
    }
  }, [guest]);

  const [holdToken, setHoldToken] = useState(searchParams.get('holdToken') || '');
  const [groupHoldTokens, setGroupHoldTokens] = useState([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState(searchParams.get('holdExpiresAt') || '');
  const [holdAcquiring, setHoldAcquiring] = useState(false);
  const [holdError, setHoldError] = useState('');
  const [holdTimeLeft, setHoldTimeLeft] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reservationAccess, setReservationAccess] = useState(null);
  const [embeddedPaymentStatus, setEmbeddedPaymentStatus] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [favoriteAdded, setFavoriteAdded] = useState(false);
  const [panelFav, setPanelFav] = useState(false);

  const [positionTypes, setPositionTypes] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);

  const [bookingFlow] = useState('STANDARD');
  const activeEventSlug = searchParams.get('event') || '';

  const [eveningCandidateTime, setEveningCandidateTime] = useState(
    searchParams.get('timeFrom') >= EVENING_TABLE_START ? searchParams.get('timeFrom') : EVENING_TABLE_START
  );
  const [bookableUnitsState, setBookableUnitsState] = useState({ loading: false, error: '', units: [], bookingPolicy: null });
  const [eveningUnitsState, setEveningUnitsState] = useState({ loading: false, error: '', units: [] });
  const [scenarioSelected, setScenarioSelected] = useState(false);
  const [eveningTableOverride, setEveningTableOverride] = useState(null);

  useMeta(`${t('mapTitle')} · GorPliaj`, 'Interactive venue map with live table statuses.');

  const mapId = searchParams.get('mapId') || '';
  const draftMode = searchParams.get('draft') === '1';
  const focusTableId = Number(searchParams.get('tableId') || '0');
  const focusObjectId = Number(searchParams.get('objectId') || '0');

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

  const usageMode = activeEventSlug ? 'EVENING' : 'DAY';
  const resolvedBookingKind = activeEventSlug ? 'TABLE' : bookingKind;

  const eventDateOptions = useMemo(() => activeEventSlug ? buildEventDateOptions(eventInfo) : [], [activeEventSlug, eventInfo]);
  const activeEventSession = useMemo(() => {
    const sessions = Array.isArray(eventInfo?.sessions) ? eventInfo.sessions : [];
    return sessions.find((session) => session.isActive !== false && toLocalDateKey(session.startsAt) === form.date)
      || (eventInfo?.startAt && toLocalDateKey(eventInfo.startAt) === form.date
        ? { id: null, name: eventInfo.title, startsAt: eventInfo.startAt, endsAt: eventInfo.endAt || eventInfo.startAt, isActive: true }
        : null);
  }, [eventInfo, form.date]);
  const eventEntryIsFree = activeEventSession?.admissionMode === 'FREE';
  const eventArrivalSlots = useMemo(
    () => buildEventArrivalSlots(activeEventSession, form.date, today, currentTime),
    [activeEventSession, form.date, today, currentTime]
  );

  const timeSlots = useMemo(() => {
    if (activeEventSlug) return eventArrivalSlots;
    return generateTimeSlots(form.date, today, currentTime, resolvedBookingKind);
  }, [activeEventSlug, eventArrivalSlots, form.date, today, currentTime, resolvedBookingKind]);

  useEffect(() => {
    if (timeSlots.length > 0) {
      if (!timeSlots.includes(form.timeFrom)) {
        setForm((current) => ({ ...current, timeFrom: timeSlots[0] }));
      }
    } else {
      setForm((current) => ({ ...current, timeFrom: '' }));
    }
  }, [timeSlots, form.timeFrom]);

  useEffect(() => {
    if (!activeEventSlug) {
      setEventInfo(null);
      setTicketTypes([]);
      return undefined;
    }
    let cancelled = false;
    Promise.all([eventsApi.bySlug(activeEventSlug), eventsApi.ticketTypes(activeEventSlug)])
      .then(([event, sales]) => {
        if (cancelled) return;
        const sessions = Array.isArray(sales?.sessions) && sales.sessions.length ? sales.sessions : (event?.sessions || []);
        setEventInfo({ ...event, sessions });
        setTicketTypes(Array.isArray(sales?.ticketTypes) ? sales.ticketTypes : []);
      })
      .catch((error) => {
        if (cancelled) return;
        setEventInfo({ loadError: error?.message || 'Unable to load event.' });
        setTicketTypes([]);
      });
    return () => { cancelled = true; };
  }, [activeEventSlug]);

  useEffect(() => {
    const ticketCode = searchParams.get('reservation') || '';
    const token = searchParams.get('t') || '';
    if (!ticketCode || !token) return undefined;

    let cancelled = false;
    let timerId = null;
    let attempts = 0;

    async function restorePaymentResult() {
      attempts += 1;
      try {
        const result = await bookingsApi.status(ticketCode, token);
        if (cancelled) return;

        const paymentStatus = result?.reservation?.paymentStatus || '';
        setReservationAccess({ ticketCode, token, downloadUrl: result?.downloadUrl || null });
        setPaymentReceipt(result || null);
        setEmbeddedPaymentStatus(paymentStatus);
        setPaymentUrl('');

        if (paymentStatus === 'PAID') {
          captureAnalytics('booking_payment_completed', { ticket_code: ticketCode });
          setSuccessMessage(eventEntryIsFree
            ? c({
                ua: 'Оплату підтверджено. Підтвердження бронювання надіслано на Email.',
                ru: 'Оплата подтверждена. Подтверждение бронирования отправлено на Email.',
                en: 'Payment confirmed. Your booking confirmation has been sent by email.'
              })
            : c({
                ua: 'Бронювання столу підтверджено та надіслано на Email. Вхідні квитки купуються окремо або при вході.',
                ru: 'Бронирование стола подтверждено и отправлено на Email. Входные билеты покупаются отдельно или при входе.',
                en: 'Your table booking is confirmed and was sent by email. Entry tickets are purchased separately or at the entrance.'
              }));
          return;
        }

        if (attempts < 5 && !['FAILED', 'CANCELLED', 'REFUNDED'].includes(paymentStatus)) {
          timerId = window.setTimeout(restorePaymentResult, 1800);
          return;
        }

        setSuccessMessage(c({
          ua: 'Платіж ще не підтверджено. Перевірте статус трохи пізніше або зверніться до адміністратора.',
          ru: 'Платёж пока не подтверждён. Проверьте статус немного позже или обратитесь к администратору.',
          en: 'Payment has not been confirmed yet. Please check again shortly or contact the venue.'
        }));
      } catch {
        if (!cancelled && attempts < 5) {
          timerId = window.setTimeout(restorePaymentResult, 1800);
        }
      }
    }

    restorePaymentResult();
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [searchParams, locale, eventEntryIsFree]);

  useEffect(() => {
    if (!activeEventSlug || !eventDateOptions.length) return;
    const selected = eventDateOptions.find((option) => option.date === form.date) || eventDateOptions[0];
    const session = eventInfo?.sessions?.find((item) => item.id === selected.sessionId);
    const slots = buildEventArrivalSlots(session, selected.date, today, currentTime);
    setForm((current) => ({
      ...current,
      date: selected.date,
      timeFrom: slots.includes(current.timeFrom) ? current.timeFrom : (slots[0] || '')
    }));
  }, [activeEventSlug, eventDateOptions, eventInfo, today, currentTime]);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    next.set('date', form.date);
    next.set('timeFrom', form.timeFrom);
    next.set('guests', String(form.guests));
    next.set('kind', resolvedBookingKind);
    next.set('usageMode', usageMode);
    setSearchParams(next, { replace: true });
  }, [form.date, form.timeFrom, form.guests, resolvedBookingKind, usageMode, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    mapApi.list({ usageMode })
      .then((result) => {
        if (cancelled) return;
        const maps = Array.isArray(result?.maps) ? result.maps : [];
        const preferred = maps.find((item) => String(item.id) === String(searchParams.get('mapId')))
          || maps.find((item) => item.isDefault)
          || maps[0];

        if (preferred) {
          const next = new URLSearchParams(window.location.search);
          next.set('mapId', String(preferred.id));
          next.set('date', form.date);
          next.set('timeFrom', form.timeFrom);
          next.set('guests', String(form.guests));
          next.set('kind', resolvedBookingKind);
          next.set('usageMode', usageMode);
          setSearchParams(next, { replace: true });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [usageMode, resolvedBookingKind, form.date, form.timeFrom, setSearchParams, searchParams]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    getPublicMapData(mapApi, { date: form.date, timeFrom: form.timeFrom, mapId, draft: draftMode })
      .then((result) => setState({ loading: false, error: '', result }))
      .catch((error) => setState({ loading: false, error: error?.message || t('mapLoadFailed'), result: null }));
  }, [form.date, form.timeFrom, mapId, t, draftMode, availabilityRevision]);

  useEffect(() => {
    if (!mapId || !form.date || !form.timeFrom) {
      setBookableUnitsState({ loading: false, error: '', units: [], bookingPolicy: null });
      return undefined;
    }

    let cancelled = false;
    setBookableUnitsState((current) => ({ ...current, loading: true, error: '' }));
    mapApi.bookableUnits(mapId, {
      date: form.date,
      timeFrom: form.timeFrom,
      eventId: eventInfo?.id || undefined
    })
      .then((payload) => {
        if (cancelled) return;
        setBookableUnitsState({
          loading: false,
          error: '',
          units: Array.isArray(payload?.units) ? payload.units : [],
          bookingPolicy: payload?.bookingPolicy || null
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setBookableUnitsState({ loading: false, error: error?.message || 'Failed to load booking prices.', units: [], bookingPolicy: null });
      });

    return () => { cancelled = true; };
  }, [mapId, form.date, form.timeFrom, eventInfo?.id, availabilityRevision]);

  useEffect(() => {
    let cancelled = false;
    setEveningUnitsState({ loading: true, error: '', units: [] });
    mapApi.list({ usageMode: 'EVENING', bookingKind: 'TABLE' })
      .then((result) => {
        const maps = Array.isArray(result?.maps) ? result.maps : [];
        return Promise.all(
          maps.map((map) =>
            mapApi.bookableUnits(map.id, {
              date: form.date,
              timeFrom: eveningCandidateTime,
              bookingKind: 'TABLE'
            }).then((payload) => (
              Array.isArray(payload?.units)
                ? payload.units.map((unit) => {
                  const tableId = Number(unit.tableId || String(unit.id || '').replace(/^table:/, ''));
                  return {
                    ...unit,
                    id: tableId,
                    tableId,
                    eveningMapId: map.id
                  };
                })
                : []
            )).catch(() => [])
          )
        );
      })
      .then((groups) => {
        if (cancelled) return;
        const units = groups.flat();
        setEveningUnitsState({ loading: false, error: '', units });
        setEveningTableOverride((current) => {
          if (!current?.code) return current;
          const code = String(current.code).trim().toUpperCase();
          return units.find((unit) => String(unit.code || '').trim().toUpperCase() === code) || current;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setEveningUnitsState({ loading: false, error: error?.message || 'Failed to load evening pier tables.', units: [] });
      });
    return () => { cancelled = true; };
  }, [form.date, eveningCandidateTime]);

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

    const padding = isMobileViewport ? 8 : MAP_PADDING;
    const bounds = getUsefulContentBounds(state.result.map);
    const fit = getInitialViewTransform(mapDimensions.width, mapDimensions.height, viewportSize.width, viewportSize.height, padding, bounds);
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
  }, [mapDimensions.height, mapDimensions.width, mapRenderFrame.height, mapRenderFrame.width, state.result, viewportSize.height, viewportSize.width, isMobileViewport]);

  const bookableUnitByTableId = useMemo(() => new Map(
    bookableUnitsState.units
      .map((unit) => {
        const tableId = Number(unit.tableId || String(unit.id || '').replace(/^table:/, ''));
        return Number.isFinite(tableId) && tableId > 0 ? [tableId, unit] : null;
      })
      .filter(Boolean)
  ), [bookableUnitsState.units]);

  const enrichedTables = useMemo(() => {
    if (!state.result) return [];
    return state.result.map.zones.flatMap((zone) => zone.tables).map((table) => {
      const unit = bookableUnitByTableId.get(Number(table.id));
      if (!unit) return table;
      return {
        ...table,
        ...unit,
        id: table.id,
        tableId: table.id,
        status: unit.status || table.status
      };
    });
  }, [bookableUnitByTableId, state.result]);

  useEffect(() => {
    setSelectedTable(selectedTableId ? enrichedTables.find((item) => item.id === selectedTableId) || null : null);
  }, [selectedTableId, enrichedTables]);

  useEffect(() => {
    fetch('/api/position-types')
      .then((r) => r.json())
      .then((body) => { if (Array.isArray(body)) setPositionTypes(body); })
      .catch(() => {});
  }, []);

  const selectedTablePhoto = useMemo(() => {
    if (!selectedTable) return null;
    if (selectedTable.photoUrl) return selectedTable.photoUrl;
    const pt = positionTypes.find((t) => t.value === selectedTable.positionType);
    return pt?.photoUrl || null;
  }, [selectedTable, positionTypes]);

  const tableById = useMemo(() => {
    return new Map(enrichedTables.map((table) => [table.id, table]));
  }, [enrichedTables]);
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
  const tableObjectById = useMemo(() => new Map(
    renderObjects.filter((object) => object.tableId).map((object) => [Number(object.tableId), object])
  ), [renderObjects]);
  const bookingGroupSuggestion = useMemo(() => {
    const primary = selectedObjectTable || selectedTable;
    if (!primary) return { required: false, complete: false, tables: [], totalCapacity: 0 };

    const primaryCapacity = Math.max(1, Number(primary.seatsMax || 1));
    if (form.guests <= primaryCapacity) {
      return { required: false, complete: true, tables: [primary], totalCapacity: primaryCapacity };
    }

    const primaryObject = tableObjectById.get(Number(primary.id));
    const primaryCenter = primaryObject ? getObjectCenter(primaryObject) : { x: Number(primary.mapX || 0), y: Number(primary.mapY || 0) };
    const candidates = enrichedTables
      .filter((table) => table.id !== primary.id && table.status === 'free' && table.bookingKind === primary.bookingKind)
      .map((table) => {
        const object = tableObjectById.get(Number(table.id));
        const center = object ? getObjectCenter(object) : { x: Number(table.mapX || 0), y: Number(table.mapY || 0) };
        const distance = Math.hypot(center.x - primaryCenter.x, center.y - primaryCenter.y);
        return {
          table,
          sameType: table.positionType === primary.positionType ? 0 : 1,
          sameZone: Number(table.zoneId) === Number(primary.zoneId) ? 0 : 1,
          distance
        };
      })
      .sort((left, right) => left.sameType - right.sameType || left.sameZone - right.sameZone || left.distance - right.distance);

    const tables = [primary];
    let totalCapacity = primaryCapacity;
    for (const candidate of candidates) {
      if (totalCapacity >= form.guests) break;
      tables.push(candidate.table);
      totalCapacity += Math.max(1, Number(candidate.table.seatsMax || 1));
    }

    return { required: true, complete: totalCapacity >= form.guests, tables, totalCapacity };
  }, [enrichedTables, form.guests, selectedObjectTable, selectedTable, tableObjectById]);
  const selectedBookingTableIds = useMemo(
    () => new Set(bookingGroupSuggestion.tables.map((table) => Number(table.id))),
    [bookingGroupSuggestion.tables]
  );
  const selectedObjectLabel = selectedObject ? localizeField(selectedObject.label, locale) || selectedObject.type : '';
  const selectedObjectCanBook = Boolean(
    selectedObjectTable &&
    selectedObjectTable.status === 'free' &&
    tableFitsGuests(selectedObjectTable)
  );

  const selectedObjectTablePhoto = useMemo(() => {
    if (!selectedObjectTable) return null;
    if (selectedObjectTable.photoUrl) return selectedObjectTable.photoUrl;
    const pt = positionTypes.find((t) => t.value === selectedObjectTable.positionType);
    return pt?.photoUrl || null;
  }, [selectedObjectTable, positionTypes]);

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

  const canInteractWithMap = Boolean(state.result && safeTransform.initial);
  const resetTransform = safeTransform.initial || {
    scale: 1,
    translateX: 0,
    translateY: 0
  };

  useEffect(() => {
    transformRef.current = safeTransform;
  }, [safeTransform]);

  useEffect(() => () => {
    window.clearTimeout(autoFocusTimerRef.current);
    window.clearTimeout(twoFingerHintTimerRef.current);
  }, []);

  function showMapGestureHint() {
    setShowTwoFingerHint(true);
    window.clearTimeout(twoFingerHintTimerRef.current);
    twoFingerHintTimerRef.current = window.setTimeout(() => setShowTwoFingerHint(false), 900);
  }

  function applyTransform(nextScale, nextX, nextY) {
    if (!state.result || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const constrained = clampTranslate(mapRenderFrame.width, mapRenderFrame.height, rect.width, rect.height, nextScale, nextX, nextY);
    setTransform((current) => ({ ...(current || safeTransform), scale: nextScale, translateX: constrained.translateX, translateY: constrained.translateY }));
  }

  function zoomTo(nextScale, pivotX, pivotY) {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const boundedScale = clamp(nextScale, safeTransform.minScale || 0.45, safeTransform.maxScale || 3.5);
    if (!Number.isFinite(boundedScale)) return;
    autoFocusScaleRef.current = boundedScale;
    const localX = Number.isFinite(pivotX) ? pivotX : rect.width / 2;
    const localY = Number.isFinite(pivotY) ? pivotY : rect.height / 2;
    const anchored = zoomAroundViewportPoint(localX, localY, boundedScale, safeTransform.scale || 1, safeTransform.translateX || 0, safeTransform.translateY || 0);
    if (Number.isFinite(anchored.translateX) && Number.isFinite(anchored.translateY)) {
      applyTransform(boundedScale, anchored.translateX, anchored.translateY);
    }
  }

  function fitWholeMap() {
    setActiveZoneFocusId('all');
    autoFocusScaleRef.current = null;
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
    const nextScale = clamp(Math.min(availableWidth / width, availableHeight / height), safeTransform.minScale, safeTransform.maxScale);
    const centerX = (Number(bounds.x) || 0) + width / 2;
    const centerY = (Number(bounds.y) || 0) + height / 2;
    const nextX = rect.width / 2 - centerX * nextScale;
    const nextY = rect.height / 2 - centerY * nextScale;

    setActiveZoneFocusId(String(zoneId));
    autoFocusScaleRef.current = null;
    applyTransform(nextScale, nextX, nextY);
  }

  function focusSelectedObject(object) {
    if (!viewportRef.current || !object) return;
    const center = getObjectCenter(object);
    const rect = viewportRef.current.getBoundingClientRect();
    const overviewScale = safeTransform.initial?.scale || safeTransform.scale || 1;
    const currentScale = safeTransform.scale || overviewScale;
    const autoFocusMinScale = Math.min(safeTransform.minScale || overviewScale, overviewScale);
    const targetScale = clamp(
      autoFocusScaleRef.current == null
        ? currentScale * 1.4
        : Math.max(currentScale, autoFocusScaleRef.current),
      autoFocusMinScale,
      safeTransform.maxScale || 3.5
    );
    const targetX = rect.width / 2 - (center.x + mapRenderFrame.offsetX) * targetScale;
    const targetY = rect.height / 2 - (center.y + mapRenderFrame.offsetY) * targetScale;

    window.clearTimeout(autoFocusTimerRef.current);
    autoFocusScaleRef.current = targetScale;
    setIsAutoFocusing(true);
    applyTransform(targetScale, targetX, targetY);
    autoFocusTimerRef.current = window.setTimeout(() => setIsAutoFocusing(false), 480);
  }

  function findBestSingleFitTable(primary) {
    if (!primary || tableFitsGuests(primary)) return primary;
    const primaryObject = tableObjectById.get(Number(primary.id));
    const primaryCenter = primaryObject ? getObjectCenter(primaryObject) : { x: Number(primary.mapX || 0), y: Number(primary.mapY || 0) };

    return enrichedTables
      .filter((table) => (
        table.id !== primary.id
        && table.status === 'free'
        && table.bookingKind === primary.bookingKind
        && Number(table.seatsMax || 0) >= form.guests
      ))
      .map((table) => {
        const object = tableObjectById.get(Number(table.id));
        const center = object ? getObjectCenter(object) : { x: Number(table.mapX || 0), y: Number(table.mapY || 0) };
        return {
          table,
          sameType: table.positionType === primary.positionType ? 0 : 1,
          sameZone: Number(table.zoneId) === Number(primary.zoneId) ? 0 : 1,
          spareCapacity: Math.max(0, Number(table.seatsMax || 0) - form.guests),
          distance: Math.hypot(center.x - primaryCenter.x, center.y - primaryCenter.y)
        };
      })
      .sort((left, right) => (
        left.sameType - right.sameType
        || left.sameZone - right.sameZone
        || left.spareCapacity - right.spareCapacity
        || left.distance - right.distance
      ))[0]?.table || null;
  }

  function clearCompletedBookingResult() {
    const isComplete = Boolean(successMessage && (!paymentUrl || embeddedPaymentStatus === 'PAID'));
    if (!isComplete) return false;

    setSuccessMessage('');
    setPaymentUrl('');
    setReservationAccess(null);
    setEmbeddedPaymentStatus('');
    setPaymentReceipt(null);
    setErrorMessage('');
    setHoldToken('');
    setGroupHoldTokens([]);
    setHoldExpiresAt('');
    setHoldError('');
    setScenarioSelected(false);
    setEveningTableOverride(null);

    const next = new URLSearchParams(window.location.search);
    next.delete('holdToken');
    next.delete('holdExpiresAt');
    next.delete('reservation');
    next.delete('t');
    setSearchParams(next, { replace: true });
    return true;
  }

  function selectTable(tableId) {
    clearCompletedBookingResult();
    setScenarioSelected(false);
    setEveningTableOverride(null);
    const requestedTable = tableById.get(tableId);
    const preferredTable = findBestSingleFitTable(requestedTable) || requestedTable;
    const preferredTableId = preferredTable?.id || tableId;
    setSelectedTableId(preferredTableId);
    setSelectedObjectId(null);
    const foundTable = tableById.get(preferredTableId);
    if (foundTable?.bookingKind) {
      setBookingKind(foundTable.bookingKind);
    }
    if (!viewportRef.current || !state.result) return;
    const foundObject = state.result.map.objects.find((item) => item.tableId === preferredTableId);
    if (!foundObject) return;
    focusSelectedObject(foundObject);
  }

  function tableFitsGuests(table) {
    return !form.guests || (form.guests >= table.seatsMin && form.guests <= table.seatsMax);
  }

  function selectObject(object) {
    const meta = parseMetaJson(object.metaJson);
    if (!mapIsSelectableMapObject(object, meta)) {
      return;
    }

    clearCompletedBookingResult();
    setScenarioSelected(false);
    setEveningTableOverride(null);
    setSelectedObjectId(object.id);
    setSelectedTableId(null);
    const foundTable = object.tableId ? tableById.get(object.tableId) : null;
    const preferredTable = findBestSingleFitTable(foundTable);
    if (preferredTable && preferredTable.id !== foundTable?.id) {
      setSelectedObjectId(null);
      setSelectedTableId(preferredTable.id);
      setBookingKind(preferredTable.bookingKind || bookingKind);
      const preferredObject = tableObjectById.get(Number(preferredTable.id));
      if (preferredObject) focusSelectedObject(preferredObject);
      return;
    }
    if (foundTable?.bookingKind) {
      setBookingKind(foundTable.bookingKind);
    }
    focusSelectedObject(object);
  }

  useEffect(() => {
    const currentTable = selectedObjectTable || selectedTable;
    if (!currentTable || tableFitsGuests(currentTable)) return;
    const preferredTable = findBestSingleFitTable(currentTable);
    if (!preferredTable || preferredTable.id === currentTable.id) return;

    setSelectedObjectId(null);
    setSelectedTableId(preferredTable.id);
    setScenarioSelected(false);
    const preferredObject = tableObjectById.get(Number(preferredTable.id));
    if (preferredObject) focusSelectedObject(preferredObject);
  }, [form.guests, enrichedTables, selectedObjectTable, selectedTable, tableObjectById]);

  function closePanel() {
    clearCompletedBookingResult();
    setSelectedTableId(null);
    setSelectedObjectId(null);
    setScenarioSelected(false);
    setEveningTableOverride(null);

    if (isMobileViewport) {
      window.setTimeout(() => {
        mapBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }

  useEffect(() => {
    if (!state.result || !safeTransform.initial) return;

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
        return;
      }
    }

    focusedFromQueryRef.current = focusKey;
    if (bookingKind === 'BEACH') {
      const leftBeachFocus = zoneFocusItems.find(item => item.zone.id === 1 || String(item.zone.id) === '1');
      if (leftBeachFocus) {
        focusZoneBounds(leftBeachFocus.zone.id, leftBeachFocus.bounds);
      }
    }
  }, [focusObjectId, focusTableId, renderObjects, state.result, tableById, safeTransform.initial, bookingKind, zoneFocusItems]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleTouchMove(event) {
      if (event.touches.length >= 2) {
        event.preventDefault();
      } else if (event.touches.length === 1 && isMobileViewport) {
        showMapGestureHint();
      }
    }

    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      viewport.removeEventListener('touchmove', handleTouchMove);
    };
  }, [state.loading, state.result, isMobileViewport]);

  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    window.clearTimeout(autoFocusTimerRef.current);
    setIsAutoFocusing(false);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, pointerType: event.pointerType });
    if (pointersRef.current.size === 1) {
      gestureMovedRef.current = false;
      dragStartRef.current = { x: event.clientX, y: event.clientY, translateX: safeTransform.translateX, translateY: safeTransform.translateY };
    }
    if (pointersRef.current.size === 2) {
      setShowTwoFingerHint(false);
      window.clearTimeout(twoFingerHintTimerRef.current);
      gestureMovedRef.current = true;
      pointersRef.current.forEach((_point, pointerId) => {
        try {
          viewportRef.current?.setPointerCapture(pointerId);
        } catch (err) {
          console.warn('Pointer capture failed:', err);
        }
      });
      const [a, b] = Array.from(pointersRef.current.values());
      if (a && b && Number.isFinite(a.x) && Number.isFinite(b.x)) {
        const rect = viewportRef.current?.getBoundingClientRect();
        const midpointX = rect ? (a.x + b.x) / 2 - rect.left : 0;
        const midpointY = rect ? (a.y + b.y) / 2 - rect.top : 0;
        const startScale = safeTransform.scale || 1;
        pinchStartRef.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          scale: startScale,
          translateX: safeTransform.translateX || 0,
          translateY: safeTransform.translateY || 0,
          worldX: (midpointX - (safeTransform.translateX || 0)) / startScale,
          worldY: (midpointY - (safeTransform.translateY || 0)) / startScale
        };
      }
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, pointerType: event.pointerType });

    if (pointersRef.current.size === 1) {
      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;
      if (isMobileViewport && event.pointerType === 'touch') {
        if (Math.hypot(dx, dy) > 8) showMapGestureHint();
        return;
      }
      if (!gestureMovedRef.current && Math.hypot(dx, dy) <= 5) return;
      if (!gestureMovedRef.current) {
        setIsDragging(true);
        try {
          viewportRef.current?.setPointerCapture(event.pointerId);
        } catch (err) {
          console.warn('Pointer capture failed:', err);
        }
      }
      gestureMovedRef.current = true;
      applyTransform(safeTransform.scale, dragStartRef.current.translateX + dx, dragStartRef.current.translateY + dy);
      return;
    }

    if (pointersRef.current.size === 2 && viewportRef.current) {
      event.preventDefault();
      const [a, b] = Array.from(pointersRef.current.values());
      if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return;

      const currentDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const rect = viewportRef.current.getBoundingClientRect();
      const midpointX = (a.x + b.x) / 2 - rect.left;
      const midpointY = (a.y + b.y) / 2 - rect.top;
      if (!Number.isFinite(midpointX) || !Number.isFinite(midpointY)) return;

      const nextScale = clamp(
        (pinchStartRef.current.scale || 1) * (1 + (currentDistance - (pinchStartRef.current.distance || 0)) * PINCH_SENSITIVITY),
        safeTransform.minScale || 0.45,
        safeTransform.maxScale || 3.5
      );
      if (!Number.isFinite(nextScale)) return;
      autoFocusScaleRef.current = nextScale;

      const nextX = midpointX - pinchStartRef.current.worldX * nextScale;
      const nextY = midpointY - pinchStartRef.current.worldY * nextScale;
      if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
        applyTransform(nextScale, nextX, nextY);
      }
    }
  }

  function handlePointerEnd(event) {
    try {
      if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
        viewportRef.current.releasePointerCapture(event.pointerId);
      }
    } catch (err) {
      console.warn('Pointer release failed:', err);
    }
    pointersRef.current.delete(event.pointerId);
    if (!pointersRef.current.size) {
      setIsDragging(false);
    } else if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.values());
      if (remaining) {
        dragStartRef.current = { x: remaining.x, y: remaining.y, translateX: safeTransform.translateX, translateY: safeTransform.translateY };
      }
    }
  }

  useEffect(() => {
    const tokens = groupHoldTokens.length ? groupHoldTokens.map((hold) => hold.holdToken) : (holdToken ? [holdToken] : []);
    if (!tokens.length) return;
    return () => { tokens.forEach((token) => holdsApi.release(token).catch(() => {})); };
  }, [groupHoldTokens, holdToken]);

  useEffect(() => {
    const activeTable = selectedObjectTable || selectedTable;
    if (!activeTable || activeTable.status !== 'free') { setHoldTimeLeft(0); return; }
    if (holdExpiresAt) {
      const expires = new Date(holdExpiresAt).getTime();
      function tick() { setHoldTimeLeft(Math.max(0, Math.floor((expires - Date.now()) / 1000))); }
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    } else {
      setHoldTimeLeft(15 * 60);
      const interval = setInterval(() => { setHoldTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)); }, 1000);
      return () => clearInterval(interval);
    }
  }, [selectedObjectTable, selectedTable, holdExpiresAt]);

  const holdTimerDisplay = holdTimeLeft > 0
    ? `${String(Math.floor(holdTimeLeft / 60)).padStart(2, '0')}:${String(holdTimeLeft % 60).padStart(2, '0')}`
    : '';

  const entryTicketType = useMemo(() => {
    if (!eventInfo) return null;
    if (activeEventSession?.admissionMode === 'FREE') return null;
    return ticketTypes.find((ticketType) => ticketType.eventSessionId === activeEventSession?.id)
      || ticketTypes.find((ticketType) => !ticketType.eventSessionId)
      || null;
  }, [eventInfo, activeEventSession, ticketTypes]);

  const eveningBookingGroupSuggestion = useMemo(() => {
    const primary = eveningTableOverride;
    if (!primary) return { required: false, complete: false, tables: [], totalCapacity: 0 };

    const primaryCapacity = Math.max(1, Number(primary.seatsMax || 1));
    if (form.guests <= primaryCapacity) {
      return { required: false, complete: true, tables: [primary], totalCapacity: primaryCapacity };
    }

    const candidates = eveningUnitsState.units
      .filter((table) => (
        Number(table.id) !== Number(primary.id)
        && table.status === 'free'
        && table.bookingKind === 'TABLE'
      ))
      .map((table) => ({
        table,
        sameZone: Number(table.zoneId) === Number(primary.zoneId) ? 0 : 1,
        sameType: table.positionType === primary.positionType ? 0 : 1,
        distance: Math.hypot(Number(table.mapX || 0) - Number(primary.mapX || 0), Number(table.mapY || 0) - Number(primary.mapY || 0))
      }))
      .sort((left, right) => left.sameZone - right.sameZone || left.sameType - right.sameType || left.distance - right.distance);

    const tables = [primary];
    let totalCapacity = primaryCapacity;
    for (const candidate of candidates) {
      if (totalCapacity >= form.guests) break;
      tables.push(candidate.table);
      totalCapacity += Math.max(1, Number(candidate.table.seatsMax || 1));
    }

    return { required: true, complete: totalCapacity >= form.guests, tables, totalCapacity };
  }, [eveningTableOverride, eveningUnitsState.units, form.guests]);

  const effectiveBookingGroupSuggestion = eveningTableOverride
    ? eveningBookingGroupSuggestion
    : bookingGroupSuggestion;

  const paymentPreview = useMemo(() => {
    const activeUnit = eveningTableOverride || selectedObjectTable || selectedTable;
    const bookingTables = effectiveBookingGroupSuggestion.tables.length ? effectiveBookingGroupSuggestion.tables : (activeUnit ? [activeUnit] : []);
    const rentalAmount = activeEventSlug ? 0 : bookingTables.reduce((sum, table) => sum + Number(table?.rentalAmount || 0), 0);
    const depositAmount = bookingTables.reduce((sum, table) => sum + Number(table?.depositAmount || 0), 0);
    const entryTicketPrice = 0;
    const entryTicketsAmount = 0;
    return {
      rentalAmount,
      depositAmount,
      entryTicketPrice,
      entryTicketsAmount,
      totalAmount: rentalAmount + depositAmount + entryTicketsAmount,
      currency: entryTicketType?.currency || 'UAH'
    };
  }, [activeEventSlug, effectiveBookingGroupSuggestion.tables, eveningTableOverride, selectedObjectTable, selectedTable, entryTicketType, form.guests]);

  async function handleBookingSubmit(event) {
    event.preventDefault();

    const activeTable = eveningTableOverride || selectedObjectTable || selectedTable;
    if (!activeTable) {
      setErrorMessage(c({ ua: 'Спочатку оберіть місце.', ru: 'Сначала выберите место.', en: 'Please select a place first.' }));
      return;
    }

    const submitBookingKind = eveningTableOverride ? 'TABLE' : (activeTable.bookingKind || resolvedBookingKind);
    const bookingTables = effectiveBookingGroupSuggestion.tables.length ? effectiveBookingGroupSuggestion.tables : [activeTable];

    if (effectiveBookingGroupSuggestion.required && !effectiveBookingGroupSuggestion.complete) {
      setErrorMessage(c({
        ua: 'На обрану кількість гостей зараз недостатньо вільних позицій поруч. Оберіть іншу зону або зверніться до адміністратора.',
        ru: 'На выбранное количество гостей сейчас недостаточно свободных позиций рядом. Выберите другую зону или обратитесь к администратору.',
        en: 'There are not enough nearby available positions for this group. Choose another zone or contact the venue.'
      }));
      return;
    }

    if (!activeEventSlug && eventDayCutoff && submitBookingKind === 'TABLE' && form.timeFrom >= eventDayCutoff) {
      setErrorMessage(c({
        ua: `З ${eventDayCutoff} столики бронюються лише разом із квитками на подію.`,
        ru: `С ${eventDayCutoff} столы бронируются только вместе с билетами на мероприятие.`,
        en: `From ${eventDayCutoff}, tables can only be booked together with event tickets.`
      }));
      return;
    }

    if (submitBookingKind === 'BEACH') {
      if (form.timeFrom > '13:00') {
        setErrorMessage(c({
          ua: 'За правилами закладу, при бронюванні пляжних послуг обовʼязкова явка гостя - до 13:00.',
          ru: 'По правилам заведения, при бронировании пляжных услуг обязательная явка гостя - до 13:00.',
          en: 'According to venue rules, for beach services bookings, the guest must arrive before 13:00.'
        }));
        return;
      }
      if (form.date === today && currentTime >= '12:00') {
        setErrorMessage(c({
          ua: 'Бронювання пляжних послуг на сьогодні можливе лише до 12:00.',
          ru: 'Бронирование пляжных услуг на сегодня возможно только до 12:00.',
          en: 'Beach services bookings for today are only available until 12:00.'
        }));
        return;
      }
    }

    if (form.date === today && form.timeFrom <= currentTime) {
      setErrorMessage(c({
        ua: 'Обраний час вже минув.',
        ru: 'Выбранное время уже прошло.',
        en: 'The selected time has already passed.'
      }));
      return;
    }

    if (!form.agreeAll) {
      setErrorMessage(c({
        ua: 'Потрібно погодитися з умовами.',
        ru: 'Нужно согласиться с условиями.',
        en: 'You need to accept the terms.'
      }));
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setPaymentUrl('');
    setReservationAccess(null);
    setEmbeddedPaymentStatus('');
    setPaymentReceipt(null);

    try {
      const hold = await holdsApi.create({
        tableId: activeTable.id,
        tableIds: bookingTables.map((table) => table.id),
        date: form.date,
        timeFrom: form.timeFrom,
        locale
      });
      const acquiredHolds = Array.isArray(hold.holds)
        ? hold.holds
        : [{ tableId: activeTable.id, holdToken: hold.holdToken }];
      setHoldToken(hold.holdToken);
      setGroupHoldTokens(acquiredHolds);
      setHoldExpiresAt(hold.expiresAt);

      const next = new URLSearchParams(window.location.search);
      next.set('holdToken', hold.holdToken);
      next.set('holdExpiresAt', hold.expiresAt);
      setSearchParams(next, { replace: true });

      const analyticsDistinctId = getDistinctId();
      captureAnalytics('booking_submitted', {
        bookingKind: submitBookingKind,
        guests: form.guests,
        tableCount: bookingTables.length,
        eventSlug: activeEventSlug || undefined
      });

      const result = await bookingsApi.create({
        mapId: eveningTableOverride?.eveningMapId || state.result?.map?.id,
        bookableUnitId: `table:${activeTable.id}`,
        bookableUnitIds: bookingTables.length > 1 ? bookingTables.map((table) => `table:${table.id}`) : undefined,
        bookingKind: submitBookingKind,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        commentCustomer: form.commentCustomer,
        eventSlug: activeEventSlug || undefined,
        includeEntryTickets: false,
        holdToken: hold.holdToken,
        holdTokens: acquiredHolds,
        analyticsDistinctId: analyticsDistinctId || undefined,
        locale
      });

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }

      setPaymentUrl('');
      setReservationAccess(result.access || null);
      setEmbeddedPaymentStatus('');
      setSuccessMessage(c({
          ua: 'Заявку на бронювання створено. Оплата не потрібна.',
          ru: 'Заявка на бронирование создана. Оплата не требуется.',
          en: 'Booking request created. No payment is required.'
        }));
      captureAnalytics('booking_confirmed', {
        booking_kind: submitBookingKind,
        guests: form.guests,
        table_count: bookingTables.length,
        event_slug: activeEventSlug || undefined
      });
      setAvailabilityRevision((current) => current + 1);

    } catch (error) {
      setErrorMessage(error.message || c({
        ua: 'Не вдалося створити бронювання.',
        ru: 'Не удалось создать бронирование.',
        en: 'Failed to create booking.'
      }));
    } finally {
      setSubmitting(false);
    }
  }

  const handleAddFavoriteFromBooking = async () => {
    try {
      if (!isLoggedIn) return;
      const tableId = eveningTableOverride?.id || selectedObjectTable?.id || selectedTable?.id;
      if (!tableId) return;
      await guestApi.addFavorite({ kind: 'table', tableId });
      captureAnalytics('favorite_unit_set', { tableId, action: 'add', context: 'booking_success' });
      setFavoriteAdded(true);
    } catch (err) {
      console.error('[UnifiedBookingPage] add favorite failed', err.message);
    }
  };

  const handleTogglePanelFavorite = async () => {
    try {
      if (!isLoggedIn) return;
      const tableId = eveningTableOverride?.id || selectedObjectTable?.id || selectedTable?.id;
      if (!tableId) return;
      if (panelFav) {
        await guestApi.removeFavorite({ kind: 'table', tableId });
        setPanelFav(false);
      } else {
        await guestApi.addFavorite({ kind: 'table', tableId });
        setPanelFav(true);
      }
      captureAnalytics('favorite_unit_set', { tableId, action: panelFav ? 'remove' : 'add', context: 'map_panel' });
    } catch (err) {
      console.error('[UnifiedBookingPage] toggle favorite failed', err.message);
    }
  };

  useEffect(() => {
    const tableId = eveningTableOverride?.id || selectedObjectTable?.id || selectedTable?.id;
    if (!isLoggedIn || !tableId) { setPanelFav(false); return; }
    let active = true;
    guestApi.favorites()
      .then((data) => {
        const favs = data.favorites || [];
        if (active) setPanelFav(favs.some((f) => f.kind === 'table' && f.tableId === tableId));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isLoggedIn, eveningTableOverride, selectedObjectTable, selectedTable]);

  const activePanelTable = selectedObjectTable || selectedTable;
  const activePanelTablePhoto = selectedObjectTablePhoto || selectedTablePhoto;
  const activePanelObject = selectedObject;
  const activePanelObjectTable = selectedObjectTable;
  const activePanelObjectMeta = selectedObjectMeta;
  const activePanelLabel = eveningTableOverride
    ? c({
      ua: `Вечірній стіл ${eveningTableOverride.code}`,
      ru: `Вечерний стол ${eveningTableOverride.code}`,
      en: `Evening table ${eveningTableOverride.code}`
    })
    : selectedObject
      ? selectedObjectLabel
      : (selectedTable ? (localizeField(selectedTable.name, locale) || selectedTable.code) : '');
  const effectivePanelTable = eveningTableOverride || activePanelTable;
  const isFreeTable = effectivePanelTable
    && effectivePanelTable.status === 'free'
    && (tableFitsGuests(effectivePanelTable) || (effectiveBookingGroupSuggestion.required && effectiveBookingGroupSuggestion.complete));
  const activeBookingKind = eveningTableOverride ? 'TABLE' : (activePanelTable?.bookingKind || resolvedBookingKind);
  const eventDayPolicy = activeEventSlug ? null : bookableUnitsState.bookingPolicy;
  const eventDayCutoff = eventDayPolicy?.cutoffTime || '';
  const eventDayLeftBeachZoneIds = eventDayPolicy?.leftBeachZoneIds || [];
  const selectedPositionKeepsNormalBeachHours = activePanelTable?.bookingKind === 'BEACH'
    && eventDayLeftBeachZoneIds.includes(Number(activePanelTable?.zoneId));
  const selectedPositionServiceUntil = eventDayPolicy
    ? (selectedPositionKeepsNormalBeachHours ? eventDayPolicy.standardBeachUntil : eventDayCutoff)
    : '';
  const activeTimeSlots = useMemo(() => {
    if (activeEventSlug) return eventArrivalSlots;
    if (eveningTableOverride) {
      return generateTableTimeSlots(form.date, today, currentTime, EVENING_TABLE_START, '22:00');
    }
    if (activeBookingKind === 'BEACH') {
      return generateTimeSlots(form.date, today, currentTime, 'BEACH');
    }
    const slots = generateTableTimeSlots(form.date, today, currentTime, '09:00', '22:00');
    return eventDayCutoff ? slots.filter((slot) => slot < eventDayCutoff) : slots;
  }, [activeEventSlug, eventArrivalSlots, activeBookingKind, eveningTableOverride, eventDayCutoff, form.date, today, currentTime]);
  const isPierBeachPosition = !eveningTableOverride && activePanelTable?.bookingKind === 'BEACH' && isPierCode(activePanelTable.code);

  const pairedEveningUnit = useMemo(() => {
    if (!activePanelTable?.code || !isPierCode(activePanelTable.code)) return null;
    const selectedCode = String(activePanelTable.code).trim().toUpperCase();
    return eveningUnitsState.units.find((unit) => String(unit.code || '').trim().toUpperCase() === selectedCode) || null;
  }, [activePanelTable, eveningUnitsState.units]);

  const tableScenarioSlots = useMemo(
    () => {
      const slots = generateTableTimeSlots(form.date, today, currentTime, '09:00', '20:00');
      return eventDayCutoff ? slots.filter((slot) => slot < eventDayCutoff) : slots;
    },
    [eventDayCutoff, form.date, today, currentTime]
  );
  const eveningScenarioSlots = useMemo(
    () => generateTableTimeSlots(form.date, today, currentTime, EVENING_TABLE_START, '22:00'),
    [form.date, today, currentTime]
  );

  useEffect(() => {
    if (!activePanelTable || !activeTimeSlots.length) return;
    if (!activeTimeSlots.includes(form.timeFrom)) {
      setForm((current) => ({ ...current, timeFrom: activeTimeSlots[0] }));
    }
  }, [activePanelTable, activeTimeSlots, form.timeFrom]);

  const renderScenarioActions = (unit, canBook) => {
    if (!unit) return null;
    if (activeEventSlug) {
      const selectedTime = eventArrivalSlots.includes(form.timeFrom) ? form.timeFrom : (eventArrivalSlots[0] || '');
      const positionCount = effectiveBookingGroupSuggestion.required ? effectiveBookingGroupSuggestion.tables.length : 1;
      const sessionName = localizeField(activeEventSession?.name, locale)
        || localizeField(eventInfo?.title, locale)
        || (locale === 'ua' ? 'Вечірня подія' : locale === 'ru' ? 'Вечернее событие' : 'Evening event');
      return (
        <div className="booking-scenario-stack">
          <div className="booking-scenario-card booking-event-scenario is-primary">
            <div className="booking-event-ticket-summary">
              <span className="booking-scenario-kicker">{sessionName}</span>
              <strong>{locale === 'ua' ? `${form.guests} гост. + ${positionCount === 1 ? 'бронювання столу' : `${positionCount} столики`}` : locale === 'ru' ? `${form.guests} гост. + ${positionCount === 1 ? 'бронирование стола' : `${positionCount} стола`}` : `${form.guests} guests + ${positionCount} ${positionCount === 1 ? 'table' : 'tables'}`}</strong>
              <p>{eventEntryIsFree
                ? (locale === 'ua' ? 'Вхід вільний. Вкажіть кількість гостей для бронювання столу.' : locale === 'ru' ? 'Вход свободный. Укажите количество гостей для бронирования стола.' : 'Entry is free. Enter the guest count for the table booking.')
                : (locale === 'ua' ? 'Вкажіть усіх гостей за столом, включно з тими, хто придбає квиток при вході.' : locale === 'ru' ? 'Укажите всех гостей за столом, включая тех, кто купит билет при входе.' : 'Include every guest at the table, including anyone buying a ticket at the entrance.')}</p>
              <div
                className="booking-event-quantity"
                role="group"
                aria-label={locale === 'ua' ? 'Кількість гостей' : locale === 'ru' ? 'Количество гостей' : 'Guest count'}
              >
                <button
                  type="button"
                  aria-label={locale === 'ua' ? 'Зменшити кількість гостей' : locale === 'ru' ? 'Уменьшить количество гостей' : 'Decrease guests'}
                  disabled={form.guests <= 1}
                  onClick={() => setForm((current) => ({ ...current, guests: Math.max(1, current.guests - 1) }))}
                >
                  <span aria-hidden="true">−</span>
                </button>
                <output
                  aria-live="polite"
                  aria-label={locale === 'ua' ? `${form.guests} гостей` : locale === 'ru' ? `${form.guests} гостей` : `${form.guests} guests`}
                >
                  <strong>{form.guests}</strong>
                </output>
                <button
                  type="button"
                  aria-label={locale === 'ua' ? 'Збільшити кількість гостей' : locale === 'ru' ? 'Увеличить количество гостей' : 'Increase guests'}
                  disabled={form.guests >= 20}
                  onClick={() => setForm((current) => ({ ...current, guests: Math.min(20, current.guests + 1) }))}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </div>
            <label className="booking-scenario-field">
              <span>{locale === 'ua' ? 'Час приходу' : locale === 'ru' ? 'Время прихода' : 'Arrival time'}</span>
              <select className="form-input" value={selectedTime} onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))}>
                {eventArrivalSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
            <div className="booking-event-guarantee" role="note">
              <strong>{locale === 'ua' ? 'Столик гарантовано 30 хвилин' : locale === 'ru' ? 'Стол гарантирован 30 минут' : 'Table guaranteed for 30 minutes'}</strong>
              <span>{eventEntryIsFree
                ? (locale === 'ua' ? 'Від обраного часу приходу. Після цього столик може бути переданий іншим гостям. Вхід на подію залишається вільним.' : locale === 'ru' ? 'От выбранного времени прихода. После этого стол могут передать другим гостям. Вход на мероприятие остаётся свободным.' : 'From the selected arrival time. After that the table may be released. Event entry remains free.')
                : (locale === 'ua' ? 'Бронювання столу не включає вхідні квитки. Квитки можна придбати заздалегідь або при вході в день події.' : locale === 'ru' ? 'Бронирование стола не включает входные билеты. Билеты можно купить заранее или при входе в день мероприятия.' : 'The table booking does not include entry tickets. Tickets can be bought in advance or at the entrance.')}</span>
            </div>
            <button className="btn btn-primary" type="button" disabled={!canBook || !selectedTime} onClick={() => { setBookingKind('TABLE'); setScenarioSelected(true); }}>
              {locale === 'ua' ? 'Продовжити з цим столиком' : locale === 'ru' ? 'Продолжить с этим столом' : 'Continue with this table'}
            </button>
          </div>
        </div>
      );
    }
    const isBeach = unit.bookingKind === 'BEACH';
    const isTable = unit.bookingKind === 'TABLE';
    const isPierBeach = isBeach && isPierCode(unit.code);
    const beachArrivalSlots = generateTimeSlots(form.date, today, currentTime, 'BEACH');
    const beachTime = beachArrivalSlots.includes(form.timeFrom) ? form.timeFrom : (beachArrivalSlots[0] || '');
    const tableTime = tableScenarioSlots.includes(form.timeFrom) ? form.timeFrom : (tableScenarioSlots[0] || '');
    const eveningTime = eveningScenarioSlots.includes(eveningCandidateTime)
      ? eveningCandidateTime
      : (eveningScenarioSlots[0] || EVENING_TABLE_START);
    const eveningCanBook = Boolean(pairedEveningUnit && pairedEveningUnit.status === 'free');

    function selectScenario(kind, time, tableOverride = null) {
      setBookingKind(kind);
      setForm((current) => ({ ...current, timeFrom: time }));
      setEveningTableOverride(tableOverride);
      setScenarioSelected(true);
    }

    return (
      <div className="booking-scenario-stack">
        {isBeach ? (
          <div className="booking-scenario-card is-primary">
            <div>
              <span className="booking-scenario-kicker">{locale === 'ua' ? 'Денний сценарій' : locale === 'ru' ? 'Дневной сценарий' : 'Day scenario'}</span>
              <strong>{locale === 'ua' ? 'Пляжна позиція на день' : locale === 'ru' ? 'Пляжная позиция на день' : 'Beach place for the day'}</strong>
              <p>{eventDayPolicy
                ? selectedPositionKeepsNormalBeachHours
                  ? (locale === 'ua' ? 'Явка обовʼязкова з 09:00 до 13:00. Лівий пляж працює до 20:00.' : locale === 'ru' ? 'Явка обязательна с 09:00 до 13:00. Левый пляж работает до 20:00.' : 'Arrival is required from 09:00 to 13:00. Left beach operates until 20:00.')
                  : (locale === 'ua' ? `Явка обовʼязкова з 09:00 до 13:00. У день події позиція працює до ${eventDayCutoff}.` : locale === 'ru' ? `Явка обязательна с 09:00 до 13:00. В день мероприятия позиция работает до ${eventDayCutoff}.` : `Arrival is required from 09:00 to 13:00. On the event day this place operates until ${eventDayCutoff}.`)
                : (locale === 'ua' ? 'Бронь діє на день, явка обовʼязкова з 09:00 до 13:00.' : locale === 'ru' ? 'Бронь действует на день, явка обязательна с 09:00 до 13:00.' : 'The booking is valid for the day, arrival is required from 09:00 to 13:00.')}</p>
            </div>
            {beachArrivalSlots.length ? (
              <label className="booking-scenario-field">
                <span>{locale === 'ua' ? 'Час явки' : locale === 'ru' ? 'Время прихода' : 'Arrival time'}</span>
                <select className="form-input" value={beachTime} onChange={(event) => { setForm((c) => ({ ...c, timeFrom: event.target.value })); setBookingKind('BEACH'); }}>
                  {beachArrivalSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </label>
            ) : (
              <p className="booking-scenario-alert">{locale === 'ua' ? 'На сьогодні пляжну бронь вже закрито.' : locale === 'ru' ? 'На сегодня пляжная бронь уже закрыта.' : 'Beach booking is already closed for today.'}</p>
            )}
            <button className="btn btn-primary" type="button" disabled={!canBook || !beachTime} onClick={() => selectScenario('BEACH', beachTime)}>
              {locale === 'ua' ? 'Обрати пляж' : locale === 'ru' ? 'Выбрать пляж' : 'Choose beach'}
            </button>
          </div>
        ) : null}

        {isTable ? (
          <div className="booking-scenario-card">
            <div>
              <span className="booking-scenario-kicker">{locale === 'ua' ? 'Ресторан' : locale === 'ru' ? 'Ресторан' : 'Restaurant'}</span>
              <strong>{locale === 'ua' ? 'Бронь столу' : locale === 'ru' ? 'Бронь стола' : 'Table booking'}</strong>
              <p>{eventDayPolicy
                ? (locale === 'ua' ? `Оберіть час приходу. У день події звичайна посадка працює до ${eventDayCutoff}.` : locale === 'ru' ? `Выберите время прихода. В день мероприятия обычная посадка работает до ${eventDayCutoff}.` : `Choose an arrival time. On the event day regular seating operates until ${eventDayCutoff}.`)
                : (locale === 'ua' ? 'Оберіть час приходу, місце буде закріплено до закриття закладу.' : locale === 'ru' ? 'Выберите время прихода, место будет закреплено до закрытия заведения.' : 'Choose arrival time, the place is kept until venue closing.')}</p>
            </div>
            <label className="booking-scenario-field">
              <span>{locale === 'ua' ? 'Час приходу' : locale === 'ru' ? 'Время прихода' : 'Arrival time'}</span>
              <select className="form-input" value={tableTime} onChange={(event) => { setForm((c) => ({ ...c, timeFrom: event.target.value })); setBookingKind('TABLE'); }}>
                {tableScenarioSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
            <button className="btn btn-primary" type="button" disabled={!canBook || !tableTime} onClick={() => selectScenario('TABLE', tableTime)}>
              {locale === 'ua' ? 'Обрати стіл' : locale === 'ru' ? 'Выбрать стол' : 'Choose table'}
            </button>
          </div>
        ) : null}

        {isPierBeach ? (
          <div className="booking-scenario-card is-evening">
            <div>
              <span className="booking-scenario-kicker">{locale === 'ua' ? 'Після 20:00' : locale === 'ru' ? 'После 20:00' : 'After 20:00'}</span>
              <strong>{locale === 'ua' ? 'Вечірній стіл на пірсі' : locale === 'ru' ? 'Вечерний стол на пирсе' : 'Evening pier table'}</strong>
              <p>{locale === 'ua' ? 'Та сама позиція ввечері працює як стіл.' : locale === 'ru' ? 'Эта же позиция вечером работает как стол.' : 'The same place works as a table in the evening.'}</p>
            </div>
            <label className="booking-scenario-field">
              <span>{locale === 'ua' ? 'Час приходу' : locale === 'ru' ? 'Время прихода' : 'Arrival time'}</span>
              <select className="form-input" value={eveningTime} onChange={(event) => { setEveningCandidateTime(event.target.value); setBookingKind('TABLE'); }}>
                {eveningScenarioSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </label>
            {eveningUnitsState.loading ? (
              <p className="booking-scenario-alert">{locale === 'ua' ? 'Шукаємо вечірній стіл...' : locale === 'ru' ? 'Ищем вечерний стол...' : 'Looking for the evening table...'}</p>
            ) : !pairedEveningUnit ? (
              <p className="booking-scenario-alert">{locale === 'ua' ? 'Для цієї позиції ще не привʼязаний вечірній стіл.' : locale === 'ru' ? 'Для этой позиции еще не привязан вечерний стол.' : 'No linked evening table is configured for this place yet.'}</p>
            ) : pairedEveningUnit.status !== 'free' ? (
              <p className="booking-scenario-alert">{locale === 'ua' ? 'На цей час вечірній стіл зайнятий.' : locale === 'ru' ? 'На это время вечерний стол занят.' : 'The evening table is busy at this time.'}</p>
            ) : null}
            <button className="btn btn-primary" type="button" disabled={!eveningCanBook || !eveningTime} onClick={() => selectScenario('TABLE', eveningTime, pairedEveningUnit)}>
              {locale === 'ua' ? 'Обрати вечірній стіл' : locale === 'ru' ? 'Выбрать вечерний стол' : 'Choose evening table'}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const sidePanelOpen = Boolean(activePanelTable || activePanelObject || successMessage || submitting);

  useEffect(() => {
    if (!isMobileViewport || sidePanelOpen || !zoneTabsRef.current) {
      return undefined;
    }

    const scrollTimer = window.setTimeout(() => {
      const tabs = zoneTabsRef.current;
      const activeTab = tabs?.querySelector('.public-map-zone-tab.active');
      if (!tabs || !activeTab) return;

      const targetLeft = activeTab.offsetLeft - (tabs.clientWidth - activeTab.offsetWidth) / 2;
      tabs.scrollLeft = Math.max(0, targetLeft);
    }, 40);

    return () => window.clearTimeout(scrollTimer);
  }, [activeZoneFocusId, isMobileViewport, sidePanelOpen]);

  useEffect(() => {
    if (sidePanelOpen && isMobileViewport && sidePanelRef.current) {
      const scrollTimer = setTimeout(() => {
        sidePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 1200);
      return () => clearTimeout(scrollTimer);
    }
  }, [sidePanelOpen, isMobileViewport]);

  const sidePanelStyle = isMobileViewport
    ? {
        display: sidePanelOpen ? 'block' : 'none',
        position: 'relative',
        top: 0,
        width: '100%',
        height: 'auto',
        maxHeight: 'none',
        marginTop: 12,
        borderRadius: '18px',
        transform: 'none',
        transition: 'none',
        zIndex: 1,
        background: 'var(--bg)',
        overflow: 'visible',
        border: '1px solid var(--line)',
        padding: '16px',
        boxSizing: 'border-box'
      }
    : {
        display: 'block',
        position: 'sticky',
        top: 80,
        height: 'auto',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 1,
        background: 'var(--bg)',
        padding: '0',
        boxSizing: 'border-box',
        borderLeft: '1px solid var(--line)',
        borderRadius: '0 18px 18px 0'
      };

  const dateOptions = useMemo(() => {
    if (activeEventSlug) return eventDateOptions;
    const list = [];
    const minDateStr = resolvedBookingKind === 'BEACH' && currentTime >= '12:00' ? defaultDate : today;

    let baseDate;
    try {
      baseDate = new Date(minDateStr);
      if (isNaN(baseDate.getTime())) {
        baseDate = new Date();
      }
    } catch {
      baseDate = new Date();
    }

    for (let i = 0; i < 5; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      let label = '';
      if (dateStr === today) {
        label = c({ ua: 'Сьогодні', ru: 'Сегодня', en: 'Today' });
      } else if (dateStr === defaultDate) {
        label = c({ ua: 'Завтра', ru: 'Завтра', en: 'Tomorrow' });
      } else {
        const weekday = d.toLocaleDateString(locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'Europe/Kyiv', weekday: 'short' });
        const dayMonth = d.toLocaleDateString(locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'short' });
        const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        label = `${formattedWeekday}, ${dayMonth}`;
      }

      list.push({ date: dateStr, label });
    }
    return list;
  }, [activeEventSlug, eventDateOptions, resolvedBookingKind, currentTime, defaultDate, today, locale, c]);

  if (state.loading) {
    return <div className="state-msg">{t('mapLoading') || 'Loading map...'}</div>;
  }

  if (state.error || !state.result) {
    return <div className="state-msg state-error">{state.error || t('mapLoadFailed')}</div>;
  }

  return (
    <div className="unified-booking-page">
      <div className="section-header">
        <div>
          <h1>{activeEventSlug ? (localizeField(eventInfo?.title, locale) || (locale === 'ua' ? 'Бронювання на подію' : locale === 'ru' ? 'Бронирование на мероприятие' : 'Event booking')) : t('mapTitle')}</h1>
          <p className="muted">{activeEventSlug
            ? (eventEntryIsFree
                ? (locale === 'ua' ? 'Оберіть столик на вечірній мапі. Дату та умови вільного входу ми вже врахували.' : locale === 'ru' ? 'Выберите стол на вечерней карте. Дату и условия свободного входа мы уже учли.' : 'Choose a table on the evening map. The date and free-entry conditions are already applied.')
                : (locale === 'ua' ? 'Оберіть столик та вкажіть усіх гостей. Вхідні квитки купуються окремо — заздалегідь або при вході.' : locale === 'ru' ? 'Выберите стол и укажите всех гостей. Входные билеты покупаются отдельно — заранее или при входе.' : 'Choose a table and include every guest. Entry tickets are purchased separately, in advance or at the entrance.'))
            : t('mapSubtitle')}</p>
        </div>
      </div>

      <div className="map-filter-bar unified-booking-filter">
        <div className="quick-date-switcher unified-date-switcher">
          {activeEventSlug && dateOptions.length === 1 ? (
            <div className="booking-event-single-session">
              <strong>{localizeField(dateOptions[0].sessionName, locale) || dateOptions[0].label}</strong>
              <span>{dateOptions[0].fullLabel}</span>
            </div>
          ) : dateOptions.map((opt) => {
            const isActive = form.date === opt.date;
            return (
              <button
                key={opt.date}
                type="button"
                className={`quick-date-btn ${isActive ? 'active' : ''}`}
                onClick={() => setForm((current) => ({ ...current, date: opt.date }))}
              >
                {activeEventSlug ? (localizeField(opt.sessionName, locale) || opt.label) : opt.label}
              </button>
            );
          })}
        </div>
        {!activeEventSlug ? <label className="booking-compact-field">
          {t('mapDate') || (locale === 'ua' ? 'Дата' : locale === 'ru' ? 'Дата' : 'Date')}
          <input type="date" className="form-input booking-compact-control" value={form.date} min={today} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} />
        </label> : null}
        <div className="booking-compact-field">
          <span>{activeEventSlug
            ? (locale === 'ua' ? 'Кількість гостей' : locale === 'ru' ? 'Количество гостей' : 'Guest count')
            : (t('mapGuests') || (locale === 'ua' ? 'Гостей' : locale === 'ru' ? 'Гостей' : 'Guests'))}</span>
          <div className="booking-guests-stepper" role="group" aria-label={t('mapGuests') || 'Guests'}>
            <output className="booking-guests-value" aria-live="polite">{form.guests}</output>
            <div className="booking-guests-arrows">
              <button
                type="button"
                aria-label={locale === 'ua' ? 'Збільшити кількість гостей' : locale === 'ru' ? 'Увеличить количество гостей' : 'Increase guests'}
                disabled={form.guests >= 20}
                onClick={() => setForm((current) => ({ ...current, guests: Math.min(20, current.guests + 1) }))}
              >
                <span aria-hidden="true">▲</span>
              </button>
              <button
                type="button"
                aria-label={locale === 'ua' ? 'Зменшити кількість гостей' : locale === 'ru' ? 'Уменьшить количество гостей' : 'Decrease guests'}
                disabled={form.guests <= 1}
                onClick={() => setForm((current) => ({ ...current, guests: Math.max(1, current.guests - 1) }))}
              >
                <span aria-hidden="true">▼</span>
              </button>
            </div>
          </div>
        </div>
        {form.date === today && form.timeFrom <= currentTime ? (
          <p style={{ width: '100%', margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>
            {locale === 'ua' ? 'Обраний час вже минув. Будь ласка, оберіть пізніший час.' : locale === 'ru' ? 'Выбранное время уже прошло. Пожалуйста, выберите более позднее время.' : 'The selected time has already passed. Please choose a later time.'}
          </p>
        ) : form.date === today && currentTime >= '12:00' && resolvedBookingKind === 'BEACH' ? (
          <p style={{ width: '100%', margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>
            {locale === 'ua' ? 'Бронювання пляжних послуг на сьогодні закрите (після 12:00).' : locale === 'ru' ? 'Бронирование пляжных услуг на сегодня закрыто (после 12:00).' : 'Beach services bookings for today are closed (after 12:00).'}
          </p>
        ) : form.timeFrom > '13:00' && resolvedBookingKind === 'BEACH' ? (
          <p style={{ width: '100%', margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>
            {locale === 'ua' ? 'За правилами закладу, при бронюванні пляжу явка обовʼязкова до 13:00.' : locale === 'ru' ? 'По правилам заведения, при бронировании пляжа явка обязательна до 13:00.' : 'According to venue rules, arrival for beach bookings is mandatory before 13:00.'}
          </p>
        ) : null}
      </div>

      <div className="mobile-map-sticky-summary">
        <div style={{ display: 'flex', gap: '12px', color: 'var(--muted)' }}>
          <span>📅 <strong style={{color:'var(--text)'}}>{form.date.split('-').reverse().join('.')}</strong></span>
          <span>👥 <strong style={{color:'var(--text)'}}>{form.guests} {locale === 'ua' ? 'чол.' : locale === 'ru' ? 'чел.' : 'ppl.'}</strong></span>
        </div>
      </div>

      {eventDayPolicy ? (
        <aside className="booking-event-day-notice" role="note">
          <div>
            <span className="booking-event-day-notice__label">
              {locale === 'ua' ? 'Подія цього дня' : locale === 'ru' ? 'Мероприятие в этот день' : 'Event on this date'}
            </span>
            <strong>
              {localizeField(eventDayPolicy.sessionName, locale)
                || localizeField(eventDayPolicy.eventTitle, locale)
                || (locale === 'ua' ? 'Вечірня подія' : locale === 'ru' ? 'Вечернее мероприятие' : 'Evening event')}
            </strong>
            <p>
              {locale === 'ua'
                ? `З ${eventDayCutoff} столики доступні лише з квитками на подію. Усі пляжні зони, крім «Лівого пляжу», працюють до ${eventDayCutoff}.`
                : locale === 'ru'
                  ? `С ${eventDayCutoff} столы доступны только с билетами на мероприятие. Все пляжные зоны, кроме «Левого пляжа», работают до ${eventDayCutoff}.`
                  : `From ${eventDayCutoff}, tables are available only with event tickets. All beach zones except Left beach operate until ${eventDayCutoff}.`}
            </p>
          </div>
          <Link
            className="booking-event-day-notice__link"
            to={`/booking?event=${encodeURIComponent(eventDayPolicy.eventSlug)}&date=${encodeURIComponent(form.date)}&guests=${form.guests}&kind=TABLE&usageMode=EVENING`}
          >
            {locale === 'ua' ? 'Бронювати на подію' : locale === 'ru' ? 'Бронировать на мероприятие' : 'Book for the event'}
            <span aria-hidden="true">→</span>
          </Link>
        </aside>
      ) : null}

      <div className="booking-flow-guide unified-booking-guide">
        <strong>{activeEventSlug ? (locale === 'ua' ? 'Оберіть столик на вечірній мапі.' : locale === 'ru' ? 'Выберите стол на вечерней карте.' : 'Choose a table on the evening map.') : (locale === 'ua' ? '\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0446\u0435 \u043d\u0430 \u043c\u0430\u043f\u0456.' : locale === 'ru' ? '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u0435\u0441\u0442\u043e \u043d\u0430 \u043a\u0430\u0440\u0442\u0435.' : 'Choose a place on the map.')}</strong>
        <span>{activeEventSlug
          ? (eventEntryIsFree
              ? (locale === 'ua' ? 'Після вибору уточніть час приходу та оформіть бронювання столика. Вхід на подію вільний.' : locale === 'ru' ? 'После выбора уточните время прихода и оформите бронирование стола. Вход на мероприятие свободный.' : 'Then confirm the arrival time and book the table. Event entry is free.')
              : (locale === 'ua' ? 'Після вибору уточніть час приходу та кількість гостей за столом. Квитки купуються окремо або при вході.' : locale === 'ru' ? 'После выбора уточните время прихода и количество гостей за столом. Билеты покупаются отдельно или при входе.' : 'Then confirm the arrival time and number of guests at the table. Tickets are purchased separately or at the entrance.'))
          : (locale === 'ua' ? '\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0441\u0430\u043c\u0430 \u043f\u043e\u043a\u0430\u0436\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0434\u043b\u044f \u0446\u0456\u0454\u0457 \u043f\u043e\u0437\u0438\u0446\u0456\u0457.' : locale === 'ru' ? '\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0441\u0430\u043c\u0430 \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438.' : 'The system will show rules for that specific place.')}</span>
      </div>

      <div className={`map-container map-preview-container unified-booking-map-container ${isMobileViewport ? '' : 'has-panel'}`}>
        <article ref={mapBoardRef} className="map-zone-board unified-map-board">
          <div className="map-controls">
            <button type="button" className="btn btn-secondary map-control-btn" onClick={() => zoomTo(safeTransform.scale * 1.15)}>
              {t('mapZoomIn')}
            </button>
            <button type="button" className="btn btn-secondary map-control-btn" onClick={() => zoomTo(safeTransform.scale / 1.15)}>
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
            <span className="map-zoom-pill">{Math.round(safeTransform.scale * 100)}%</span>
          </div>

          {zoneFocusItems.length ? (
            <div ref={zoneTabsRef} className="public-map-zone-tabs unified-map-zone-tabs" aria-label="Map zones">
              <button
                type="button"
                className={`public-map-zone-tab ${activeZoneFocusId === 'all' ? 'active' : ''}`}
                onClick={fitWholeMap}
                aria-pressed={activeZoneFocusId === 'all'}
              >
                Вся мапа
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
            className={`public-map-shell unified-map-shell ${isDragging ? 'is-dragging' : ''}`}
            style={{
              backgroundColor: 'transparent',
              borderRadius: '18px',
              border: '0'
            }}
          >
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
                zoomTo(safeTransform.scale * 1.25, event.clientX - rect.left, event.clientY - rect.top);
              }}
            >
              <div
                className={`public-map-world ${isAutoFocusing ? 'is-auto-focusing' : ''}`}
                style={{
                  width: mapRenderFrame.width,
                  height: mapRenderFrame.height,
                  backgroundColor: state.result.map.backgroundImage
                    ? (state.result.map.backgroundColor || '#d8e7f8')
                    : 'transparent',
                  transform: `translate3d(${safeTransform.translateX}px, ${safeTransform.translateY}px, 0) scale(${safeTransform.scale})`
                }}
              >
                <div
                  className="public-map-canvas"
                  style={{
                    backgroundColor: state.result.map.backgroundImage
                      ? (state.result.map.backgroundColor || '#d8e7f8')
                      : 'transparent',
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
                      backgroundColor: state.result.map.backgroundImage
                        ? (state.result.map.backgroundColor || '#d8e7f8')
                        : 'transparent',
                      backgroundImage: state.result.map.backgroundImage ? `url(${state.result.map.backgroundImage})` : 'none'
                    }}
                  />

                  {renderObjects.map((object) => {
                    const activeTable = object.tableId ? tableById.get(object.tableId) : null;
                    const objectLabel = localizeField(object.label, locale) || object.type;
                    const meta = parseMetaJson(object.metaJson);
                    const isTableDefault = object.type === 'TABLE' && !mapHasRenderableObjectGraphic(object, meta, objectLabel);

                    if (isTableDefault && activeTable) {
                      const disabled = activeTable.status !== 'free';
                      const isGroupSelected = selectedBookingTableIds.has(Number(activeTable.id));
                      return (
                        <button
                          key={object.id}
                          type="button"
                          className={`public-map-table ${activeTable.status} ${!tableFitsGuests(activeTable) && !isGroupSelected ? 'no-fit' : ''} ${isGroupSelected ? 'selected group-selected' : ''}`}
                          style={{
                            left: object.x,
                            top: object.y,
                            width: object.width,
                            height: object.height,
                            transform: `rotate(${object.rotation}deg)`,
                            zIndex: getObjectZIndex(object),
                            borderRadius: object.width === object.height ? 999 : 8
                          }}
                          onClick={(event) => {
                            if (disabled || (event.detail !== 0 && gestureMovedRef.current)) return;
                            selectTable(activeTable.id);
                          }}
                          aria-disabled={disabled}
                          tabIndex={disabled ? -1 : 0}
                        >
                          {activeTable.code}
                        </button>
                      );
                    }

                    if (object.isActive === false) {
                      return null;
                    }

                    if (object.type === 'TEXT') {
                      const style = parseStyleJson(object.styleJson);
                      const { opacity: _opacity, ...outerStyle } = style;
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

                    const hasAsset = mapHasRenderableObjectGraphic(object, meta, objectLabel);
                    if (!hasAsset) {
                      return null;
                    }

                    const isSelectableObj = mapIsSelectableMapObject(object, meta);
                    const isGroupSelected = activeTable && selectedBookingTableIds.has(Number(activeTable.id));
                    const Component = isSelectableObj ? 'button' : 'div';
                    return (
                      <Component
                        key={object.id}
                        type={isSelectableObj ? 'button' : undefined}
                        className={`public-map-object object-${String(object.type).toLowerCase()} ${hasAsset ? 'has-asset' : ''} ${isSelectableObj ? 'selectable' : ''} ${(selectedObjectId === object.id || (selectedTableId && object.tableId === selectedTableId) || isGroupSelected) ? 'selected' : ''} ${isGroupSelected ? 'group-selected' : ''} ${activeTable ? activeTable.status : ''} ${activeTable && !tableFitsGuests(activeTable) && !isGroupSelected ? 'no-fit' : ''}`}
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
                        tabIndex={isSelectableObj ? 0 : undefined}
                        onClick={isSelectableObj ? (event) => {
                          if (event.detail !== 0 && gestureMovedRef.current) return;
                          selectObject(object);
                        } : undefined}
                      >
                        <PublicMapObjectGraphic object={object} meta={meta} label={objectLabel} />
                        {activeTable ? (
                          <span className="status-dot">
                            {activeTable.code}
                          </span>
                        ) : null}
                      </Component>
                    );
                  })}
                </div>
              </div>
              <div className={`map-gesture-guidance ${showTwoFingerHint ? 'is-visible' : ''}`} aria-hidden={!showTwoFingerHint}>
                <span className="map-two-finger-mark" aria-hidden="true" />
                <strong>{c({
                  ua: 'Переміщуйте мапу двома пальцями',
                  ru: 'Перемещайте карту двумя пальцами',
                  en: 'Use two fingers to move the map'
                })}</strong>
              </div>
            </div>
            {isMobileViewport && (selectedTable || selectedObject) && (
              <button
                type="button"
                className="floating-booking-hint"
                onClick={() => sidePanelRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 200,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  borderRadius: '30px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: 'rgba(27, 27, 30, 0.88)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <span>👇 {locale === 'ua' ? 'Перейти до бронювання' : locale === 'ru' ? 'Перейти к бронированию' : 'Proceed to booking'}</span>
              </button>
            )}
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

        <aside ref={sidePanelRef} className="unified-side-panel" style={sidePanelStyle}>
          {!sidePanelOpen ? (
            <SidePanelHint locale={locale} />
          ) : submitting ? (
            <div style={{ textAlign: 'center', padding: '40px 10px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⏳</div>
              <p style={{ fontWeight: 600, color: 'var(--text)' }}>
                {c({ ua: 'Створюємо...', ru: 'Создаем...', en: 'Creating...' })}
              </p>
            </div>
          ) : successMessage ? (
            <div className={`booking-payment-stage ${paymentUrl && embeddedPaymentStatus !== 'PAID' ? 'is-active' : 'is-complete'}`}>
              <button
                type="button"
                className="panel-close-btn"
                onClick={closePanel}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-muted, #64748b)',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '4px 8px',
                  zIndex: 10
                }}
                aria-label="Close panel"
              >
                ×
              </button>
              {paymentUrl && embeddedPaymentStatus !== 'PAID' ? (
                <a className="btn btn-primary" href={paymentUrl}>
                  {c({ ua: 'Перейти до оплати', ru: 'Перейти к оплате', en: 'Continue to payment' })}
                </a>
              ) : (
                <div className="booking-payment-complete">
                  <span className="booking-payment-complete-mark" aria-hidden="true">✓</span>
                  <strong>{successMessage}</strong>
                  {reservationAccess?.ticketCode ? (
                    <p>
                      {c({ ua: 'Код бронювання', ru: 'Код бронирования', en: 'Booking code' })}: <b>{reservationAccess.ticketCode}</b>
                    </p>
                  ) : null}
                  {(paymentReceipt?.downloadUrl || reservationAccess?.downloadUrl) ? (
                    <a className="btn btn-primary" href={paymentReceipt?.downloadUrl || reservationAccess.downloadUrl}>
                      {c({ ua: 'Завантажити PDF', ru: 'Скачать PDF', en: 'Download PDF' })}
                    </a>
                  ) : null}
                  <Link className="btn btn-secondary" to="/menu">
                    {c({ ua: 'Переглянути меню', ru: 'Посмотреть меню', en: 'View menu' })}
                  </Link>
                  <button type="button" className="btn btn-secondary" onClick={closePanel}>
                    {c({ ua: 'Забронювати ще', ru: 'Забронировать ещё', en: 'Make another booking' })}
                  </button>
                  {guestLoggedIn && !favoriteAdded ? (
                    <button type="button" className="btn btn-secondary" onClick={handleAddFavoriteFromBooking}>
                      {c({ ua: 'Додати столик в улюблене', ru: 'Добавить столик в избранное', en: 'Add table to favorites' })}
                    </button>
                  ) : null}
                  {guestLoggedIn && favoriteAdded ? (
                    <span className="btn btn-secondary" style={{ opacity: 0.7, cursor: 'default' }}>
                      {c({ ua: 'Додано в улюблене', ru: 'Добавлено в избранное', en: 'Added to favorites' })}
                    </span>
                  ) : null}
                  {!guestLoggedIn ? (
                    <Link className="btn btn-secondary" to="/cabinet">
                      {c({ ua: 'Увійти в кабінет', ru: 'Войти в кабинет', en: 'Open guest cabinet' })}
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          ) : activePanelTable && activePanelTable.status !== 'free' ? (
            <SidePanelBusy
              locale={locale}
              table={activePanelTable}
              tablePhoto={activePanelTablePhoto}
              onClose={closePanel}
            />
          ) : activePanelTable || activePanelObject ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                <h3 style={{ margin: 0, flex: 1, minWidth: 0 }}>{t('mapSelectedTitle')}</h3>
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleTogglePanelFavorite}
                    aria-label={panelFav ? 'Remove from favorites' : 'Add to favorites'}
                    title={panelFav ? c({ ua: 'Прибрати з улюбленого', ru: 'Убрать из избранного', en: 'Remove from favorites' }) : c({ ua: 'В улюблене', ru: 'В избранное', en: 'Add to favorites' })}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '22px',
                      cursor: 'pointer',
                      lineHeight: 1,
                      color: panelFav ? 'var(--accent)' : 'var(--text-muted, #64748b)',
                      padding: '4px 8px',
                      flexShrink: 0
                    }}
                  >
                    {panelFav ? '♥' : '♡'}
                  </button>
                ) : (
                  <FavTooltip type="table">
                    <button
                      type="button"
                      aria-label="Add to favorites"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '22px',
                        cursor: 'pointer',
                        lineHeight: 1,
                        color: 'var(--text-muted, #64748b)',
                        padding: '4px 8px',
                        flexShrink: 0
                      }}
                    >
                      ♡
                    </button>
                  </FavTooltip>
                )}
                <button
                  type="button"
                  className="panel-close-btn"
                  onClick={closePanel}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: 'var(--text-muted, #64748b)',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '4px 8px',
                    flexShrink: 0
                  }}
                  aria-label="Close panel"
                >
                  ×
                </button>
              </div>

              {activePanelTablePhoto || activePanelObjectMeta?.photoUrl ? (
                <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={activePanelObjectMeta?.photoUrl || activePanelTablePhoto} alt={activePanelLabel} style={{ width: '100%', display: 'block' }} />
                </div>
              ) : null}

              <p style={{ fontWeight: 600 }}>{activePanelLabel}</p>

              {(effectivePanelTable?.positionType || activePanelObjectTable?.positionType) ? (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {positionTypeLabel(effectivePanelTable?.positionType || activePanelObjectTable?.positionType, positionTypes, locale, localizedCopy)}
                </p>
              ) : null}

              {(activePanelTable?.rowSortOrder != null || activePanelObjectTable?.rowSortOrder != null) ? (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {localizeField({ ua: 'Ряд', ru: 'Ряд', en: 'Row' }, locale)} {activePanelTable?.rowSortOrder ?? activePanelObjectTable?.rowSortOrder}
                </p>
              ) : null}

              {activePanelObjectMeta?.price !== '' && activePanelObjectMeta?.price != null ? (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {t('mapPrice')}: {activePanelObjectMeta.price} {activePanelObjectMeta.priceUnit || 'UAH'}
                </p>
              ) : null}

              {(effectivePanelTable?.seatsMin != null || activePanelObjectTable?.seatsMin != null) ? (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {t('mapSeats')}: {effectivePanelTable?.seatsMin ?? activePanelObjectTable?.seatsMin}-{effectivePanelTable?.seatsMax ?? activePanelObjectTable?.seatsMax}
                </p>
              ) : null}

              {paymentPreview.totalAmount > 0 ? (
                <p className="muted" style={{ margin: '4px 0', color: 'var(--primary)', fontWeight: 600 }}>
                  {activeEventSlug ? (
                    <>{c({ ua: 'Депозит', ru: 'Депозит', en: 'Deposit' })}: {money(paymentPreview.depositAmount, paymentPreview.currency)}</>
                  ) : paymentPreview.rentalAmount > 0 ? (
                    <>{c({ ua: 'Оренда', ru: 'Аренда', en: 'Rental' })}: {money(paymentPreview.rentalAmount, paymentPreview.currency)}</>
                  ) : paymentPreview.depositAmount > 0 ? (
                    <>{c({ ua: 'Депозит', ru: 'Депозит', en: 'Deposit' })}: {money(paymentPreview.depositAmount, paymentPreview.currency)}</>
                  ) : null}
                  {paymentPreview.entryTicketsAmount > 0 ? (
                    <>{(activeEventSlug || paymentPreview.rentalAmount > 0 || paymentPreview.depositAmount > 0) ? ' + ' : ''}{c({ ua: 'Квитки', ru: 'Билеты', en: 'Tickets' })}: {money(paymentPreview.entryTicketsAmount, paymentPreview.currency)}</>
                  ) : null}
                </p>
              ) : null}

              <dl className="booking-selection-context">
                <div>
                  <dt>{c({ ua: 'Дата бронювання', ru: 'Дата бронирования', en: 'Booking date' })}</dt>
                  <dd>{locale === 'ua'
                    ? formatUkrainianDate(`${form.date}T12:00:00+03:00`)
                    : new Date(`${form.date}T12:00:00+03:00`).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                </div>
                <div>
                  <dt>{c({ ua: 'Гості за столом', ru: 'Гости за столом', en: 'Guests at the table' })}</dt>
                  <dd>{form.guests}</dd>
                </div>
              </dl>

              {holdTimerDisplay ? (
                <p className="muted" style={{ margin: '4px 0', color: 'var(--warning, #f59e0b)', fontWeight: 600 }}>
                  ⏱ {activeEventSlug ? (locale === 'ua' ? 'Час на оформлення: ' : locale === 'ru' ? 'Время на оформление: ' : 'Checkout time: ') : ''}{holdTimerDisplay}
                </p>
              ) : null}

              {effectiveBookingGroupSuggestion.required ? (
                <div className={`booking-group-suggestion ${effectiveBookingGroupSuggestion.complete ? 'is-complete' : 'is-incomplete'}`} role="note">
                  <div className="booking-group-suggestion-head">
                    <span className="booking-group-suggestion-icon" aria-hidden="true">ⓘ</span>
                    <div>
                      <strong>
                        {effectiveBookingGroupSuggestion.complete
                          ? c({
                            ua: `Для ${form.guests} гостей пропонуємо ${effectiveBookingGroupSuggestion.tables.length} позиції`,
                            ru: `Для ${form.guests} гостей предлагаем ${effectiveBookingGroupSuggestion.tables.length} позиции`,
                            en: `${effectiveBookingGroupSuggestion.tables.length} positions suggested for ${form.guests} guests`
                          })
                          : c({
                            ua: 'Потрібно більше вільних позицій',
                            ru: 'Нужно больше свободных позиций',
                            en: 'More available positions are needed'
                          })}
                      </strong>
                      <span>
                        {effectiveBookingGroupSuggestion.complete
                          ? c({
                            ua: `Загальна місткість - до ${effectiveBookingGroupSuggestion.totalCapacity} гостей. Усі позиції оформлюються однією оплатою.`,
                            ru: `Общая вместимость - до ${effectiveBookingGroupSuggestion.totalCapacity} гостей. Все позиции оформляются одной оплатой.`,
                            en: `Combined capacity is up to ${effectiveBookingGroupSuggestion.totalCapacity}. All positions use one checkout.`
                          })
                          : c({
                            ua: 'Поруч немає достатньої кількості вільних місць. Спробуйте іншу зону.',
                            ru: 'Рядом недостаточно свободных мест. Попробуйте другую зону.',
                            en: 'There are not enough nearby places. Try another zone.'
                          })}
                      </span>
                    </div>
                  </div>
                  <div className="booking-group-position-list" aria-label={c({ ua: 'Запропоновані позиції', ru: 'Предложенные позиции', en: 'Suggested positions' })}>
                    {effectiveBookingGroupSuggestion.tables.map((table) => (
                      <span key={table.id}>{table.code || localizeField(table.name, locale)}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!scenarioSelected ? (
                <>
                  {isFreeTable ? (
                    renderScenarioActions(activePanelTable, true)
                  ) : (
                    <p className="muted" style={{ marginTop: 8 }}>
                      {locale === 'ua' ? 'Ця позиція недоступна для обраної дати, часу або кількості гостей.' : locale === 'ru' ? 'Эта позиция недоступна для выбранной даты, времени или количества гостей.' : 'This object is not available for the selected date, time, or guest count.'}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => { setScenarioSelected(false); setEveningTableOverride(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, fontSize: '0.85rem' }}
                  >
                    ← {locale === 'ua' ? 'Назад до вибору' : locale === 'ru' ? 'Назад к выбору' : 'Back to options'}
                  </button>

                  <div className="unified-place-rule-card">
                    <span className="booking-scenario-kicker">
                      {activeEventSlug
                        ? (localizeField(activeEventSession?.name, locale) || localizeField(eventInfo?.title, locale))
                        : eveningTableOverride
                        ? (locale === 'ua' ? 'Вечірній пірс' : locale === 'ru' ? 'Вечерний пирс' : 'Evening pier')
                        : activeBookingKind === 'BEACH'
                        ? (locale === 'ua' ? '\u041f\u043b\u044f\u0436\u043d\u0430 \u0431\u0440\u043e\u043d\u044c' : locale === 'ru' ? '\u041f\u043b\u044f\u0436\u043d\u0430\u044f \u0431\u0440\u043e\u043d\u044c' : 'Beach booking')
                        : (locale === 'ua' ? '\u0411\u0440\u043e\u043d\u044c \u0441\u0442\u043e\u043b\u0443' : locale === 'ru' ? '\u0411\u0440\u043e\u043d\u044c \u0441\u0442\u043e\u043b\u0430' : 'Table booking')}
                    </span>
                    <strong>
                      {activeEventSlug
                        ? (locale === 'ua' ? 'Столик гарантовано 30 хвилин від часу приходу' : locale === 'ru' ? 'Стол гарантирован 30 минут от времени прихода' : 'Table guaranteed for 30 minutes from arrival time')
                        : eveningTableOverride
                        ? (locale === 'ua' ? `Столик ${eveningTableOverride.code} після 20:00` : locale === 'ru' ? `Стол ${eveningTableOverride.code} после 20:00` : `Table ${eveningTableOverride.code} after 8:00 PM`)
                        : activeBookingKind === 'BEACH'
                        ? selectedPositionServiceUntil
                          ? (locale === 'ua' ? `Явка 09:00-13:00, позиція працює до ${selectedPositionServiceUntil}` : locale === 'ru' ? `Явка 09:00-13:00, позиция работает до ${selectedPositionServiceUntil}` : `Arrival 09:00-13:00, place operates until ${selectedPositionServiceUntil}`)
                          : (locale === 'ua' ? '\u0414\u0456\u0454 \u043d\u0430 \u0434\u0435\u043d\u044c, \u044f\u0432\u043a\u0430 09:00-13:00' : locale === 'ru' ? '\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u043d\u0430 \u0434\u0435\u043d\u044c, \u044f\u0432\u043a\u0430 09:00-13:00' : 'Valid for the day, arrival 09:00-13:00')
                        : (locale === 'ua' ? '\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0447\u0430\u0441 \u043f\u0440\u0438\u0445\u043e\u0434\u0443' : locale === 'ru' ? '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0435\u043c\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0430' : 'Choose arrival time')}
                    </strong>
                    {!activeEventSlug && eventDayPolicy && activeBookingKind === 'TABLE' ? (
                      <p>{locale === 'ua' ? `Звичайна бронь столу діє до ${eventDayCutoff}. Далі доступна лише посадка за квитками на подію.` : locale === 'ru' ? `Обычная бронь стола действует до ${eventDayCutoff}. Далее доступна только посадка по билетам на мероприятие.` : `Regular table booking is valid until ${eventDayCutoff}. After that, seating is available only with event tickets.`}</p>
                    ) : null}
                    {isPierBeachPosition ? (
                      <p>{locale === 'ua' ? '\u0412\u0432\u0435\u0447\u0435\u0440\u0456 \u0446\u044f \u043f\u043e\u0437\u0438\u0446\u0456\u044f \u0437\u043c\u043e\u0436\u0435 \u043f\u0440\u0430\u0446\u044e\u0432\u0430\u0442\u0438 \u044f\u043a \u0441\u0442\u0456\u043b \u043d\u0430 \u043f\u0456\u0440\u0441\u0456.' : locale === 'ru' ? '\u0412\u0435\u0447\u0435\u0440\u043e\u043c \u044d\u0442\u0430 \u043f\u043e\u0437\u0438\u0446\u0438\u044f \u0441\u043c\u043e\u0436\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u043a\u0430\u043a \u0441\u0442\u043e\u043b \u043d\u0430 \u043f\u0438\u0440\u0441\u0435.' : 'In the evening this place can work as a pier table.'}</p>
                    ) : null}
                    {activeBookingKind === 'BEACH' ? (
                      <p className="booking-refund-warning">
                        {c({
                          ua: 'Якщо гість не прибув до 13:00, бронювання може бути скасоване, а 50% передоплати утримується за резервування місця.',
                          ru: 'Если гость не прибыл до 13:00, бронь может быть отменена, а 50% предоплаты удерживается за резервирование места.',
                          en: 'If the guest has not arrived by 1:00 PM, the booking may be cancelled and 50% of the prepayment retained for holding the place.'
                        })}
                      </p>
                    ) : null}
                    {activeEventSlug ? (
                      <p className="booking-event-final-note">
                        {eventEntryIsFree
                          ? (locale === 'ua' ? 'Якщо ви запізнюєтеся більш ніж на 30 хвилин, столик може бути переданий іншим гостям. Вхід на подію вільний.' : locale === 'ru' ? 'Если вы опаздываете более чем на 30 минут, стол могут передать другим гостям. Вход на мероприятие свободный.' : 'If you arrive more than 30 minutes late, the table may be released. Event entry is free.')
                          : (locale === 'ua' ? 'Якщо ви запізнюєтеся більш ніж на 30 хвилин, столик може бути переданий іншим гостям. Бронювання не включає квитки; їх можна придбати при вході.' : locale === 'ru' ? 'Если вы опаздываете более чем на 30 минут, стол могут передать другим гостям. Бронирование не включает билеты; их можно купить при входе.' : 'If you arrive more than 30 minutes late, the table may be released. The booking does not include tickets; they can be bought at the entrance.')}
                      </p>
                    ) : null}
                    <label className="booking-scenario-field">
                      <span>{activeBookingKind === 'BEACH'
                        ? (locale === 'ua' ? '\u0427\u0430\u0441 \u044f\u0432\u043a\u0438' : locale === 'ru' ? '\u0412\u0440\u0435\u043c\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0430' : 'Arrival time')
                        : (locale === 'ua' ? '\u0427\u0430\u0441 \u043f\u0440\u0438\u0445\u043e\u0434\u0443' : locale === 'ru' ? '\u0412\u0440\u0435\u043c\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0430' : 'Arrival time')}</span>
                      {activeTimeSlots.length ? (
                        <select
                          className="form-input"
                          value={activeTimeSlots.includes(form.timeFrom) ? form.timeFrom : activeTimeSlots[0]}
                          onChange={(event) => {
                            setForm((current) => ({ ...current, timeFrom: event.target.value }));
                            if (eveningTableOverride) setEveningCandidateTime(event.target.value);
                          }}
                        >
                          {activeTimeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                      ) : (
                        <span className="booking-scenario-alert">
                          {locale === 'ua' ? '\u041d\u0430 \u0446\u044e \u0434\u0430\u0442\u0443 \u043d\u0435\u043c\u0430\u0454 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0433\u043e \u0447\u0430\u0441\u0443.' : locale === 'ru' ? '\u041d\u0430 \u044d\u0442\u0443 \u0434\u0430\u0442\u0443 \u043d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0433\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438.' : 'No available time for this date.'}
                        </span>
                      )}
                    </label>
                  </div>

                  {holdError ? (
                    <p className="muted" style={{ color: 'var(--danger)', marginTop: 8 }}>{holdError}</p>
                  ) : null}

                  {isFreeTable ? (
                    <form className="booking-contact-form" onSubmit={handleBookingSubmit}>
                      {guestLoggedIn ? (
                        <div className="booking-guest-autofill">
                          {c({ ua: 'Ваші дані підставлено з кабінету:', ru: 'Ваши данные подставлены из кабинета:', en: 'Your details are pre-filled from your cabinet:' })}{' '}
                          <strong>{form.customerName}</strong>, {form.customerPhone}
                        </div>
                      ) : (
                      <div className="booking-contact-fields">
                        <div className="booking-contact-field">
                          <label>
                            {c({ ua: 'Імʼя', ru: 'Имя', en: 'Name' })}
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={form.customerName}
                            required
                            minLength="2"
                            onChange={(e) => setForm((current) => ({ ...current, customerName: e.target.value }))}
                          />
                        </div>
                        <div className="booking-contact-field">
                          <label>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</label>
                          <PhoneInput
                            value={form.customerPhone}
                            onChange={(v) => setForm((current) => ({ ...current, customerPhone: v }))}
                            required
                          />
                        </div>
                        <div className="booking-contact-field">
                          <label>Email</label>
                          <input
                            type="email"
                            className="form-input"
                            value={form.customerEmail}
                            required
                            aria-describedby="booking-email-purpose"
                            onChange={(e) => setForm((current) => ({ ...current, customerEmail: e.target.value }))}
                          />
                          <p id="booking-email-purpose" className="booking-email-purpose">
                            <span aria-hidden="true">i</span>
                            {activeEventSlug
                              ? (eventEntryIsFree
                                  ? c({ ua: 'Сюди надійдуть QR-код і PDF-підтвердження бронювання.', ru: 'Сюда придут QR-код и PDF-подтверждение бронирования.', en: 'The booking QR code and PDF confirmation will be sent here.' })
                                  : c({ ua: 'Сюди надійдуть QR-код і PDF-підтвердження бронювання столу. Вхідні квитки купуються окремо.', ru: 'Сюда придут QR-код и PDF-подтверждение бронирования стола. Входные билеты покупаются отдельно.', en: 'The table booking QR code and PDF confirmation will be sent here. Entry tickets are purchased separately.' }))
                              : c({ ua: 'Сюди надійдуть QR-код і PDF-підтвердження бронювання.', ru: 'Сюда придут QR-код и PDF-подтверждение бронирования.', en: 'The booking QR code and PDF confirmation will be sent here.' })}
                          </p>
                        </div>
                        <div className="booking-contact-field">
                          <label>{c({ ua: 'Коментар', ru: 'Комментарий', en: 'Comment' })}</label>
                          <textarea
                            className="form-input booking-contact-comment"
                            rows="2"
                            value={form.commentCustomer}
                            onChange={(e) => setForm((current) => ({ ...current, commentCustomer: e.target.value }))}
                          />
                        </div>
                      </div>
                      )}
                        <div className="booking-consent-row">
                          <label>
                            <input
                              type="checkbox"
                              checked={form.agreeAll}
                              onChange={(e) => setForm((current) => ({ ...current, agreeAll: e.target.checked }))}
                            />
                            <span>
                              {c({ ua: 'Я погоджуюся з ', ru: 'Я соглашаюсь с ', en: 'I agree to the ' })}
                              <Link to="/rules" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{c({ ua: 'правилами перебування', ru: 'правилами пребывания', en: 'venue rules' })}</Link>
                              {c({ ua: ', ', ru: ', ', en: ', ' })}
                              <Link to="/payment-returns" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{c({ ua: 'умовами оплати й повернення', ru: 'условиями оплаты и возврата', en: 'payment and refund terms' })}</Link>
                              {c({ ua: ' та ', ru: ' и ', en: ' and ' })}
                              <Link to="/privacy" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>{c({ ua: 'політикою конфіденційності', ru: 'политикой конфиденциальности', en: 'privacy policy' })}</Link>.
                            </span>
                          </label>
                        </div>

                    {errorMessage ? (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)' }}>{errorMessage}</p>
                    ) : null}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || !activeTimeSlots.length || !form.customerName || !form.customerPhone || !form.customerEmail || !form.agreeAll}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      {submitting
                        ? c({ ua: 'Створюємо...', ru: 'Создаем...', en: 'Creating...' })
                        : c({ ua: 'Забронювати', ru: 'Забронировать', en: 'Book' })}
                    </button>
                </form>
              ) : (
                <p className="muted" style={{ marginTop: 8 }}>
                  {locale === 'ua' ? 'Ця позиція недоступна для обраної дати, часу або кількості гостей.' : locale === 'ru' ? 'Эта позиция недоступна для выбранной даты, времени или количества гостей.' : 'This object is not available for the selected date, time, or guest count.'}
                </p>
              )}
              </>
            )}
          </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
