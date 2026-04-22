import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { bookingsApi, mapApi } from '../lib/api';
import { getPublicMapData } from '../lib/map';
import { localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function BookingPage() {
  const { t, locale } = useLocale();
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
  useMeta(`${t('bookingTitle')} · GorPliaj`, 'Онлайн-бронирование столов.');

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

        setMapName(localizeField(result.map.name, locale));
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
        setErrorMessage(locale === 'en' ? 'Failed to load available tables.' : 'Не удалось загрузить доступные столы.');
      } finally {
        setLoading(false);
      }
    }

    loadMap();
  }, [form.date, form.guests, form.timeFrom]);

  async function submitBooking(event) {
    event.preventDefault();
    if (!selected.tableId || !selected.mapId || !selected.zoneId) {
      setErrorMessage(locale === 'en' ? 'Please select a table before submitting.' : 'Перед отправкой выберите стол на карте.');
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

      setSuccessMessage(locale === 'en' ? 'Booking request created. Manager will contact you.' : 'Заявка на бронирование создана. Менеджер свяжется с вами.');
    } catch (error) {
      setErrorMessage(error.message || (locale === 'en' ? 'Failed to create booking.' : 'Не удалось создать бронирование.'));
    } finally {
      setLoading(false);
    }
  }

  const isEn = locale === 'en';

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{isEn ? 'Book a table' : 'Бронирование'}</h1>
          <p className="muted">{isEn ? 'Select a free table and submit a booking request.' : 'Выберите свободный стол и отправьте заявку на бронирование.'}</p>
        </div>
      </div>

      {searchParams.get('event') && (
        <p style={{ background: 'rgba(201,168,108,0.1)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 24 }}>
          {isEn ? 'Booking for event' : 'Бронирование для события'}: <strong>{searchParams.get('event')}</strong>
        </p>
      )}

      <form onSubmit={submitBooking} className="form-grid">
        <div className="form-group">
          <label>{isEn ? 'Date' : 'Дата'}</label>
          <input type="date" className="form-input" value={form.date} min={today} required onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        </div>

        <div className="form-group">
          <label>{isEn ? 'Guests' : 'Гостей'}</label>
          <input type="number" className="form-input" value={form.guests} min="1" max="20" required onChange={(event) => setForm((current) => ({ ...current, guests: Number(event.target.value) }))} />
        </div>

        <div className="form-group">
          <label>{isEn ? 'Start time' : 'Время начала'}</label>
          <input type="time" className="form-input" value={form.timeFrom} required onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{isEn ? 'Available tables' : 'Доступные столы'} ({mapName || isEn ? 'map' : 'карта'})</label>
          <select
            className="form-input"
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
            {!tableOptions.length ? <option value="">{isEn ? 'No free tables for these parameters' : 'Нет свободных столов под эти параметры'}</option> : null}
            {tableOptions.map((table) => (
              <option key={table.id} value={table.id}>
                {localizeField(table.name, locale) || table.code} ({table.seatsMin}-{table.seatsMax} {isEn ? 'seats' : 'мест'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{isEn ? 'Name' : 'Имя'}</label>
          <input type="text" className="form-input" value={form.customerName} required minLength="2" onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
        </div>

        <div className="form-group">
          <label>{isEn ? 'Phone' : 'Телефон'}</label>
          <input type="tel" className="form-input" value={form.customerPhone} required minLength="7" onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{isEn ? 'Comment' : 'Комментарий'}</label>
          <textarea className="form-input" rows="3" value={form.commentCustomer} onChange={(event) => setForm((current) => ({ ...current, commentCustomer: event.target.value }))} />
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={loading || !tableOptions.length}>
            {isEn ? 'Submit request' : 'Отправить заявку'}
          </button>
          <Link className="btn btn-secondary" to={`/map?date=${form.date}&guests=${form.guests}&timeFrom=${form.timeFrom}`}>
            {isEn ? 'Open map' : 'Открыть карту'}
          </Link>
        </div>

        {loading && <div className="state-msg">{isEn ? 'Updating data...' : 'Обновляем данные...'}</div>}
        {errorMessage && <div className="state-msg state-error">{errorMessage}</div>}
        {successMessage && <div className="state-msg state-success">{successMessage}</div>}
      </form>
    </>
  );
}
