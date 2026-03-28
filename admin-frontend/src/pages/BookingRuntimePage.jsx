import { useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import LayoutModeSelector from '../components/map-runtime/LayoutModeSelector';
import TimelineBar from '../components/map-runtime/TimelineBar';
import RuntimeLegend from '../components/map-runtime/RuntimeLegend';
import ReservationSidebarPlaceholder from '../components/map-runtime/ReservationSidebarPlaceholder';
import RuntimeObjectRenderer from '../components/map-runtime/RuntimeObjectRenderer';
import { loadDraftDocument } from '../lib/map-editor-storage';
import { isVisibleInLayout } from '../lib/layout-schema';
import { resolveMockRuntimeStatus } from '../lib/booking-schema';
import { RUNTIME_STATUS_LABELS, t } from '../lib/editor-locale';

function toRenderableObjects(document) {
  return [
    ...document.territoryObjects.map((item) => ({ ...item, kind: 'territory' })),
    ...document.bookableObjects.map((item) => ({ ...item, kind: 'bookable' }))
  ].sort((a, b) => a.zIndex - b.zIndex);
}

export default function BookingRuntimePage() {
  const [document] = useState(() => loadDraftDocument());
  const [layoutCode, setLayoutCode] = useState(document.layoutModes[0]?.code || 'day_beach_restaurant');
  const [timeline, setTimeline] = useState('19:00');

  const activeLayout = useMemo(() => document.layoutModes.find((item) => item.code === layoutCode), [document.layoutModes, layoutCode]);
  const objects = useMemo(() => toRenderableObjects(document), [document]);

  return (
    <AdminLayout>
      <PageContainer title={t('runtime.pageTitle')} description={t('runtime.pageDescription')}>
        <div className="fp-runtime-toolbar">
          <LayoutModeSelector layoutModes={document.layoutModes} value={layoutCode} onChange={setLayoutCode} />
          <TimelineBar value={timeline} onChange={setTimeline} />
        </div>

        <RuntimeLegend />

        <div className="fp-runtime-layout">
          <div className="fp-runtime-scene" style={{ width: '100%', aspectRatio: `${document.width} / ${document.height}` }}>
            {objects.map((object) => {
              const visible = isVisibleInLayout(layoutCode, object.visibleInLayoutModes)
                && (!object.zoneId || activeLayout?.enabledZoneIds?.includes(object.zoneId));

              const status = object.kind === 'bookable'
                ? resolveMockRuntimeStatus({
                  isVisible: visible,
                  isEnabled: !object.hidden,
                  isBookedNow: timeline >= '20:00' && object.bookingKind === 'restaurant_table',
                  isReservedSoon: timeline >= '18:00' && timeline < '20:00',
                  isSeated: timeline >= '21:00' && object.bookingKind === 'vip_zone',
                  isBlocked: object.bookingKind === 'ticket_zone'
                })
                : null;

              if (!visible && object.kind === 'territory') return null;

              return (
                <RuntimeObjectRenderer
                  key={object.id}
                  object={object}
                  mapWidth={document.width}
                  mapHeight={document.height}
                  status={status}
                  title={status ? `${object.name} · ${RUNTIME_STATUS_LABELS[status]}` : object.name}
                />
              );
            })}
          </div>
          <ReservationSidebarPlaceholder />
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
