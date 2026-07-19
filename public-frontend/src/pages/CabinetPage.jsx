import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useGuest } from '../state/guest';
import { localizedCopy } from '../lib/i18n';
import { guestApi } from '../lib/api';
import { identifyAnalytics, captureAnalytics, resetAnalytics } from '../lib/analytics';

const COUNTRIES = [
  { code: 'UA', flag: '\u{1F1FA}\u{1F1E6}', dial: '+380', mask: 'XX XXX XX XX', len: 9 },
  { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', dial: '+1',    mask: 'XXX XXX XXXX', len: 10 },
  { code: 'GB', flag: '\u{1F1EC}\u{1F1E7}', dial: '+44',   mask: 'XXXX XXXXXX', len: 10 },
  { code: 'PL', flag: '\u{1F1F5}\u{1F1F1}', dial: '+48',   mask: 'XXX XXX XXX', len: 9 },
  { code: 'DE', flag: '\u{1F1E9}\u{1F1EA}', dial: '+49',   mask: 'XXXX XXXXXXX', len: 10 },
  { code: 'FR', flag: '\u{1F1EB}\u{1F1F7}', dial: '+33',   mask: 'X XX XX XX XX', len: 9 },
  { code: 'IT', flag: '\u{1F1EE}\u{1F1F9}', dial: '+39',   mask: 'XXX XXX XXXX', len: 10 },
  { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', dial: '+34',   mask: 'XXX XX XX XX', len: 9 },
  { code: 'IL', flag: '\u{1F1EE}\u{1F1F1}', dial: '+972',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'CA', flag: '\u{1F1E8}\u{1F1E6}', dial: '+1',    mask: 'XXX XXX XXXX', len: 10 },
];

function formatPhoneValue(raw, country) {
  const digits = raw.replace(/\D/g, '').slice(0, country.len);
  let result = '';
  let di = 0;
  for (const ch of country.mask) {
    if (ch === 'X') {
      if (di < digits.length) result += digits[di++];
      else break;
    } else {
      result += ch;
    }
  }
  return result;
}

function PhoneInput({ value, onChange, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const country = COUNTRIES.find((c) => c.dial === value?.split(' ')[0]?.replace('+', '+') && value?.startsWith(c.dial)) || COUNTRIES[0];
  const localPart = value ? value.slice(country.dial.length).trim() : '';

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(c) {
    setOpen(false);
    onChange(`+${c.dial.replace('+', '')} `);
  }

  function handleInput(e) {
    const raw = e.target.value;
    if (raw.startsWith(country.dial) || raw.startsWith(`+${country.dial.replace('+', '')}`)) {
      const local = raw.slice(country.dial.length + 1).replace(/\D/g, '');
      onChange(`${country.dial} ${formatPhoneValue(local, country)}`);
    } else {
      const digits = raw.replace(/\D/g, '').slice(0, country.len);
      onChange(`+${country.dial.replace('+', '')} ${formatPhoneValue(digits, country)}`);
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 0, border: '1px solid var(--line-light)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <button type="button" onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 8px', border: 'none', borderRight: '1px solid var(--line-light)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: 14, minWidth: 60 }}>
          <span>{country.flag}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{country.dial}</span>
        </button>
        <input
          type="tel"
          value={value ? value.slice(country.dial.length + 1) : ''}
          onChange={handleInput}
          required={required}
          placeholder={formatPhoneValue('', country)}
          style={{ flex: 1, padding: '12px 14px', border: 'none', background: 'transparent', fontSize: 15, color: 'var(--text)', outline: 'none' }}
        />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {COUNTRIES.map((c) => (
            <button key={c.code} type="button" onClick={() => handleSelect(c)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: c.code === country.code ? 'var(--accent-bg, rgba(0,0,0,0.05))' : 'transparent', cursor: 'pointer', fontSize: 14 }}>
              <span>{c.flag}</span>
              <span style={{ fontWeight: 500 }}>{c.dial}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [favOrders, setFavOrders] = useState([]);
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
      const [res, fav, orders] = await Promise.all([
        guestApi.reservations(),
        guestApi.favorites(),
        guestApi.favoriteOrders()
      ]);
      setReservations(res.reservations || []);
      setFavorites(fav.favorites || []);
      setFavOrders(orders.orders || []);
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
    if (phone.replace(/\D/g, '').length < 7) {
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
    setFavOrders([]);
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

  const handleRenameFavOrder = async (id) => {
    const order = favOrders.find((o) => o.id === id);
    const newName = window.prompt(c({ ua: 'Назва замовлення', ru: 'Название заказа', en: 'Order name' }), order?.name || '');
    if (newName === null || !newName.trim()) return;
    try {
      await guestApi.renameFavoriteOrder(id, newName.trim());
      setFavOrders((prev) => prev.map((o) => o.id === id ? { ...o, name: newName.trim() } : o));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteFavOrder = async (id) => {
    if (!window.confirm(c({ ua: 'Видалити?', ru: 'Удалить?', en: 'Delete?' }))) return;
    try {
      await guestApi.deleteFavoriteOrder(id);
      setFavOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReorder = (order) => {
    const items = {};
    try {
      const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.menuItemId) items[String(item.menuItemId)] = { quantity: item.quantity || 1 };
        });
      }
    } catch {}
    localStorage.setItem('gorpliaj-menu-cart', JSON.stringify(items));
    navigate('/menu');
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
              <PhoneInput value={phone} onChange={setPhone} required />
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

      <div className="cabinet-actions">
        <Link to="/booking" className="cabinet-action-btn">{c({ ua: 'Нове бронювання', ru: 'Новое бронирование', en: 'New booking' })}</Link>
        <Link to="/menu" className="cabinet-action-btn">{c({ ua: 'Переглянути меню', ru: 'Посмотреть меню', en: 'View menu' })}</Link>
      </div>

      <div className="cabinet-tabs">
        <button className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>
          {c({ ua: 'Бронювання', ru: 'Бронирования', en: 'Bookings' })}
        </button>
        <button className={tab === 'favorites' ? 'active' : ''} onClick={() => setTab('favorites')}>
          {c({ ua: 'Улюблене', ru: 'Избранное', en: 'Favorites' })}
        </button>
        <button className={tab === 'favOrders' ? 'active' : ''} onClick={() => setTab('favOrders')}>
          {c({ ua: 'Улюблені замовлення', ru: 'Избранные заказы', en: 'Favorite orders' })}
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

      {tab === 'favOrders' && (
        <div className="cabinet-list">
          {favOrders.length === 0 && <p className="cabinet-empty">{c({ ua: 'Поки немає збережених замовлень.', ru: 'Пока нет сохранённых заказов.', en: 'No saved orders yet.' })}</p>}
          {favOrders.map((order) => {
            let itemCount = 0;
            let totalPrice = 0;
            try {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              if (Array.isArray(items)) {
                itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
                totalPrice = items.reduce((s, i) => s + (i.quantity || 1) * (i.price || 0), 0);
              }
            } catch {}
            return (
              <div key={order.id} className="cabinet-card">
                <div className="cabinet-card-main">
                  <strong>{order.name}</strong>
                  <span className="cabinet-meta">{itemCount} {c({ ua: 'шт.', ru: 'шт.', en: 'items' })} · {totalPrice} {c({ ua: 'грн', ru: 'грн', en: 'UAH' })}</span>
                  <span className="cabinet-meta">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="cabinet-card-side">
                  <button className="cabinet-book-btn" onClick={() => handleReorder(order)}>{c({ ua: 'Повторити', ru: 'Повторить', en: 'Reorder' })}</button>
                  <button className="cabinet-cancel" onClick={() => handleRenameFavOrder(order.id)}>{c({ ua: 'Перейменувати', ru: 'Переименовать', en: 'Rename' })}</button>
                  <button className="cabinet-cancel" onClick={() => handleDeleteFavOrder(order.id)}>{c({ ua: 'Видалити', ru: 'Удалить', en: 'Delete' })}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
