import { useMemo, useState } from 'react';
import { resolveObjectVisualConfig } from '../../lib/editor-assets';

function getFallbackClass(shape = 'rect') {
  return `fp-render-fallback fp-render-fallback-${shape}`;
}

export default function ObjectRenderer({ object, className = '', statusStyle = null, showLabel = true }) {
  const [assetFailed, setAssetFailed] = useState(false);
  const { definition, visual, texture, mode } = useMemo(() => resolveObjectVisualConfig(object), [object]);

  const renderAsAsset = mode === 'asset' && definition?.path && !assetFailed;
  const opacity = Math.max(0.05, Math.min(Number(visual.opacity ?? 1), 1));

  return (
    <div
      className={`fp-render-root ${className}`.trim()}
      style={{
        opacity: statusStyle?.opacity ? Math.min(opacity, statusStyle.opacity) : opacity,
        border: statusStyle?.outline || undefined,
        '--object-fill': object.fill || '#334155',
        '--object-stroke': object.stroke || '#64748b',
        '--object-stroke-width': `${Math.max(1, Number(object.strokeWidth || 1))}px`
      }}
    >
      {renderAsAsset ? (
        <img
          src={definition.path}
          alt=""
          className="fp-render-asset"
          style={{ objectFit: definition.preserveAspectRatio === 'none' ? 'fill' : 'contain' }}
          onError={() => setAssetFailed(true)}
          draggable={false}
        />
      ) : (
        <div className={getFallbackClass(definition?.fallbackShape)} />
      )}

      {texture ? (
        <div
          className="fp-render-texture"
          style={{ backgroundImage: `url(${texture.path})`, backgroundSize: texture.size, opacity: texture.opacity || 0.28 }}
        />
      ) : null}

      {visual.tint ? <div className="fp-render-tint" style={{ background: visual.tint }} /> : null}
      {statusStyle?.tint ? <div className="fp-render-status-overlay" style={{ background: statusStyle.tint }} /> : null}
      {showLabel ? <span className="fp-render-label">{object.tableCode || object.label || object.name}</span> : null}
    </div>
  );
}
