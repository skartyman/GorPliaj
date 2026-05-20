import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { bookingsApi, mapApi } from '../lib/api';
import { getPublicMapData } from '../lib/map';
import { localizedCopy, localizeField } from '../lib/i18n';
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
  const [selectedObjectName, setSelectedObjectName] = useState('');
  const [selected, setSelected] = useState({
    mapId: Number(searchParams.get('mapId') || '0'),
    zoneId: Number(searchParams.get('zoneId') || '0'),
    tableId: Number(searchParams.get('tableId') || '0'),
    objectId: Number(searchParams.get('objectId') || '0')
  });
  const [form, setForm] = useState({
    date: searchParams.get('date') || today,
    guests: Number(searchParams.get('guests') || '2'),
    timeFrom: searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    commentCustomer: ''
  });
  const c = (values) => localizedCopy(values, locale);
  useMeta(`${t('bookingTitle')} · GorPliaj`, c({
    ua: 'Онлайн-бронювання столів.',
    ru: 'Онлайн-бронирование столов.',
    en: 'Online table booking.'
  }));

  useEffect(() => {
    async function loadMap() {
      setLoading(true);
      setErrorMessage('');

      try {
        const requestedMapId = Number(searchParams.get('mapId') || '0');
        const requestedObjectId = Number(searchParams.get('objectId') || '0');
        const result = await getPublicMapData(mapApi, { date: form.date, timeFrom: form.timeFrom, mapId: requestedMapId || '' });
        const options = result.map.zones.flatMap((zone) =>
          zone.tables
            .filter((table) => table.status === 'free' && form.guests >= table.seatsMin && form.guests <= table.seatsMax)
            .map((table) => ({ ...table, zoneId: zone.id }))
        );

        setMapName(localizeField(result.map.name, locale));
        setTableOptions(options);
        const linkedObject = requestedObjectId ? result.map.objects.find((object) => Number(object.id) === requestedObjectId) : null;
        const linkedTableId = Number(linkedObject?.tableId) || 0;
        setSelectedObjectName(linkedObject ? localizeField(linkedObject.label, locale) || linkedObject.type || '' : '');
        setSelected((current) => {
          const selectedTable = linkedTableId
            ? options.find((table) => table.id === linkedTableId)
            : options.find((table) => table.id === current.tableId) || options[0];
          return {
            mapId: current.mapId || result.map.id,
            zoneId: selectedTable?.zoneId || current.zoneId,
            tableId: selectedTable?.id || 0,
            objectId: current.objectId || requestedObjectId
          };
        });
      } catch {
        setErrorMessage(c({ ua: 'Не вдалося завантажити доступні столи.', ru: 'Не удалось загрузить доступные столы.', en: 'Failed to load available tables.' }));
      } finally {
        setLoading(false);
      }
    }

    loadMap();
  }, [form.date, form.guests, form.timeFrom]);

  async function submitBooking(event) {
    event.preventDefault();
    if (!selected.tableId || !selected.mapId || !selected.zoneId) {
      setErrorMessage(c({ ua: 'Перед відправленням оберіть стіл на карті.', ru: 'Перед отправкой выберите стол на карте.', en: 'Please select a table before submitting.' }));
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const objectNote = selected.objectId && selectedObjectName ? `Object: ${selectedObjectName} (#${selected.objectId})` : '';
      const commentCustomer = [objectNote, form.commentCustomer].filter(Boolean).join('\n\n');

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
        commentCustomer
      });

      setSuccessMessage(c({ ua: 'Заявку на бронювання створено. Менеджер звʼяжеться з вами.', ru: 'Заявка на бронирование создана. Менеджер свяжется с вами.', en: 'Booking request created. Manager will contact you.' }));
    } catch (error) {
      setErrorMessage(error.message || c({ ua: 'Не вдалося створити бронювання.', ru: 'Не удалось создать бронирование.', en: 'Failed to create booking.' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{c({ ua: 'Бронювання', ru: 'Бронирование', en: 'Book a table' })}</h1>
          <p className="muted">{c({ ua: 'Оберіть вільний стіл і надішліть заявку на бронювання.', ru: 'Выберите свободный стол и отправьте заявку на бронирование.', en: 'Select a free table and submit a booking request.' })}</p>
        </div>
      </div>

      {searchParams.get('event') && (
        <p style={{ background: 'rgba(201,168,108,0.1)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 24 }}>
          {c({ ua: 'Бронювання для події', ru: 'Бронирование для события', en: 'Booking for event' })}: <strong>{searchParams.get('event')}</strong>
        </p>
      )}

      <form onSubmit={submitBooking} className="form-grid">
        <div className="form-group">
          <label>{c({ ua: 'Дата', ru: 'Дата', en: 'Date' })}</label>
          <input type="date" className="form-input" value={form.date} min={today} required onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Гостей', ru: 'Гостей', en: 'Guests' })}</label>
          <input type="number" className="form-input" value={form.guests} min="1" max="20" required onChange={(event) => setForm((current) => ({ ...current, guests: Number(event.target.value) }))} />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Час початку', ru: 'Время начала', en: 'Start time' })}</label>
          <input type="time" className="form-input" value={form.timeFrom} required onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          {selected.objectId && selectedObjectName ? (
            <p className="muted" style={{ margin: '0 0 8px' }}>
              Selected object: <strong>{selectedObjectName}</strong>
            </p>
          ) : null}
          <label>{c({ ua: 'Доступні столи', ru: 'Доступные столы', en: 'Available tables' })} ({mapName || c({ ua: 'карта', ru: 'карта', en: 'map' })})</label>
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
            {!tableOptions.length ? <option value="">{c({ ua: 'Немає вільних столів під ці параметри', ru: 'Нет свободных столов под эти параметры', en: 'No free tables for these parameters' })}</option> : null}
            {tableOptions.map((table) => (
              <option key={table.id} value={table.id}>
                {localizeField(table.name, locale) || table.code} ({table.seatsMin}-{table.seatsMax} {c({ ua: 'місць', ru: 'мест', en: 'seats' })})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Імʼя', ru: 'Имя', en: 'Name' })}</label>
          <input type="text" className="form-input" value={form.customerName} required minLength="2" onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</label>
          <input type="tel" className="form-input" value={form.customerPhone} required minLength="7" onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: 'Коментар', ru: 'Комментарий', en: 'Comment' })}</label>
          <textarea className="form-input" rows="3" value={form.commentCustomer} onChange={(event) => setForm((current) => ({ ...current, commentCustomer: event.target.value }))} />
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={loading || !tableOptions.length}>
            {c({ ua: 'Надіслати заявку', ru: 'Отправить заявку', en: 'Submit request' })}
          </button>
        </div>

        {loading && <div className="state-msg">{c({ ua: 'Оновлюємо дані...', ru: 'Обновляем данные...', en: 'Updating data...' })}</div>}
        {errorMessage && <div className="state-msg state-error">{errorMessage}</div>}
        {successMessage && <div className="state-msg state-success">{successMessage}</div>}
      </form>
    </>
  );
}
