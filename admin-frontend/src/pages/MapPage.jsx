import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import { apiRequest } from '../lib/api';

function getTableStatus(tableId, reservations) {
  const activeStatuses = new Set(['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT']);
  return reservations.some((reservation) => reservation.table?.id === tableId && activeStatuses.has(reservation.status))
    ? 'reserved'
    : 'available';
}

export default function MapPage() {
  const [state, setState] = useState({ loading: true, error: '', mapData: null, reservations: [] });

  useEffect(() => {
    Promise.all([apiRequest('/api/maps/default'), apiRequest('/api/admin/reservations')])
      .then(([mapResult, reservationsResult]) => {
        if (!mapResult.response.ok) {
          setState({ loading: false, error: mapResult.body.message || 'Failed to load map.', mapData: null, reservations: [] });
          return;
        }

        setState({
          loading: false,
          error: '',
          mapData: mapResult.body,
          reservations: reservationsResult.response.ok && Array.isArray(reservationsResult.body) ? reservationsResult.body : []
        });
      })
      .catch(() => setState({ loading: false, error: 'Failed to load map.', mapData: null, reservations: [] }));
  }, []);

  const mapObjects = useMemo(() => state.mapData?.objects || [], [state.mapData]);

  return (
    <AdminLayout>
      <PageContainer
        title="Venue map"
        description="Current map data with table occupancy cues. Prepared for editing and table actions in the next phase."
      >
        {state.loading ? <p>Loading map...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {!state.loading && !state.error && state.mapData ? (
          <>
            <div className="map-meta muted">
              Map: <strong>{state.mapData.map?.name}</strong> • Zones: {state.mapData.zones?.length || 0} • Tables: {state.mapData.tables?.length || 0}
            </div>
            <div
              className="admin-map-canvas"
              style={{
                width: '100%',
                aspectRatio: `${state.mapData.map?.width || 1200} / ${state.mapData.map?.height || 700}`
              }}
            >
              {mapObjects.map((object) => {
                const status = object.tableId ? getTableStatus(object.tableId, state.reservations) : 'neutral';
                return (
                  <div
                    key={object.id}
                    className={`map-object ${status}`}
                    style={{
                      left: `${object.x}%`,
                      top: `${object.y}%`,
                      width: `${Math.max(object.width, 4)}%`,
                      height: `${Math.max(object.height, 4)}%`,
                      transform: `rotate(${object.rotation || 0}deg)`
                    }}
                    title={object.label || object.type}
                  >
                    <span>{object.label || object.type}</span>
                  </div>
                );
              })}
            </div>
            <div className="map-legend">
              <span><i className="dot available" /> Available</span>
              <span><i className="dot reserved" /> Reserved</span>
              <span><i className="dot neutral" /> Other object</span>
            </div>
          </>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
