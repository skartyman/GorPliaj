import { useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import LayoutModeSelector from '../components/map-runtime/LayoutModeSelector';
import TimelineBar from '../components/map-runtime/TimelineBar';
import RuntimeLegend from '../components/map-runtime/RuntimeLegend';
import ReservationSidebarPlaceholder from '../components/map-runtime/ReservationSidebarPlaceholder';
import { loadDraftDocument } from '../lib/map-editor-storage';
import { isVisibleInLayout } from '../lib/layout-schema';
import { resolveMockRuntimeStatus, RUNTIME_STATUS_COLOR } from '../lib/booking-schema';

export default function BookingRuntimePage() {
  const [document] = useState(() => loadDraftDocument());
  const [layoutCode, setLayoutCode] = useState(document.layoutModes[0]?.code || 'day_beach_restaurant');
  const [timeline, setTimeline] = useState('19:00');

  const activeLayout = useMemo(() => document.layoutModes.find((item) => item.code === layoutCode), [document.layoutModes, layoutCode]);

  return (
    <AdminLayout>
      <PageContainer title="Booking Runtime Map" description="Runtime architecture placeholder with layout mode + status layer.">
        <div className="fp-runtime-toolbar">
          <LayoutModeSelector layoutModes={document.layoutModes} value={layoutCode} onChange={setLayoutCode} />
          <TimelineBar value={timeline} onChange={setTimeline} />
        </div>

        <RuntimeLegend />

        <div className="fp-runtime-layout">
          <div className="fp-runtime-scene" style={{ width: '100%', aspectRatio: `${document.width} / ${document.height}` }}>
            {document.bookableObjects.map((object) => {
              const visible = isVisibleInLayout(layoutCode, object.visibleInLayoutModes)
                && (!object.zoneId || activeLayout?.enabledZoneIds?.includes(object.zoneId));

              const status = resolveMockRuntimeStatus({
                isVisible: visible,
                isEnabled: !object.hidden,
                isBookedNow: timeline >= '20:00' && object.bookingKind === 'restaurant_table',
                isReservedSoon: timeline >= '18:00' && timeline < '20:00',
                isSeated: timeline >= '21:00' && object.bookingKind === 'vip_zone',
                isBlocked: object.bookingKind === 'ticket_zone'
              });

              return (
                <div
                  key={object.id}
                  className="fp-runtime-object"
                  style={{
                    left: `${(object.x / document.width) * 100}%`,
                    top: `${(object.y / document.height) * 100}%`,
                    width: `${Math.max((object.width / document.width) * 100, 2)}%`,
                    height: `${Math.max((object.height / document.height) * 100, 2)}%`,
                    background: RUNTIME_STATUS_COLOR[status],
                    opacity: status === 'HIDDEN_BY_LAYOUT' ? 0.08 : 0.95
                  }}
                  title={`${object.name} · ${status}`}
                >
                  <small>{object.tableCode || object.name}</small>
                </div>
              );
            })}
          </div>
          <ReservationSidebarPlaceholder />
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
