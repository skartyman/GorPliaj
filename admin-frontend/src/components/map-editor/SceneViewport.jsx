import { Rnd } from 'react-rnd';
import { isObjectVisibleForLayout, snap } from './editor-utils';
import ObjectRenderer from '../map-common/ObjectRenderer';

function getClassName(object) {
  return object.kind === 'bookable' ? 'bookable' : `territory ${object.type || 'rect'}`;
}

export default function SceneViewport({
  map,
  objects,
  selectedId,
  onSelect,
  onMoveResize,
  onRotate,
  layoutMode,
  snapToGrid,
  gridSize,
  zoom,
  pan,
  onPan,
  onWheelZoom
}) {
  const enabledZoneIds = layoutMode?.enabledZoneIds || [];

  return (
    <section className="fp-viewport-wrap" onWheel={onWheelZoom}>
      <div className="fp-viewport-pan" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }} onMouseMove={onPan}>
        <div className="fp-viewport-scale" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <div className="fp-scene" style={{ width: map.width, height: map.height, background: map.backgroundColor }}>
            <div className="fp-grid" style={{ backgroundSize: `${gridSize}px ${gridSize}px` }} />
            {objects.map((obj) => {
              const isVisible = isObjectVisibleForLayout(obj, layoutMode?.code, enabledZoneIds);
              if (!isVisible) return null;
              return (
                <Rnd
                  key={obj.id}
                  bounds="parent"
                  disableDragging={obj.locked}
                  enableResizing={!obj.locked}
                  size={{ width: obj.width, height: obj.height }}
                  position={{ x: obj.x, y: obj.y }}
                  onMouseDown={() => onSelect(obj.id)}
                  onDragStop={(_, data) => onMoveResize(obj.id, { x: snap(data.x, gridSize, snapToGrid), y: snap(data.y, gridSize, snapToGrid) })}
                  onResizeStop={(_, __, ref, ___, position) =>
                    onMoveResize(obj.id, {
                      x: snap(position.x, gridSize, snapToGrid),
                      y: snap(position.y, gridSize, snapToGrid),
                      width: snap(ref.offsetWidth, gridSize, snapToGrid),
                      height: snap(ref.offsetHeight, gridSize, snapToGrid)
                    })
                  }
                  style={{ zIndex: obj.zIndex }}
                >
                  <div
                    className={`fp-object-shell ${getClassName(obj)} ${selectedId === obj.id ? 'selected' : ''} ${obj.locked ? 'locked' : ''}`}
                    style={{ transform: `rotate(${Number(obj.rotation || 0)}deg)` }}
                  >
                    <ObjectRenderer object={obj} className="fp-object-visual" />
                    <button type="button" className="fp-object-hit" onClick={() => onSelect(obj.id)} aria-label={obj.name} />
                    {selectedId === obj.id && !obj.locked ? (
                      <button type="button" className="fp-rotate-handle" onClick={() => onRotate(obj.id, 15)}>↻</button>
                    ) : null}
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
