import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

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

function toPercent(value, total) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !total) {
    return 0;
  }

  return (value / total) * 100;
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
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
  const { t, locale } = useAdminI18n();

  useEffect(() => {
    async function loadMapData() {
      const mapResult = await apiRequest('/api/maps/default');
      if (!mapResult.response.ok) {
        setState({
          loading: false,
          error: mapResult.body.message || t('map.errors.load'),
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
        error: t('map.errors.load'),
        mapData: null,
        reservations: [],
        availability: { busyTableIds: [], heldTableIds: [], freeTableIds: [] }
      });
    });
  }, [t]);

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

  const mapDimensions = {
    width: state.mapData?.map?.width || 1200,
    height: state.mapData?.map?.height || 700
  };

  const mapObjects = useMemo(() => {
    const objects = state.mapData?.objects || [];

    return objects.map((object) => {
      const isTable = object.type === 'TABLE';
      const table = isTable && object.tableId ? tableMap.get(object.tableId) : null;
      const zone = table ? zoneMap.get(table.zoneId) : null;

      return {
        ...object,
        isTable,
        table,
        zone,
        left: toPercent(object.x, mapDimensions.width),
        top: toPercent(object.y, mapDimensions.height),
        width: Math.max(toPercent(object.width, mapDimensions.width), 2.5),
        height: Math.max(toPercent(object.height, mapDimensions.height), 2.5)
      };
    });
  }, [mapDimensions.height, mapDimensions.width, state.mapData?.objects, tableMap, zoneMap]);

  return (
    <AdminLayout>
      <PageContainer
        title={t('map.title')}
        description={t('map.description')}
        actions={(
          <Link className="btn btn-secondary" to="/admin/map-editor">
            {t('map.openEditor')}
          </Link>
        )}
      >
        <section className="page-hero compact">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('map.eyebrow')}</span>
            <h3>{t('map.heroTitle')}</h3>
            <p className="muted">{t('map.heroDescription')}</p>
          </div>
          <div className="hero-inline-note">{t('map.note')}</div>
        </section>
        {state.loading ? <p>{t('map.loading')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {!state.loading && !state.error && state.mapData ? (
          <>
            <div className="map-meta muted">
              {t('map.meta', {
                map: state.mapData.map?.name || '—',
                zones: state.mapData.zones?.length || 0,
                tables: state.mapData.tables?.length || 0
              })}
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
                  const status = object.table
                    ? getTableDisplayStatus(object.table, reservationsByTable, heldTableIds, busyTableIds)
                    : 'NEUTRAL';

                  const baseStyle = {
                    left: `${object.left}%`,
                    top: `${object.top}%`,
                    width: `${object.width}%`,
                    height: `${object.height}%`,
                    transform: `rotate(${object.rotation || 0}deg)`,
                    zIndex: object.zIndex || 2
                  };

                  if (!object.isTable) {
                    return (
                      <div key={object.id} className="map-object neutral" style={baseStyle} title={object.label || object.type}>
                        <span>{object.label || object.type}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={object.id}
                      type="button"
                      className={`map-object ${status.toLowerCase()} ${selectedTableId === object.tableId ? 'selected' : ''}`}
                      style={baseStyle}
                      title={
                        object.table
                          ? `${object.table.name || object.table.code || t('map.fields.table')}${object.zone?.name ? ` • ${object.zone.name}` : ''}`
                          : object.label || object.type
                      }
                      onClick={() => (object.tableId ? setSelectedTableId(object.tableId) : setSelectedTableId(null))}
                    >
                      <span>{object.table?.code || object.table?.name || object.label || t('map.fields.table')}</span>
                    </button>
                  );
                })}
              </div>

              <PanelCard title={t('map.tableDetails')} subtitle={t('map.tableDetailsDescription')} className="full-height">
                {!selectedTable ? <p className="muted">{t('map.noTableSelected')}</p> : null}
                {selectedTable ? (
                  <>
                    <div className="details-grid compact">
                      <DetailRow label={t('map.fields.table')} value={selectedTable.code || selectedTable.name} />
                      <DetailRow label={t('map.fields.zone')} value={zoneMap.get(selectedTable.zoneId)?.name || '—'} />
                      <DetailRow label={t('map.fields.availability')} value={<StatusPill status={selectedStatus} />} />
                      <DetailRow label={t('map.fields.capacity')} value={selectedTable.capacity || '—'} />
                    </div>

                    <h4>{t('map.activeReservations')}</h4>
                    {!selectedReservations.length ? <p className="muted">{t('map.noActiveReservations')}</p> : null}
                    {selectedReservations.length ? (
                      <ul className="plain-list compact">
                        {selectedReservations.slice(0, 3).map((reservation) => (
                          <li key={reservation.id}>
                            <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link> • {reservation.customerName || t('common.guest')} •{' '}
                            {formatDate(reservation.reservationDate, locale)} {formatTime(reservation.timeFrom, locale)} • <StatusPill status={reservation.status} />
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="actions">
                      <button type="button" className="btn btn-secondary" disabled>
                        {t('map.holdSoon', { soon: t('common.soon') })}
                      </button>
                      <button type="button" className="btn btn-secondary" disabled>
                        {t('map.freeSoon', { soon: t('common.soon') })}
                      </button>
                      <button type="button" className="btn btn-secondary" disabled>
                        {t('map.moveSoon', { soon: t('common.soon') })}
                      </button>
                    </div>
                  </>
                ) : null}
              </PanelCard>
            </div>

            <div className="map-legend">
              <span><i className="dot free" /> {t('map.legend.free')}</span>
              <span><i className="dot pending" /> {t('map.legend.pending')}</span>
              <span><i className="dot confirmed" /> {t('map.legend.confirmed')}</span>
              <span><i className="dot held" /> {t('map.legend.held')}</span>
              <span><i className="dot unavailable" /> {t('map.legend.unavailable')}</span>
            </div>
          </>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
