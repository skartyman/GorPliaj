import { useMemo } from 'react';
import { getInitialViewTransform } from '../lib/map';

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

function TablePreview({ table, selected, scale, offsetX, offsetY }) {
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
    <div
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
        whiteSpace: 'nowrap'
      }}
    >
      {w > 16 && h > 12 ? (table.code || '') : ''}
    </div>
  );
}

export default function MapPreview({ mapData, mapObjects = [], units, selectedTableId, onOpenFullMap, height = 220 }) {
  const containerRef = useMemo(() => {
    if (!mapData) return null;
    const mapWidth = mapData.width || 1200;
    const mapHeight = mapData.height || 760;
    const paddedHeight = height - 8;
    const availableWidth = typeof window !== 'undefined'
      ? Math.min(window.innerWidth - 64, 560)
      : 400;
    const viewWidth = Math.min(availableWidth, 560);
    const viewHeight = paddedHeight;
    const transform = getInitialViewTransform(mapWidth, mapHeight, viewWidth, viewHeight, 12);
    return { transform, viewWidth, viewHeight, mapWidth, mapHeight };
  }, [mapData, height]);

  if (!mapData || !containerRef) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        Завантаження мапи закладу...
      </div>
    );
  }

  const { transform, viewWidth, viewHeight, mapWidth, mapHeight } = containerRef;
  const { scale, translateX, translateY } = transform;

  const allTables = useMemo(() => {
    return units?.filter((u) => u.mapX != null).map((u) => ({
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
  }, [units]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          height,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          background: mapData.backgroundColor || '#f8fafc',
          position: 'relative'
        }}
      >
        {mapData.backgroundImage ? (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            backgroundImage: `url(${mapData.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
        ) : null}

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
              position: 'relative'
            }}
          >
            {mapObjects.map((object) => (
              <MapObjectShape
                key={object.id}
                object={object}
                scale={scale}
                offsetX={0}
                offsetY={0}
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
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 6, textAlign: 'center' }}>
        <button type="button" className="btn btn-secondary btn-small" onClick={onOpenFullMap}>
          Відкрити повну мапу закладу
        </button>
      </div>
    </div>
  );
}
