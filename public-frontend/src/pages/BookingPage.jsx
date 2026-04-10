import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { bookingsApi, mapApi } from '../lib/api';
import { getPublicMapData } from '../lib/map';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function BookingPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mapName, setMapName] = useState('');
  const [tableOptions, setTableOptions] = useState([]);
  const [selected, setSelected] = useState({
    mapId: Number(searchParams.get('mapId') || '0'),
    zoneId: Number(searchParams.get('zoneId') || '0'),
    tableId: Number(searchParams.get('tableId') || '0')
  });
  const [form, setForm] = useState({
    date: searchParams.get('date') || today,
    guests: Number(searchParams.get('guests') || '2'),
    timeFrom: searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    commentCustomer: ''
  });
  useMeta(`${t('bookingTitle')} · GorPliaj`, 'Online booking form.');

  useEffect(() => {
    async function loadMap() {
      setLoading(true);
      setErrorMessage('');

      try {
        const result = await getPublicMapData(mapApi, { date: form.date, timeFrom: form.timeFrom });
        const options = result.map.zones.flatMap((zone) =>
          zone.tables
            .filter((table) => table.status === 'free' && form.guests >= table.seatsMin && form.guests <= table.seatsMax)
            .map((table) => ({ ...table, zoneId: zone.id }))
        );

        setMapName(result.map.name);
        setTableOptions(options);
        setSelected((current) => {
          const selectedTable = options.find((table) => table.id === current.tableId) || options[0];
          return {
            mapId: current.mapId || result.map.id,
            zoneId: selectedTable?.zoneId || current.zoneId,
            tableId: selectedTable?.id || 0
          };
        });
      } catch {
        setErrorMessage('Failed to load available tables.');
      } finally {
        setLoading(false);
      }
    }

    loadMap();
  }, [form.date, form.guests, form.timeFrom]);

  async function submitBooking(event) {
    event.preventDefault();
    if (!selected.tableId || !selected.mapId || !selected.zoneId) {
      setErrorMessage('Choose a table on the map before submit.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await bookingsApi.create({
        tableId: selected.tableId,
        mapId: selected.mapId,
        zoneId: selected.zoneId,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        timeTo: '23:00',
        commentCustomer: form.commentCustomer
      });

      setSuccessMessage('Booking request created. Manager will contact you.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-block">
      <h1>{t('bookingTitle')}</h1>
      <p className="muted">Choose a free table and send your booking request.</p>
      {searchParams.get('event') ? <p className="booking-event-context">Booking for event: {searchParams.get('event')}</p> : null}

      <form className="booking-form-lite" onSubmit={submitBooking}>
        <label>
          Date
          <input type="date" value={form.date} min={today} required onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        </label>

        <label>
          Guests
          <input
            type="number"
            value={form.guests}
            min="1"
            max="20"
            required
            onChange={(event) => setForm((current) => ({ ...current, guests: Number(event.target.value) }))}
          />
        </label>

        <label>
          Start time
          <input type="time" value={form.timeFrom} required onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))} />
        </label>

        <label>
          Available tables ({mapName || 'map'})
          <select
            value={selected.tableId}
            onChange={(event) => {
              const nextTable = tableOptions.find((table) => table.id === Number(event.target.value));
              setSelected((current) => ({
                ...current,
                tableId: Number(event.target.value),
                zoneId: nextTable?.zoneId || current.zoneId
              }));
            }}
          >
            {!tableOptions.length ? <option value="">No free tables for these params</option> : null}
            {tableOptions.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} ({table.seatsMin}-{table.seatsMax})
              </option>
            ))}
          </select>
        </label>

        <label>
          Name
          <input type="text" value={form.customerName} required minLength="2" onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
        </label>

        <label>
          Phone
          <input type="tel" value={form.customerPhone} required minLength="7" onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} />
        </label>

        <label>
          Comment
          <textarea rows="3" value={form.commentCustomer} onChange={(event) => setForm((current) => ({ ...current, commentCustomer: event.target.value }))} />
        </label>

        <div className="hero-cta">
          <button type="submit" className="btn btn-primary" disabled={loading || !tableOptions.length}>
            Send request
          </button>
          <Link className="btn btn-secondary" to={`/map?date=${form.date}&guests=${form.guests}&timeFrom=${form.timeFrom}`}>
            Open map
          </Link>
        </div>

        {loading ? <div className="state">Refreshing data...</div> : null}
        {errorMessage ? <div className="state state-error">{errorMessage}</div> : null}
        {successMessage ? <div className="state booking-success">{successMessage}</div> : null}
      </form>
    </section>
  );
}
