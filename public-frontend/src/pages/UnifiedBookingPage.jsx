import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { holdsApi, mapApi, bookingsApi, eventsApi } from '../lib/api';
import { clamp, clampTranslate, getInitialViewTransform, getObjectCenter, getPublicMapData, zoomAroundViewportPoint, getUsefulContentBounds } from '../lib/map';
import { localizeField, localizedCopy } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';
import { generateTimeSlots, getDefaultTime } from '../utils/timeSlots';
import {
  formatPhone,
  money,
  getUnitDisplayName,
  formatUkrainianDate,
  bookingKindTitle,
  unitStatusLabel,
  positionTypeLabel,
  findEventForDate,
  getEventDateRange,
  formatEventRangeLabel,
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
        {locale === 'ua' ? 'Оберіть місце на карті' : locale === 'ru' ? 'Выберите место на карте' : 'Select a place on the map'}
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0, minScale: 0.45, maxScale: 3.5, initial: null });
  const safeTransform = transform || { scale: 1, translateX: 0, translateY: 0, minScale: 0.45, maxScale: 3.5, initial: null };
  const viewportRef = useRef(null);
  const sidePanelRef = useRef(null);
  const focusedFromQueryRef = useRef('');
  const pointersRef = useRef(new Map());
  const dragStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: 1, translateX: 0, translateY: 0 });
  const transformRef = useRef(safeTransform);
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
    guests: Number(searchParams.get('guests') || '2'),
    timeFrom: searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    commentCustomer: '',
    agreeAll: false
  });

  const [holdToken, setHoldToken] = useState(searchParams.get('holdToken') || '');
  const [holdExpiresAt, setHoldExpiresAt] = useState(searchParams.get('holdExpiresAt') || '');
  const [holdAcquiring, setHoldAcquiring] = useState(false);
  const [holdError, setHoldError] = useState('');
  const [holdTimeLeft, setHoldTimeLeft] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reservationAccess, setReservationAccess] = useState(null);

  const [positionTypes, setPositionTypes] = useState([]);
  const [eventOptionsState, setEventOptionsState] = useState({ loading: false, error: '', events: [] });
  const [eventInfo, setEventInfo] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);

  const [bookingFlow] = useState('STANDARD');
  const activeEventSlug = '';

  const [eveningCandidateTime, setEveningCandidateTime] = useState(
    searchParams.get('timeFrom') >= EVENING_TABLE_START ? searchParams.get('timeFrom') : EVENING_TABLE_START
  );
  const [eveningUnitsState, setEveningUnitsState] = useState({ loading: false, error: '', units: [] });
  const [scenarioSelected, setScenarioSelected] = useState(false);

  useMeta(`${t('mapTitle')} · GorPliaj`, 'Interactive venue map with live table statuses.');

  const mapId = searchParams.get('mapId') || '';
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

  const matchedEventForDate = useMemo(() => findEventForDate(eventOptionsState.events, form.date), [eventOptionsState.events, form.date]);
  const usageMode = activeEventSlug ? 'EVENING' : 'DAY';
  const resolvedBookingKind = activeEventSlug ? 'TABLE' : bookingKind;

  const timeSlots = useMemo(() => {
    return generateTimeSlots(form.date, today, currentTime, resolvedBookingKind);
  }, [form.date, today, currentTime, resolvedBookingKind]);

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
    mapApi.list({ usageMode, guests: form.guests })
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
  }, [usageMode, resolvedBookingKind, form.guests, form.date, form.timeFrom, setSearchParams, searchParams]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    getPublicMapData(mapApi, { date: form.date, timeFrom: form.timeFrom, mapId, draft: searchParams.get('draft') === '1' })
      .then((result) => setState({ loading: false, error: '', result }))
      .catch((error) => setState({ loading: false, error: error?.message || t('mapLoadFailed'), result: null }));
  }, [form.date, form.timeFrom, mapId, t, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setEveningUnitsState({ loading: true, error: '', units: [] });
    mapApi.list({ usageMode: 'EVENING', bookingKind: 'TABLE', guests: form.guests })
      .then((result) => {
        const maps = Array.isArray(result?.maps) ? result.maps : [];
        return Promise.all(
          maps.map((map) =>
            mapApi.bookableUnits(map.id, {
              date: form.date,
              timeFrom: eveningCandidateTime,
              guests: form.guests,
              bookingKind: 'TABLE'
            }).then((payload) => (
              Array.isArray(payload?.units)
                ? payload.units.map((unit) => ({ ...unit, eveningMapId: map.id }))
                : []
            )).catch(() => [])
          )
        );
      })
      .then((groups) => {
        if (cancelled) return;
        setEveningUnitsState({ loading: false, error: '', units: groups.flat() });
      })
      .catch((error) => {
        if (cancelled) return;
        setEveningUnitsState({ loading: false, error: error?.message || 'Failed to load evening pier tables.', units: [] });
      });
    return () => { cancelled = true; };
  }, [form.date, eveningCandidateTime, form.guests]);

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

  useEffect(() => {
    if (!state.result) return;
    const tables = state.result.map.zones.flatMap((zone) => zone.tables);
    setSelectedTable(selectedTableId ? tables.find((item) => item.id === selectedTableId) || null : null);
  }, [selectedTableId, state.result]);

  useEffect(() => {
    fetch('/api/position-types')
      .then((r) => r.json())
      .then((body) => { if (Array.isArray(body)) setPositionTypes(body); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setEventOptionsState((current) => ({ ...current, loading: true, error: '' }));
    eventsApi.list(false)
      .then((events) => {
        if (cancelled) return;
        const availableEvents = Array.isArray(events)
          ? events.filter((event) => ['BOOKING', 'BOTH'].includes(event.ctaType))
          : [];
        setEventOptionsState({ loading: false, error: '', events: availableEvents });
      })
      .catch((error) => {
        if (cancelled) return;
        setEventOptionsState({ loading: false, error: error.message, events: [] });
      });
    return () => { cancelled = true; };
  }, []);

  const selectedTablePhoto = useMemo(() => {
    if (!selectedTable) return null;
    if (selectedTable.photoUrl) return selectedTable.photoUrl;
    const pt = positionTypes.find((t) => t.value === selectedTable.positionType);
    return pt?.photoUrl || null;
  }, [selectedTable, positionTypes]);

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
    const localX = Number.isFinite(pivotX) ? pivotX : rect.width / 2;
    const localY = Number.isFinite(pivotY) ? pivotY : rect.height / 2;
    const anchored = zoomAroundViewportPoint(localX, localY, boundedScale, safeTransform.scale || 1, safeTransform.translateX || 0, safeTransform.translateY || 0);
    if (Number.isFinite(anchored.translateX) && Number.isFinite(anchored.translateY)) {
      applyTransform(boundedScale, anchored.translateX, anchored.translateY);
    }
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
    const nextScale = clamp(Math.min(availableWidth / width, availableHeight / height), safeTransform.minScale, safeTransform.maxScale);
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
    const targetX = rect.width / 2 - (center.x + mapRenderFrame.offsetX) * safeTransform.scale;
    const targetY = rect.height * 0.5 - (center.y + mapRenderFrame.offsetY) * safeTransform.scale;
    applyTransform(safeTransform.scale, targetX, targetY);
  }

  function selectTable(tableId) {
    setSelectedTableId(tableId);
    setSelectedObjectId(null);
    const foundTable = tableById.get(tableId);
    if (foundTable?.bookingKind) {
      setBookingKind(foundTable.bookingKind);
    }
    if (!viewportRef.current || !state.result) return;
    const foundObject = state.result.map.objects.find((item) => item.tableId === tableId);
    if (!foundObject) return;
    centerOnObject(foundObject);
  }

  function tableFitsGuests(table) {
    return !form.guests || (form.guests >= table.seatsMin && form.guests <= table.seatsMax);
  }

  function selectObject(object) {
    const meta = parseMetaJson(object.metaJson);
    if (!mapIsSelectableMapObject(object, meta)) {
      return;
    }

    setSelectedObjectId(object.id);
    setSelectedTableId(null);
    const foundTable = object.tableId ? tableById.get(object.tableId) : null;
    if (foundTable?.bookingKind) {
      setBookingKind(foundTable.bookingKind);
    }
    centerOnObject(object);
  }

  function closePanel() {
    setSelectedTableId(null);
    setSelectedObjectId(null);
    setScenarioSelected(false);
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

    if (bookingKind === 'BEACH') {
      const leftBeachFocus = zoneFocusItems.find(item => item.zone.id === 1 || String(item.zone.id) === '1');
      if (leftBeachFocus) {
        focusedFromQueryRef.current = focusKey;
        focusZoneBounds(leftBeachFocus.zone.id, leftBeachFocus.bounds);
      }
    }
  }, [focusObjectId, focusTableId, renderObjects, state.result, tableById, safeTransform.initial, bookingKind, zoneFocusItems]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleTouchMove(event) {
      if (event.touches.length > 0) {
        event.preventDefault();
      }
    }

    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      viewport.removeEventListener('touchmove', handleTouchMove);
    };
  }, [state.loading, state.result]);

  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (event.pointerType !== 'touch') {
      try {
        viewportRef.current?.setPointerCapture(event.pointerId);
      } catch (err) {
        console.warn('Pointer capture failed:', err);
      }
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: event.clientX, y: event.clientY, translateX: safeTransform.translateX, translateY: safeTransform.translateY };
      setIsDragging(true);
    }
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      if (a && b && Number.isFinite(a.x) && Number.isFinite(b.x)) {
        pinchStartRef.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          scale: safeTransform.scale || 1,
          translateX: safeTransform.translateX || 0,
          translateY: safeTransform.translateY || 0
        };
      }
    }
  }

  function handlePointerMove(event) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1 && isDragging) {
      const dx = event.clientX - dragStartRef.current.x;
      const dy = event.clientY - dragStartRef.current.y;
      applyTransform(safeTransform.scale, dragStartRef.current.translateX + dx, dragStartRef.current.translateY + dy);
      return;
    }

    if (pointersRef.current.size === 2 && viewportRef.current) {
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

      const anchored = zoomAroundViewportPoint(
        midpointX,
        midpointY,
        nextScale,
        pinchStartRef.current.scale || 1,
        pinchStartRef.current.translateX || 0,
        pinchStartRef.current.translateY || 0
      );
      if (Number.isFinite(anchored.translateX) && Number.isFinite(anchored.translateY)) {
        applyTransform(nextScale, anchored.translateX, anchored.translateY);
      }
    }
  }

  function handlePointerEnd(event) {
    if (event.pointerType !== 'touch') {
      try {
        if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
          viewportRef.current.releasePointerCapture(event.pointerId);
        }
      } catch (err) {
        console.warn('Pointer release failed:', err);
      }
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
    if (!holdToken) return;
    return () => { holdsApi.release(holdToken).catch(() => {}); };
  }, [holdToken]);

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
    const range = getEventDateRange(eventInfo);
    if (!range.includes(form.date)) return null;
    return ticketTypes[0] || null;
  }, [eventInfo, form.date, ticketTypes]);

  const paymentPreview = useMemo(() => {
    const activeUnit = selectedObjectTable || selectedTable;
    const rentalAmount = Number(activeUnit?.rentalAmount || 0);
    const depositAmount = Number(activeUnit?.depositAmount || 0);
    const entryTicketPrice = Number(entryTicketType?.price || 0);
    const entryTicketsAmount = entryTicketPrice > 0 ? entryTicketPrice * Number(form.guests || 0) : 0;
    return {
      rentalAmount,
      depositAmount,
      entryTicketPrice,
      entryTicketsAmount,
      totalAmount: rentalAmount + depositAmount + entryTicketsAmount,
      currency: entryTicketType?.currency || 'UAH'
    };
  }, [selectedObjectTable, selectedTable, entryTicketType, form.guests]);

  async function handleBookingSubmit(event) {
    event.preventDefault();

    const activeTable = selectedObjectTable || selectedTable;
    if (!activeTable) {
      setErrorMessage(c({ ua: 'Спочатку оберіть місце.', ru: 'Сначала выберите место.', en: 'Please select a place first.' }));
      return;
    }

    const submitBookingKind = activeTable.bookingKind || resolvedBookingKind;

    if (submitBookingKind === 'BEACH') {
      if (form.timeFrom > '13:00') {
        setErrorMessage(c({
          ua: 'За правилами закладу, при бронюванні пляжних послуг обовʼязкова явка гостя — до 13:00.',
          ru: 'По правилам заведения, при бронировании пляжных услуг обязательная явка гостя — до 13:00.',
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

    try {
      const hold = await holdsApi.create({ tableId: activeTable.id, date: form.date, timeFrom: form.timeFrom, locale });
      setHoldToken(hold.holdToken);
      setHoldExpiresAt(hold.expiresAt);

      const next = new URLSearchParams(window.location.search);
      next.set('holdToken', hold.holdToken);
      next.set('holdExpiresAt', hold.expiresAt);
      setSearchParams(next, { replace: true });

      const result = await bookingsApi.create({
        mapId: state.result?.map?.id,
        bookableUnitId: `table:${activeTable.id}`,
        bookingKind: submitBookingKind,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        commentCustomer: form.commentCustomer,
        eventSlug: activeEventSlug || undefined,
        holdToken: hold.holdToken,
        locale
      });

      setPaymentUrl(result.paymentUrl || '');
      setReservationAccess(result.access || null);
      setSuccessMessage(result.paymentUrl
        ? c({
          ua: 'Бронювання створено. Завершіть оплату, щоб закріпити позицію.',
          ru: 'Бронирование создано. Завершите оплату, чтобы закрепить позицию.',
          en: 'Booking created. Complete the payment to secure the position.'
        })
        : c({
          ua: 'Заявку на бронювання створено. Оплата не потрібна.',
          ru: 'Заявка на бронирование создана. Оплата не требуется.',
          en: 'Booking request created. No payment is required.'
        }));

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
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

  const activePanelTable = selectedObjectTable || selectedTable;
  const activePanelTablePhoto = selectedObjectTablePhoto || selectedTablePhoto;
  const activePanelObject = selectedObject;
  const activePanelObjectTable = selectedObjectTable;
  const activePanelObjectMeta = selectedObjectMeta;
  const activePanelLabel = selectedObject
    ? selectedObjectLabel
    : (selectedTable ? (localizeField(selectedTable.name, locale) || selectedTable.code) : '');
  const isFreeTable = activePanelTable && activePanelTable.status === 'free' && tableFitsGuests(activePanelTable);
  const activeBookingKind = activePanelTable?.bookingKind || resolvedBookingKind;
  const activeTimeSlots = useMemo(() => {
    if (activeBookingKind === 'BEACH') {
      return generateTimeSlots(form.date, today, currentTime, 'BEACH');
    }
    return generateTableTimeSlots(form.date, today, currentTime, '09:00', '22:00');
  }, [activeBookingKind, form.date, today, currentTime]);
  const isPierBeachPosition = activePanelTable?.bookingKind === 'BEACH' && isPierCode(activePanelTable.code);

  const pairedEveningUnit = useMemo(() => {
    if (!activePanelTable?.code || !isPierCode(activePanelTable.code)) return null;
    const selectedCode = String(activePanelTable.code).trim().toUpperCase();
    return eveningUnitsState.units.find((unit) => String(unit.code || '').trim().toUpperCase() === selectedCode) || null;
  }, [activePanelTable, eveningUnitsState.units]);

  const tableScenarioSlots = useMemo(
    () => generateTableTimeSlots(form.date, today, currentTime, '09:00', '20:00'),
    [form.date, today, currentTime]
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

    function selectScenario(kind, time) {
      setBookingKind(kind);
      setForm((current) => ({ ...current, timeFrom: time }));
      setScenarioSelected(true);
    }

    return (
      <div className="booking-scenario-stack">
        {isBeach ? (
          <div className="booking-scenario-card is-primary">
            <div>
              <span className="booking-scenario-kicker">{locale === 'ua' ? 'Денний сценарій' : locale === 'ru' ? 'Дневной сценарий' : 'Day scenario'}</span>
              <strong>{locale === 'ua' ? 'Пляжна позиція на день' : locale === 'ru' ? 'Пляжная позиция на день' : 'Beach place for the day'}</strong>
              <p>{locale === 'ua' ? 'Бронь діє на день, явка обовʼязкова з 09:00 до 13:00.' : locale === 'ru' ? 'Бронь действует на день, явка обязательна с 09:00 до 13:00.' : 'The booking is valid for the day, arrival is required from 09:00 to 13:00.'}</p>
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
              <p>{locale === 'ua' ? 'Оберіть час приходу, місце буде закріплено до закриття закладу.' : locale === 'ru' ? 'Выберите время прихода, место будет закреплено до закрытия заведения.' : 'Choose arrival time, the place is kept until venue closing.'}</p>
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
            <button className="btn btn-primary" type="button" disabled={!eveningCanBook || !eveningTime} onClick={() => selectScenario('TABLE', eveningTime)}>
              {locale === 'ua' ? 'Обрати вечірній стіл' : locale === 'ru' ? 'Выбрать вечерний стол' : 'Choose evening table'}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const sidePanelOpen = Boolean(activePanelTable || activePanelObject);

  useEffect(() => {
    if (sidePanelOpen && isMobileViewport && sidePanelRef.current) {
      setTimeout(() => {
        sidePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [sidePanelOpen, isMobileViewport]);

  const sidePanelStyle = isMobileViewport
    ? {
        display: sidePanelOpen ? 'block' : 'none',
        position: 'relative',
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
        const weekday = d.toLocaleDateString(locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
        const dayMonth = d.toLocaleDateString(locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
        const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        label = `${formattedWeekday}, ${dayMonth}`;
      }

      list.push({ date: dateStr, label });
    }
    return list;
  }, [resolvedBookingKind, currentTime, defaultDate, today, locale, c]);

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
          <h1>{t('mapTitle')}</h1>
          <p className="muted">{t('mapSubtitle')}</p>
        </div>
      </div>

      <div className="map-filter-bar unified-booking-filter">
        <div className="quick-date-switcher" style={{ width: '100%', marginBottom: '4px' }}>
          {dateOptions.map((opt) => {
            const isActive = form.date === opt.date;
            return (
              <button
                key={opt.date}
                type="button"
                className={`quick-date-btn ${isActive ? 'active' : ''}`}
                onClick={() => setForm((current) => ({ ...current, date: opt.date }))}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {t('mapDate') || (locale === 'ua' ? 'Дата' : locale === 'ru' ? 'Дата' : 'Date')}
          <input type="date" className="form-input" value={form.date} min={today} onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))} style={{ fontSize: '0.85rem', height: 38 }} />
        </label>
        <div style={{ display: 'none' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {t('mapTime') || (locale === 'ua' ? 'Час' : locale === 'ru' ? 'Время' : 'Time')}
          {timeSlots.length === 0 ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', height: 38, display: 'flex', alignItems: 'center' }}>
              {locale === 'ua' ? 'Немає часу' : locale === 'ru' ? 'Нет времени' : 'No times'}
            </span>
          ) : (
            <select
              className="form-input"
              value={form.timeFrom}
              onChange={(e) => setForm((current) => ({ ...current, timeFrom: e.target.value }))}
              style={{ fontSize: '0.85rem', height: 38, padding: '0 8px', minWidth: 90 }}
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          )}
        </label>
        </div>
        <div style={{ display: 'none' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {t('mapGuests') || (locale === 'ua' ? 'Гостей' : locale === 'ru' ? 'Гостей' : 'Guests')}
          <input type="number" className="form-input" value={form.guests} min={1} max={20} onChange={(e) => setForm((current) => ({ ...current, guests: Number(e.target.value) || 0 }))} style={{ fontSize: '0.85rem', width: 70, height: 38 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
          {locale === 'ua' ? 'Час доби' : locale === 'ru' ? 'Время суток' : 'Time of day'}
          <span style={{ fontSize: '0.85rem', height: 38, display: 'flex', alignItems: 'center', fontWeight: 600, color: usageMode === 'EVENING' ? 'var(--brand)' : 'var(--text)' }}>
            {usageMode === 'EVENING' ? (locale === 'ua' ? 'Вечір' : locale === 'ru' ? 'Вечер' : 'Evening') : (locale === 'ua' ? 'День' : locale === 'ru' ? 'День' : 'Day')}
          </span>
        </label>
        {usageMode === 'DAY' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--muted)' }}>
            {locale === 'ua' ? 'Тип броні' : locale === 'ru' ? 'Тип брони' : 'Booking type'}
            <select
              className="form-input"
              value={bookingKind}
              onChange={(e) => setBookingKind(e.target.value)}
              style={{ fontSize: '0.85rem', height: 38, padding: '0 8px', minWidth: 110 }}
            >
              <option value="TABLE">{locale === 'ua' ? 'Стіл' : locale === 'ru' ? 'Стол' : 'Table'}</option>
              <option value="BEACH">{locale === 'ua' ? 'Пляж' : locale === 'ru' ? 'Пляж' : 'Beach'}</option>
            </select>
          </label>
        )}
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
          <span>🕒 <strong style={{color:'var(--text)'}}>{form.timeFrom}</strong></span>
          <span>👥 <strong style={{color:'var(--text)'}}>{form.guests} {locale === 'ua' ? 'чол.' : locale === 'ru' ? 'чел.' : 'ppl.'}</strong></span>
        </div>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px', cursor: 'pointer' }}>
          {locale === 'ua' ? 'Змінити' : locale === 'ru' ? 'Изменить' : 'Change'}
        </button>
      </div>

      <div className="booking-flow-guide unified-booking-guide">
        <strong>{locale === 'ua' ? '\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043c\u0456\u0441\u0446\u0435 \u043d\u0430 \u043a\u0430\u0440\u0442\u0456.' : locale === 'ru' ? '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u0435\u0441\u0442\u043e \u043d\u0430 \u043a\u0430\u0440\u0442\u0435.' : 'Choose a place on the map.'}</strong>
        <span>{locale === 'ua' ? '\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0441\u0430\u043c\u0430 \u043f\u043e\u043a\u0430\u0436\u0435 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0434\u043b\u044f \u0446\u0456\u0454\u0457 \u043f\u043e\u0437\u0438\u0446\u0456\u0457.' : locale === 'ru' ? '\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0441\u0430\u043c\u0430 \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u043f\u0440\u0430\u0432\u0438\u043b\u0430 \u0434\u043b\u044f \u044d\u0442\u043e\u0439 \u043f\u043e\u0437\u0438\u0446\u0438\u0438.' : 'The system will show rules for that specific place.'}</span>
      </div>

      <div className={`map-container map-preview-container unified-booking-map-container ${isMobileViewport ? '' : 'has-panel'}`}>
        <article className="map-zone-board unified-map-board">
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

          <div
              className={`public-map-shell unified-map-shell ${isDragging ? 'is-dragging' : ''}`}
              style={{
              backgroundColor: 'transparent',
              borderRadius: '18px',
              border: '0'
            }}
          >
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
                zoomTo(safeTransform.scale * 1.25, event.clientX - rect.left, event.clientY - rect.top);
              }}
            >
              <div
                className="public-map-world"
                style={{
                  width: mapRenderFrame.width,
                  height: mapRenderFrame.height,
                  backgroundColor: state.result.map.backgroundColor || '#d8e7f8',
                  transform: `translate3d(${safeTransform.translateX}px, ${safeTransform.translateY}px, 0) scale(${safeTransform.scale})`
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
                    const activeTable = object.tableId ? tableById.get(object.tableId) : null;
                    const objectLabel = localizeField(object.label, locale) || object.type;
                    const meta = parseMetaJson(object.metaJson);
                    const isTableDefault = object.type === 'TABLE' && !mapHasRenderableObjectGraphic(object, meta, objectLabel);

                    if (isTableDefault && activeTable) {
                      const disabled = activeTable.status !== 'free' || !tableFitsGuests(activeTable);
                      return (
                        <button
                          key={object.id}
                          type="button"
                          className={`public-map-table ${activeTable.status} ${!tableFitsGuests(activeTable) ? 'no-fit' : ''} ${selectedTableId === activeTable.id ? 'selected' : ''}`}
                          style={{
                            left: object.x,
                            top: object.y,
                            width: object.width,
                            height: object.height,
                            transform: `rotate(${object.rotation}deg)`,
                            zIndex: getObjectZIndex(object),
                            borderRadius: object.width === object.height ? 999 : 8
                          }}
                          onClick={() => selectTable(activeTable.id)}
                          onPointerDown={(event) => event.stopPropagation()}
                          disabled={disabled}
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
                    const Component = isSelectableObj ? 'button' : 'div';
                    return (
                      <Component
                        key={object.id}
                        type={isSelectableObj ? 'button' : undefined}
                        className={`public-map-object object-${String(object.type).toLowerCase()} ${hasAsset ? 'has-asset' : ''} ${isSelectableObj ? 'selectable' : ''} ${(selectedObjectId === object.id || (selectedTableId && object.tableId === selectedTableId)) ? 'selected' : ''} ${activeTable ? activeTable.status : ''} ${activeTable && !tableFitsGuests(activeTable) ? 'no-fit' : ''}`}
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
                        onPointerDown={isSelectableObj ? (event) => event.stopPropagation() : undefined}
                        onClick={isSelectableObj ? () => selectObject(object) : undefined}
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
            <div style={{ padding: '8px 0' }}>
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
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', margin: '0 0 8px' }}>
                  {successMessage}
                </p>
                {reservationAccess?.ticketCode ? (
                  <p style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                    {c({ ua: 'Код бронювання', ru: 'Код бронирования', en: 'Booking code' })}: <strong>{reservationAccess.ticketCode}</strong>
                  </p>
                ) : null}
                {paymentUrl ? (
                  <a className="btn btn-primary" href={paymentUrl} style={{ marginTop: 12, display: 'inline-block' }}>
                    {c({ ua: 'Перейти до оплати', ru: 'Перейти к оплате', en: 'Continue to payment' })}
                  </a>
                ) : null}
              </div>
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

              <h3 style={{ margin: '0 0 12px' }}>{t('mapSelectedTitle')}</h3>

              {activePanelTablePhoto || activePanelObjectMeta?.photoUrl ? (
                <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden' }}>
                  <img src={activePanelObjectMeta?.photoUrl || activePanelTablePhoto} alt={activePanelLabel} style={{ width: '100%', display: 'block' }} />
                </div>
              ) : null}

              <p style={{ fontWeight: 600 }}>{activePanelLabel}</p>

              {(activePanelTable?.positionType || activePanelObjectTable?.positionType) ? (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {positionTypeLabel(activePanelTable?.positionType || activePanelObjectTable?.positionType, positionTypes, locale, localizedCopy)}
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

              {(activePanelTable?.seatsMin != null || activePanelObjectTable?.seatsMin != null) ? (
                <p className="muted" style={{ margin: '4px 0' }}>
                  {t('mapSeats')}: {activePanelTable?.seatsMin ?? activePanelObjectTable?.seatsMin}-{activePanelTable?.seatsMax ?? activePanelObjectTable?.seatsMax}
                </p>
              ) : null}

              {paymentPreview.totalAmount > 0 ? (
                <p className="muted" style={{ margin: '4px 0', color: 'var(--primary)', fontWeight: 600 }}>
                  {c({ ua: 'Оренда', ru: 'Аренда', en: 'Rental' })}: {money(paymentPreview.rentalAmount, paymentPreview.currency)}
                  {paymentPreview.entryTicketsAmount > 0 ? (
                    <> + {c({ ua: 'Квитки', ru: 'Билеты', en: 'Tickets' })}: {money(paymentPreview.entryTicketsAmount, paymentPreview.currency)}</>
                  ) : null}
                </p>
              ) : null}

              {holdTimerDisplay ? (
                <p className="muted" style={{ margin: '4px 0', color: 'var(--warning, #f59e0b)', fontWeight: 600 }}>
                  ⏱ {holdTimerDisplay}
                </p>
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
                    onClick={() => setScenarioSelected(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, fontSize: '0.85rem' }}
                  >
                    ← {locale === 'ua' ? 'Назад до вибору' : locale === 'ru' ? 'Назад к выбору' : 'Back to options'}
                  </button>

                  <div className="unified-place-rule-card">
                    <span className="booking-scenario-kicker">
                      {activeBookingKind === 'BEACH'
                        ? (locale === 'ua' ? '\u041f\u043b\u044f\u0436\u043d\u0430 \u0431\u0440\u043e\u043d\u044c' : locale === 'ru' ? '\u041f\u043b\u044f\u0436\u043d\u0430\u044f \u0431\u0440\u043e\u043d\u044c' : 'Beach booking')
                        : (locale === 'ua' ? '\u0411\u0440\u043e\u043d\u044c \u0441\u0442\u043e\u043b\u0443' : locale === 'ru' ? '\u0411\u0440\u043e\u043d\u044c \u0441\u0442\u043e\u043b\u0430' : 'Table booking')}
                    </span>
                    <strong>
                      {activeBookingKind === 'BEACH'
                        ? (locale === 'ua' ? '\u0414\u0456\u0454 \u043d\u0430 \u0434\u0435\u043d\u044c, \u044f\u0432\u043a\u0430 09:00-13:00' : locale === 'ru' ? '\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u043d\u0430 \u0434\u0435\u043d\u044c, \u044f\u0432\u043a\u0430 09:00-13:00' : 'Valid for the day, arrival 09:00-13:00')
                        : (locale === 'ua' ? '\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0447\u0430\u0441 \u043f\u0440\u0438\u0445\u043e\u0434\u0443' : locale === 'ru' ? '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0435\u043c\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0430' : 'Choose arrival time')}
                    </strong>
                    {isPierBeachPosition ? (
                      <p>{locale === 'ua' ? '\u0412\u0432\u0435\u0447\u0435\u0440\u0456 \u0446\u044f \u043f\u043e\u0437\u0438\u0446\u0456\u044f \u0437\u043c\u043e\u0436\u0435 \u043f\u0440\u0430\u0446\u044e\u0432\u0430\u0442\u0438 \u044f\u043a \u0441\u0442\u0456\u043b \u043d\u0430 \u043f\u0456\u0440\u0441\u0456.' : locale === 'ru' ? '\u0412\u0435\u0447\u0435\u0440\u043e\u043c \u044d\u0442\u0430 \u043f\u043e\u0437\u0438\u0446\u0438\u044f \u0441\u043c\u043e\u0436\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u043a\u0430\u043a \u0441\u0442\u043e\u043b \u043d\u0430 \u043f\u0438\u0440\u0441\u0435.' : 'In the evening this place can work as a pier table.'}</p>
                    ) : null}
                    <label className="booking-scenario-field">
                      <span>{activeBookingKind === 'BEACH'
                        ? (locale === 'ua' ? '\u0427\u0430\u0441 \u044f\u0432\u043a\u0438' : locale === 'ru' ? '\u0412\u0440\u0435\u043c\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0430' : 'Arrival time')
                        : (locale === 'ua' ? '\u0427\u0430\u0441 \u043f\u0440\u0438\u0445\u043e\u0434\u0443' : locale === 'ru' ? '\u0412\u0440\u0435\u043c\u044f \u043f\u0440\u0438\u0445\u043e\u0434\u0430' : 'Arrival time')}</span>
                      {activeTimeSlots.length ? (
                        <select
                          className="form-input"
                          value={activeTimeSlots.includes(form.timeFrom) ? form.timeFrom : activeTimeSlots[0]}
                          onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))}
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
                    <form onSubmit={handleBookingSubmit} style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                            {c({ ua: 'Імʼя', ru: 'Имя', en: 'Name' })}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.customerName}
                        required
                        minLength="2"
                        onChange={(e) => setForm((current) => ({ ...current, customerName: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                        {c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        value={form.customerPhone}
                        placeholder="+38 (0XX) XXX-XX-XX"
                        required
                        minLength="7"
                        onChange={(e) => setForm((current) => ({ ...current, customerPhone: formatPhone(e.target.value) }))}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        value={form.customerEmail}
                        required={paymentPreview.totalAmount > 0}
                        onChange={(e) => setForm((current) => ({ ...current, customerEmail: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                        {c({ ua: 'Коментар', ru: 'Комментарий', en: 'Comment' })}
                      </label>
                      <textarea
                        className="form-input"
                        rows="3"
                        value={form.commentCustomer}
                        onChange={(e) => setForm((current) => ({ ...current, commentCustomer: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem', lineHeight: 1.4, color: 'var(--text)' }}>
                        <input
                          type="checkbox"
                          checked={form.agreeAll}
                          onChange={(e) => setForm((current) => ({ ...current, agreeAll: e.target.checked }))}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <span>{c({ ua: 'Я погоджуюся з правилами перебування, умовами оплати/повернення та політикою конфіденційності', ru: 'Я соглашаюсь с правилами пребывания, условиями оплаты/возврата и политикой конфиденциальности', en: 'I agree to the venue rules, payment/return terms, and privacy policy' })}</span>
                      </label>
                    </div>

                    {errorMessage ? (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)' }}>{errorMessage}</p>
                    ) : null}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || !activeTimeSlots.length || !form.customerName || !form.customerPhone || !form.agreeAll || (paymentPreview.totalAmount > 0 && !form.customerEmail)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    >
                      {submitting
                        ? c({ ua: 'Створюємо...', ru: 'Создаем...', en: 'Creating...' })
                        : c({ ua: 'Забронювати', ru: 'Забронировать', en: 'Book' })}
                    </button>
                  </div>
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
