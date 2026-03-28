import ObjectRenderer from '../map-common/ObjectRenderer';
import { RUNTIME_STATUS_STYLE } from '../../lib/booking-schema';

export default function RuntimeObjectRenderer({ object, mapWidth, mapHeight, status, title }) {
  const statusStyle = status ? RUNTIME_STATUS_STYLE[status] : null;

  return (
    <div
      className={`fp-runtime-object ${object.kind}`}
      style={{
        left: `${(object.x / mapWidth) * 100}%`,
        top: `${(object.y / mapHeight) * 100}%`,
        width: `${Math.max((object.width / mapWidth) * 100, 2)}%`,
        height: `${Math.max((object.height / mapHeight) * 100, 2)}%`,
        transform: `rotate(${Number(object.rotation || 0)}deg)`,
        zIndex: object.zIndex
      }}
      title={title}
    >
      <ObjectRenderer object={object} statusStyle={statusStyle} showLabel={object.kind === 'bookable'} />
      {status ? <small className="fp-runtime-status-chip" style={{ background: statusStyle?.badge }}>{status}</small> : null}
    </div>
  );
}
