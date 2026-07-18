import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useGuest } from '../state/guest';
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
  const { guest, isLoggedIn, login, logout: ctxLogout } = useGuest();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
      const [res, fav] = await Promise.all([
        guestApi.reservations(),
        guestApi.favorites()
      ]);
      setReservations(res.reservations || []);
      setFavorites(fav.favorites || []);
    } catch (err) {
      setError(err.message || c({ ua: 'Не вдалося завантажити кабінет.', ru: 'Не удалось загрузить кабинет.', en: 'Failed to load cabinet.' }));
    }
  }, [c]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadCabinet();
  }, [isLoggedIn, loadCabinet]);

  useEffect(() => {
    const linkToken = searchParams.get('token');
    if (linkToken && !isLoggedIn) {
      setLoading(true);
      guestApi.verifyLink(linkToken)
        .then(async (data) => {
          login(data.token, data.guest);
          captureAnalytics('guest_logged_in', { method: 'magic_link' });
          identifyAnalytics(`guest_${data.guest.id}`, { email: data.guest.email, name: data.guest.name });
          searchParams.delete('token');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(() => {
          setError(c({ ua: 'Посилання для входу недійсне або застаріле.', ru: 'Ссылка для входа недействительна или устарела.', en: 'Login link is invalid or expired.' }));
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams, isLoggedIn, login, c]);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.includes('@')) {
      setError(c({ ua: 'Введіть коректний email.', ru: 'Введите корректный email.', en: 'Enter a valid email.' }));
      return;
    }
    if (name.trim().length < 2) {
      setError(c({ ua: 'Введіть імʼя.', ru: 'Введите имя.', en: 'Enter your name.' }));
      return;
    }
    if (phone.trim().length < 7) {
      setError(c({ ua: 'Введіть телефон.', ru: 'Введите телефон.', en: 'Enter your phone.' }));
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
    resetAnalytics();
    ctxLogout();
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

  const toggleFavorite = async (fav) => {
    try {
      if (fav.kind === 'menu') {
        await guestApi.removeFavorite({ kind: 'menu', menuItemId: fav.menuItemId });
        setFavorites((prev) => prev.filter((f) => !(f.kind === 'menu' && f.menuItemId === fav.menuItemId)));
      } else {
        await guestApi.removeFavorite({ kind: 'table', tableId: fav.tableId });
        setFavorites((prev) => prev.filter((f) => !(f.kind === 'table' && f.tableId === fav.tableId)));
      }
      captureAnalytics('favorite_unit_set', { action: 'remove', kind: fav.kind });
    } catch (err) {
      setError(err.message);
    }
  };

  const bookFromFavorite = (fav) => {
    const tableId = fav.tableId;
    const kind = fav.table?.bookingKind ? fav.table.bookingKind.toLowerCase() : 'table';
    const params = new URLSearchParams({ favoritesTableId: String(tableId), kind });
    navigate(`/booking?${params.toString()}`);
  };

  if (!isLoggedIn) {
    return (
      <div className="cabinet-page">
        <div className="cabinet-login">
          <h1>{c({ ua: 'Кабінет гостя', ru: 'Кабинет гостя', en: 'Guest cabinet' })}</h1>
          <p className="cabinet-sub">{c({ ua: 'Ваші бронювання, улюблені столики та історія — в одному місці. Імʼя та телефон потрібні для бронювання.', ru: 'Ваши брони, любимые столики и история — в одном месте. Имя и телефон нужны для бронирования.', en: 'Your bookings, favorite tables and history — all in one place. Name and phone are required for booking.' })}</p>
          <form onSubmit={handleRequestLink} className="cabinet-form">
            <label>
              {c({ ua: 'Імʼя *', ru: 'Имя *', en: 'Name *' })}
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder={c({ ua: 'Ваше імʼя', ru: 'Ваше имя', en: 'Your name' })} />
            </label>
            <label>
              {c({ ua: 'Телефон *', ru: 'Телефон *', en: 'Phone *' })}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={7} placeholder="+38 (0XX) XXX-XX-XX" />
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
          {favorites.length === 0 && <p className="cabinet-empty">{c({ ua: 'Додайте улюблені столики, кроваті або страви.', ru: 'Добавьте любимые столики, кровати или блюда.', en: 'Add favorite tables, beds or dishes.' })}</p>}
          {favorites.map((f) => (
            <div key={`${f.kind}-${f.tableId || f.menuItemId}`} className="cabinet-card">
              {f.kind === 'menu' ? (
                <>
                  <div className="cabinet-card-main">
                    <strong>{f.menuItem?.name ? localizedCopy(f.menuItem.name, locale) : `#${f.menuItemId}`}</strong>
                    {f.menuItem?.price != null && <span className="cabinet-meta">{Number(f.menuItem.price)} ₴</span>}
                  </div>
                  <button className="cabinet-cancel" onClick={() => toggleFavorite(f)}>{c({ ua: 'Прибрати', ru: 'Убрать', en: 'Remove' })}</button>
                </>
              ) : (
                <>
                  <div className="cabinet-card-main">
                    <strong>{f.table?.name ? localizedCopy(f.table.name, locale) : (f.table?.code || `#${f.tableId}`)}</strong>
                    <span className="cabinet-meta">{f.table?.bookingKind} · {f.table?.seatsMin}–{f.table?.seatsMax} {c({ ua: 'місць', ru: 'мест', en: 'seats' })}</span>
                  </div>
                  <div className="cabinet-card-side">
                    <button className="cabinet-book-btn" onClick={() => bookFromFavorite(f)}>{c({ ua: 'Забронювати', ru: 'Забронировать', en: 'Book' })}</button>
                    <button className="cabinet-cancel" onClick={() => toggleFavorite(f)}>{c({ ua: 'Прибрати', ru: 'Убрать', en: 'Remove' })}</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
