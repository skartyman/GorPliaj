import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';

function getTimeKey(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getDateKey(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function getTableDisplayStatus(table, reservationsByTable, heldTableIds, busyTableIds) {
  if (!table.isActive || !table.isBookable) {
    return 'UNAVAILABLE';
  }

  const reservations = reservationsByTable[table.id] || [];
  if (reservations.some((reservation) => reservation.status === 'PENDING')) {
    return 'PENDING';
  }

  if (reservations.some((reservation) => ['CONFIRMED', 'AWAITING_PAYMENT'].includes(reservation.status))) {
    return 'CONFIRMED';
  }

  if (heldTableIds.has(table.id)) {
    return 'HELD';
  }

  if (busyTableIds.has(table.id)) {
    return 'CONFIRMED';
  }

  return 'FREE';
}

export default function MapPage() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    mapData: null,
    reservations: [],
    availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
  });
  const [selectedTableId, setSelectedTableId] = useState(null);

  useEffect(() => {
    async function loadMapData() {
      const mapResult = await apiRequest('/api/maps/default');
      if (!mapResult.response.ok) {
        setState({
          loading: false,
          error: mapResult.body.message || 'Failed to load map.',
          mapData: null,
          reservations: [],
          availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
        });
        return;
      }

      const mapData = mapResult.body;
      const [reservationsResult, availabilityResult] = await Promise.all([
        apiRequest('/api/admin/reservations'),
        apiRequest(`/api/maps/${mapData.map.id}/availability?date=${getDateKey()}&timeFrom=${getTimeKey(new Date())}`)
      ]);

      setState({
        loading: false,
        error: '',
        mapData,
        reservations: reservationsResult.response.ok && Array.isArray(reservationsResult.body) ? reservationsResult.body : [],
        availability:
          availabilityResult.response.ok && availabilityResult.body
            ? availabilityResult.body
            : { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      });
    }

    loadMapData().catch(() => {
      setState({
        loading: false,
        error: 'Failed to load map.',
        mapData: null,
        reservations: [],
        availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      });
    });
  }, []);

  const tableMap = useMemo(
    () => new Map((state.mapData?.tables || []).map((table) => [table.id, table])),
    [state.mapData?.tables]
  );
  const zoneMap = useMemo(
    () => new Map((state.mapData?.zones || []).map((zone) => [zone.id, zone])),
    [state.mapData?.zones]
  );

  const reservationsByTable = useMemo(() => {
    const grouped = {};
    const todayKey = getDateKey();

    state.reservations.forEach((reservation) => {
      if (String(reservation.reservationDate).slice(0, 10) !== todayKey || !reservation.table?.id) {
        return;
      }

      if (!grouped[reservation.table.id]) {
        grouped[reservation.table.id] = [];
      }
      grouped[reservation.table.id].push(reservation);
    });

    return grouped;
  }, [state.reservations]);

  const heldTableIds = useMemo(() => new Set(state.availability.heldTableIds || []), [state.availability.heldTableIds]);
  const busyTableIds = useMemo(() => new Set(state.availability.busyTableIds || []), [state.availability.busyTableIds]);

  const selectedTable = selectedTableId ? tableMap.get(selectedTableId) : null;
  const selectedReservations = (selectedTable && reservationsByTable[selectedTable.id]) || [];
  const selectedStatus = selectedTable
    ? getTableDisplayStatus(selectedTable, reservationsByTable, heldTableIds, busyTableIds)
    : null;

  const mapObjects = useMemo(() => state.mapData?.objects || [], [state.mapData]);

  return (
    <AdminLayout>
      <PageContainer
        title="Venue map operations"
        description="Operational floor map with visual table status and active reservation details."
      >
        {state.loading ? <p>Loading map...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {!state.loading && !state.error && state.mapData ? (
          <>
            <div className="map-meta muted">
              Map: <strong>{state.mapData.map?.name}</strong> • Zones: {state.mapData.zones?.length || 0} • Tables: {state.mapData.tables?.length || 0}
            </div>

            <div className="map-layout">
              <div
                className="admin-map-canvas"
                style={{
                  width: '100%',
                  aspectRatio: `${state.mapData.map?.width || 1200} / ${state.mapData.map?.height || 700}`
                }}
              >
                {mapObjects.map((object) => {
                  const table = object.tableId ? tableMap.get(object.tableId) : null;
                  const status = table
                    ? getTableDisplayStatus(table, reservationsByTable, heldTableIds, busyTableIds)
                    : 'NEUTRAL';

                  return (
                    <button
                      key={object.id}
                      type="button"
                      className={`map-object ${status.toLowerCase()} ${selectedTableId === object.tableId ? 'selected' : ''}`}
                      style={{
                        left: `${object.x}%`,
                        top: `${object.y}%`,
                        width: `${Math.max(object.width, 4)}%`,
                        height: `${Math.max(object.height, 4)}%`,
                        transform: `rotate(${object.rotation || 0}deg)`
                      }}
                      title={object.label || object.type}
                      onClick={() => (object.tableId ? setSelectedTableId(object.tableId) : setSelectedTableId(null))}
                    >
                      <span>{object.label || object.type}</span>
                    </button>
                  );
                })}
              </div>

              <PanelCard title="Table details" subtitle="Select a table from map to inspect and operate.">
                {!selectedTable ? <p className="muted">Select a table to see detail and reservation context.</p> : null}
                {selectedTable ? (
                  <>
                    <div className="details-grid compact">
                      <DetailRow label="Table" value={selectedTable.code || selectedTable.name} />
                      <DetailRow label="Zone" value={zoneMap.get(selectedTable.zoneId)?.name || '-'} />
                      <DetailRow label="Availability" value={<StatusPill status={selectedStatus} />} />
                      <DetailRow label="Capacity" value={selectedTable.capacity || '-'} />
                    </div>

                    <h4>Active reservations</h4>
                    {!selectedReservations.length ? <p className="muted">No active reservation for this table.</p> : null}
                    {selectedReservations.length ? (
                      <ul className="plain-list compact">
                        {selectedReservations.slice(0, 3).map((reservation) => (
                          <li key={reservation.id}>
                            <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link> • {reservation.customerName || 'Guest'} •{' '}
                            {formatDate(reservation.reservationDate)} {formatTime(reservation.timeFrom)} • <StatusPill status={reservation.status} />
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="actions">
                      <button type="button" className="btn btn-secondary" disabled>
                        Hold table (soon)
                      </button>
                      <button type="button" className="btn btn-secondary" disabled>
                        Free table (soon)
                      </button>
                      <button type="button" className="btn btn-secondary" disabled>
                        Move reservation (soon)
                      </button>
                    </div>
                  </>
                ) : null}
              </PanelCard>
            </div>

            <div className="map-legend">
              <span><i className="dot free" /> Free</span>
              <span><i className="dot pending" /> Pending</span>
              <span><i className="dot confirmed" /> Confirmed</span>
              <span><i className="dot held" /> Held</span>
              <span><i className="dot unavailable" /> Unavailable</span>
            </div>
          </>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}
