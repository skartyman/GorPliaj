import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { localizedCopy } from '../lib/i18n';
import { guestApi } from '../lib/api';
import { identifyAnalytics, captureAnalytics, resetAnalytics } from '../lib/analytics';

const STATUS_LABELS = {
  PENDING: { ua: 'Очікує', ru: 'Ожидает', en: 'Pending' },
  AWAITING_PAYMENT: { ua: 'Очікує оплату', ru: 'Ожидает оплату', en: 'Awaiting payment' },
  CONFIRMED: { ua: 'Підтверджено', ru: 'Подтверждено', en: 'Confirmed' },
  SEATED: { ua: 'За столом', ru: 'За столом', en: 'Seated' },
  COMPLETED: { ua: 'Завершено', ru: 'Завершено', en: 'Completed' },
  CANCELLED: { ua: 'Скасовано', ru: 'Отменено', en: 'Cancelled' },
  NO_SHOW: { ua: 'Не прийшли', ru: 'Не пришли', en: 'No show' },
  EXPIRED: { ua: 'Прострочено', ru: 'Просрочено', en: 'Expired' }
};

function statusLabel(status, locale) {
  const entry = STATUS_LABELS[status] || { ua: status, ru: status, en: status };
  return entry[locale] || entry.ua;
}

export default function CabinetPage() {
  const { locale } = useLocale();
  const c = (values) => localizedCopy(values, locale);
  const [searchParams, setSearchParams] = useSearchParams();

  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('guest_token') || null; } catch { return null; }
  });
  const [guest, setGuest] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reservations');

  const loadCabinet = useCallback(async () => {
    try {
      const [me, res, fav] = await Promise.all([
        guestApi.me(),
        guestApi.reservations(),
        guestApi.favorites()
      ]);
      setGuest(me.guest);
      setReservations(res.reservations || []);
      setFavorites(fav.favorites || []);
    } catch (err) {
      setError(err.message || c({ ua: 'Не вдалося завантажити кабінет.', ru: 'Не удалось загрузить кабинет.', en: 'Failed to load cabinet.' }));
    }
  }, [c]);

  const finishLogin = useCallback(async (authToken, guestData) => {
    try { localStorage.setItem('guest_token', authToken); } catch {}
    setToken(authToken);
    setGuest(guestData);
    captureAnalytics('guest_logged_in', { method: 'magic_link' });
    identifyAnalytics(`guest_${guestData.id}`, { email: guestData.email, name: guestData.name });
    await loadCabinet();
  }, [loadCabinet, c]);

  useEffect(() => {
    if (!token) return;
    loadCabinet();
  }, [token, loadCabinet]);

  useEffect(() => {
    const linkToken = searchParams.get('token');
    if (linkToken && !token) {
      setLoading(true);
      guestApi.verifyLink(linkToken)
        .then(async (data) => {
          await finishLogin(data.token, data.guest);
          searchParams.delete('token');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(() => {
          setError(c({ ua: 'Посилання для входу недійсне або застаріле.', ru: 'Ссылка для входа недействительна или устарела.', en: 'Login link is invalid or expired.' }));
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams, token, finishLogin, c]);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.includes('@')) {
      setError(c({ ua: 'Введіть коректний email.', ru: 'Введите корректный email.', en: 'Enter a valid email.' }));
      return;
    }
    setSendingLink(true);
    try {
      await guestApi.requestLink(email, phone, name);
      captureAnalytics('guest_registered', { method: 'magic_link' });
      setMessage(c({ ua: 'Ми надіслали посилання для входу на ваш email. Перевірте пошту.', ru: 'Мы отправили ссылку для входа на ваш email. Проверьте почту.', en: 'We sent a login link to your email. Check your inbox.' }));
    } catch (err) {
      setError(err.message || c({ ua: 'Не вдалося надіслати посилання.', ru: 'Не удалось отправить ссылку.', en: 'Failed to send login link.' }));
    } finally {
      setSendingLink(false);
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem('guest_token'); } catch {}
    resetAnalytics();
    setToken(null);
    setGuest(null);
    setReservations([]);
    setFavorites([]);
  };

  const handleCancel = async (id) => {
    if (!window.confirm(c({ ua: 'Скасувати бронювання?', ru: 'Отменить бронирование?', en: 'Cancel this reservation?' }))) return;
    try {
      await guestApi.cancelReservation(id);
      captureAnalytics('booking_cancelled', { reason: 'guest_self_service', reservationId: id });
      setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: 'CANCELLED' } : r));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleFavorite = async (tableId, isFav) => {
    try {
      if (isFav) {
        await guestApi.removeFavorite(tableId);
        setFavorites((prev) => prev.filter((f) => f.tableId !== tableId));
      } else {
        const res = await guestApi.addFavorite(tableId);
        setFavorites((prev) => [...prev, res.favorite]);
      }
      captureAnalytics('favorite_unit_set', { tableId, action: isFav ? 'remove' : 'add' });
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <div className="cabinet-page">
        <div className="cabinet-login">
          <h1>{c({ ua: 'Кабінет гостя', ru: 'Кабинет гостя', en: 'Guest cabinet' })}</h1>
          <p className="cabinet-sub">{c({ ua: 'Ваші бронювання, улюблені столики та історія — в одному місці.', ru: 'Ваши брони, любимые столики и история — в одном месте.', en: 'Your bookings, favorite tables and history — all in one place.' })}</p>
          <form onSubmit={handleRequestLink} className="cabinet-form">
            <label>
              {c({ ua: 'Імʼя', ru: 'Имя', en: 'Name' })}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={c({ ua: 'Необовʼязково', ru: 'Необязательно', en: 'Optional' })} />
            </label>
            <label>
              {c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={c({ ua: 'Необовʼязково', ru: 'Необязательно', en: 'Optional' })} />
            </label>
            <label>
              Email *
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </label>
            <button type="submit" disabled={sendingLink}>
              {sendingLink ? c({ ua: 'Надсилаємо…', ru: 'Отправляем…', en: 'Sending…' }) : c({ ua: 'Отримати посилання для входу', ru: 'Получить ссылку для входа', en: 'Get login link' })}
            </button>
          </form>
          {message && <p className="cabinet-success">{message}</p>}
          {error && <p className="cabinet-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="cabinet-page">
      <div className="cabinet-header">
        <div>
          <h1>{c({ ua: 'Кабінет гостя', ru: 'Кабинет гостя', en: 'Guest cabinet' })}</h1>
          {guest && <p className="cabinet-email">{guest.email}</p>}
        </div>
        <button className="cabinet-logout" onClick={handleLogout}>{c({ ua: 'Вийти', ru: 'Выйти', en: 'Log out' })}</button>
      </div>

      {error && <p className="cabinet-error">{error}</p>}

      <div className="cabinet-tabs">
        <button className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>
          {c({ ua: 'Бронювання', ru: 'Бронирования', en: 'Bookings' })}
        </button>
        <button className={tab === 'favorites' ? 'active' : ''} onClick={() => setTab('favorites')}>
          {c({ ua: 'Улюблене', ru: 'Избранное', en: 'Favorites' })}
        </button>
      </div>

      {tab === 'reservations' && (
        <div className="cabinet-list">
          {reservations.length === 0 && <p className="cabinet-empty">{c({ ua: 'Поки немає бронювань.', ru: 'Пока нет бронирований.', en: 'No bookings yet.' })}</p>}
          {reservations.map((r) => (
            <div key={r.id} className="cabinet-card">
              <div className="cabinet-card-main">
                <strong>{r.table?.name ? localizedCopy(r.table.name, locale) : (r.table?.code || `#${r.id}`)}</strong>
                <span className="cabinet-meta">{new Date(r.reservationDate).toLocaleDateString()} · {r.timeFrom?.slice(11, 16)} · {r.guests} {c({ ua: 'гостей', ru: 'гостей', en: 'guests' })}</span>
                {r.event && <span className="cabinet-event">{localizedCopy(r.event.title, locale)}</span>}
              </div>
              <div className="cabinet-card-side">
                <span className={`cabinet-status status-${r.status}`}>{statusLabel(r.status, locale)}</span>
                {r.payment && <span className="cabinet-paid">{Number(r.payment.amount)} {r.payment.currency}</span>}
                {['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(r.status) && (
                  <button className="cabinet-cancel" onClick={() => handleCancel(r.id)}>{c({ ua: 'Скасувати', ru: 'Отменить', en: 'Cancel' })}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'favorites' && (
        <div className="cabinet-list">
          {favorites.length === 0 && <p className="cabinet-empty">{c({ ua: 'Додайте улюблені столики при бронюванні.', ru: 'Добавьте любимые столики при бронировании.', en: 'Add favorite tables when booking.' })}</p>}
          {favorites.map((f) => (
            <div key={f.tableId} className="cabinet-card">
              <div className="cabinet-card-main">
                <strong>{f.table?.name ? localizedCopy(f.table.name, locale) : (f.table?.code || `#${f.tableId}`)}</strong>
                <span className="cabinet-meta">{f.table?.bookingKind} · {f.table?.seatsMin}–{f.table?.seatsMax} {c({ ua: 'місць', ru: 'мест', en: 'seats' })}</span>
              </div>
              <button className="cabinet-cancel" onClick={() => toggleFavorite(f.tableId, true)}>{c({ ua: 'Прибрати', ru: 'Убрать', en: 'Remove' })}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
