import ObjectRenderer from '../map-common/ObjectRenderer';
import { RUNTIME_STATUS_STYLE } from '../../lib/booking-schema';
import { getLocalizedObjectName, getRuntimeStatusLabel } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

export default function RuntimeObjectRenderer({ object, mapWidth, mapHeight, status, title }) {
  const { language } = useAdminI18n();
  const statusStyle = status ? RUNTIME_STATUS_STYLE[status] : null;
  const resolvedTitle = title || getLocalizedObjectName(object, language);

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
      title={resolvedTitle}
    >
      <ObjectRenderer object={object} statusStyle={statusStyle} showLabel={object.kind === 'bookable'} />
      {status ? <small className="fp-runtime-status-chip" style={{ background: statusStyle?.badge }}>{getRuntimeStatusLabel(status, language)}</small> : null}
    </div>
  );
}
