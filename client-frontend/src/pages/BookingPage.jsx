import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslations } from '../lib/i18n';
import { useBookingMap } from '../hooks/useBookingMap';
import { useReservation } from '../hooks/useApi';

export default function BookingPage() {
  const { t } = useTranslations();
  const {
    mapData,
    loading,
    error,
    selectedTable,
    setSelectedTable,
    availability,
    fetchAvailability,
    isTableBusy,
    isTableHeld,
    isTableFree,
    currentZoomIndex,
    zoomIn,
    zoomOut,
    zoomReset,
    getZoomScale,
    panMap,
    shellRef
  } = useBookingMap();

  const { createReservation, submitting, error: reservationError, success, reset } = useReservation();
  const [reservationDate, setReservationDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    guests: '',
    commentCustomer: ''
  });

  useEffect(() => {
    if (mapData && reservationDate && timeFrom) {
      fetchAvailability(reservationDate, timeFrom, mapData.map.id);
    }
  }, [reservationDate, timeFrom, mapData]);

  const handleTableClick = (table) => {
    if (isTableBusy(table.id) || isTableHeld(table.id)) {
      return;
    }
    setSelectedTable(table);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTable) return;

    const payload = {
      ...formData,
      tableId: selectedTable.id,
      date: reservationDate,
      timeFrom,
      zoneId: selectedTable.zoneId
    };

    const result = await createReservation(payload);
    if (result) {
      setFormData({ customerName: '', customerPhone: '', guests: '', commentCustomer: '' });
    }
  };

  const generateQuickDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const isoDate = date.toISOString().split('T')[0];
      dates.push({
        isoDate,
        day: date.toLocaleDateString('uk-UA', { weekday: 'short' }),
        display: date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
      });
    }
    return dates;
  };

  const stats = {
    free: availability.freeTableIds.length || (mapData?.tables?.length - availability.busyTableIds.length - availability.heldTableIds.length),
    busy: availability.busyTableIds.length,
    held: availability.heldTableIds.length
  };

  if (loading) {
    return (
      <div className="booking-page">
        <header className="booking-hero">
          <div className="booking-hero-copy">
            <p className="eyebrow">GorPliaj Booking</p>
            <h1>Карта бронювання столів</h1>
            <p className="subtitle">Завантаження карти...</p>
            <Link className="back-link" to="/">← На головну</Link>
          </div>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-page">
        <header className="booking-hero">
          <div className="booking-hero-copy">
            <p className="eyebrow">GorPliaj Booking</p>
            <h1>Помилка</h1>
            <p className="subtitle">{error}</p>
            <Link className="back-link" to="/">← На головну</Link>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <header className="booking-hero">
        <div className="booking-hero-copy">
          <p className="eyebrow">GorPliaj Booking</p>
          <h1>Карта бронювання столів</h1>
          <p className="subtitle">Оберіть столик на мапі, перевірте його доступність і одразу підтвердіть бронювання.</p>
          <div className="hero-actions">
            <Link className="back-link" to="/">← На головну</Link>
            <span className="hero-note">Графіка для hero: 1600×900, safe zone 120px</span>
          </div>
        </div>

        <div className="booking-hero-stats">
          <article className="stat-card">
            <span>Free</span>
            <strong>{stats.free}</strong>
          </article>
          <article className="stat-card">
            <span>Busy</span>
            <strong>{stats.busy}</strong>
          </article>
          <article className="stat-card">
            <span>Held</span>
            <strong>{stats.held}</strong>
          </article>
        </div>
      </header>

      <section className="booking-layout" aria-label="Схема майданчика та інформація про стіл">
        <article className="card map-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Interactive map</p>
              <h2>Мапа закладу</h2>
            </div>
            <div className="map-legend">
              <span><i className="legend-dot free"></i> Free</span>
              <span><i className="legend-dot busy"></i> Busy</span>
              <span><i className="legend-dot held"></i> Held</span>
            </div>
          </div>

          <p className="map-mobile-hint">На телефоні збільшіть мапу кнопками на самій схемі, а потім рухайте її пальцем, щоб точніше обрати столик.</p>
          
          <div className="map-stage">
            <div ref={shellRef} className="booking-map-shell">
              <div className="booking-map-canvas">
                <div 
                  ref={(el) => { if (el) el.style.transform = `scale(${getZoomScale()})`; }}
                  className="booking-map" 
                  aria-label="Мапа столів"
                  style={{ 
                    width: mapData?.map.width, 
                    height: mapData?.map.height,
                    transformOrigin: 'top left'
                  }}
                >
                  {mapData?.objects?.map((object, index) => {
                    const table = mapData.tables?.find(t => t.id === object.tableId);
                    const zone = mapData.zones?.find(z => z.id === table?.zoneId);
                    
                    if (object.type !== 'TABLE') {
                      return (
                        <div
                          key={index}
                          className="map-object map-object--static"
                          style={{
                            left: `${(object.x / mapData.map.width) * 100}%`,
                            top: `${(object.y / mapData.map.height) * 100}%`,
                            width: `${(object.width / mapData.map.width) * 100}%`,
                            height: `${(object.height / mapData.map.height) * 100}%`,
                            transform: `rotate(${object.rotation || 0}deg)`,
                            zIndex: object.zIndex || 1
                          }}
                        >
                          <span className="map-object-label">{object.label || object.type}</span>
                        </div>
                      );
                    }

                    const busy = table && isTableBusy(table.id);
                    const held = table && isTableHeld(table.id);
                    const free = table && isTableFree(table.id);

                    return (
                      <button
                        key={index}
                        type="button"
                        className={`map-object map-object--table${busy ? ' map-object--busy' : ''}${held ? ' map-object--held' : ''}${free ? ' map-object--free' : ''}`}
                        disabled={busy || held}
                        title={table?.name || table?.code || 'Table'}
                        onClick={() => table && handleTableClick(table)}
                        style={{
                          left: `${(object.x / mapData.map.width) * 100}%`,
                          top: `${(object.y / mapData.map.height) * 100}%`,
                          width: `${(object.width / mapData.map.width) * 100}%`,
                          height: `${(object.height / mapData.map.height) * 100}%`,
                          transform: `rotate(${object.rotation || 0}deg)`,
                          zIndex: object.zIndex || 1
                        }}
                      >
                        <span className="map-object-label">{object.label || table?.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="map-controls" aria-label="Керування мапою">
              <div className="map-zoom-controls map-controls-group">
                <button id="mapZoomOut" className="map-control-button" type="button" onClick={zoomOut} disabled={currentZoomIndex === 0}>−</button>
                <button id="mapZoomReset" className="map-control-button map-control-button--wide" type="button" onClick={zoomReset}>
                  {Math.round(getZoomScale() * 100)}%
                </button>
                <button id="mapZoomIn" className="map-control-button" type="button" onClick={zoomIn} disabled={currentZoomIndex >= 4}>+</button>
              </div>
              <div className="map-pan-controls map-controls-group" aria-label="Навігація по мапі">
                <button id="mapPanUp" className="map-control-button" type="button" onClick={() => panMap(0, -100)}>↑</button>
                <div className="map-pan-row">
                  <button id="mapPanLeft" className="map-control-button" type="button" onClick={() => panMap(-100, 0)}>←</button>
                  <button id="mapPanRight" className="map-control-button" type="button" onClick={() => panMap(100, 0)}>→</button>
                </div>
                <button id="mapPanDown" className="map-control-button" type="button" onClick={() => panMap(0, 100)}>↓</button>
              </div>
            </div>
          </div>
        </article>

        <aside className="card info-panel" aria-live="polite">
          <div className="card-head stacked">
            <div>
              <p className="eyebrow">Selected table</p>
              <h2>Обраний стіл</h2>
            </div>
            <span className={`status-pill${selectedTable ? (isTableBusy(selectedTable?.id) ? ' is-busy' : isTableHeld(selectedTable?.id) ? ' is-held' : ' is-free') : ' hidden'}`}>
              {selectedTable ? (isTableBusy(selectedTable?.id) ? 'Busy' : isTableHeld(selectedTable?.id) ? 'Held' : 'Free') : 'Не обрано'}
            </span>
          </div>

          {!selectedTable ? (
            <p className="state">Натисніть на стіл на мапі.</p>
          ) : (
            <>
              <dl className="details">
                <div className="detail-row"><dt>Code</dt><dd>{selectedTable.code}</dd></div>
                <div className="detail-row"><dt>Name</dt><dd>{selectedTable.name}</dd></div>
                <div className="detail-row"><dt>Seats</dt><dd>{selectedTable.seatsMin} / {selectedTable.seatsMax}</dd></div>
                <div className="detail-row"><dt>Deposit</dt><dd>{selectedTable.deposit}</dd></div>
                <div className="detail-row"><dt>Zone</dt><dd>{mapData.zones?.find(z => z.id === selectedTable.zoneId)?.name}</dd></div>
              </dl>

              <form className="reservation-form" onSubmit={handleSubmit}>
                <h3>Дані бронювання</h3>
                {reservationError && <p className="state state-error" role="alert">{reservationError}</p>}
                {success && <p className="state state-success" role="status">Бронювання створено!</p>}

                <label>
                  Ім'я
                  <input 
                    type="text" 
                    name="customerName" 
                    required 
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </label>
                <label>
                  Телефон
                  <input 
                    type="tel" 
                    name="customerPhone" 
                    required 
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </label>
                <label>
                  Гостей
                  <input 
                    type="number" 
                    name="guests" 
                    min="1" 
                    step="1" 
                    required 
                    value={formData.guests}
                    onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                  />
                </label>
                <label>
                  Дата
                  <input 
                    type="date" 
                    name="reservationDate" 
                    required 
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                  />
                  <div className="date-quick-select" aria-label="Вибір дати на 7 днів">
                    {generateQuickDates().map(({ isoDate, day, display }) => (
                      <button
                        key={isoDate}
                        type="button"
                        className={`date-chip${isoDate === reservationDate ? ' date-chip--active' : ''}`}
                        onClick={() => setReservationDate(isoDate)}
                      >
                        <span>{day}</span><strong>{display}</strong>
                      </button>
                    ))}
                  </div>
                </label>
                <label>
                  Час від
                  <input 
                    type="time" 
                    name="timeFrom" 
                    required 
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                  />
                </label>
                <label>
                  Коментар
                  <textarea 
                    name="commentCustomer" 
                    rows="3" 
                    placeholder="Необов'язково"
                    value={formData.commentCustomer}
                    onChange={(e) => setFormData({ ...formData, commentCustomer: e.target.value })}
                  />
                </label>

                <button type="submit" disabled={submitting}>Підтвердити бронювання</button>
              </form>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
