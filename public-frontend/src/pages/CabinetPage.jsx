import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useGuest } from '../state/guest';
import { localizedCopy } from '../lib/i18n';
import { guestApi } from '../lib/api';
import { identifyAnalytics, captureAnalytics, resetAnalytics } from '../lib/analytics';

const COUNTRIES = [
  { code: 'UA', name: 'Україна',             dial: '+380', mask: 'XX XXX XX XX', len: 9 },
  { code: 'US', name: 'United States',       dial: '+1',    mask: 'XXX XXX XXXX', len: 10 },
  { code: 'GB', name: 'United Kingdom',      dial: '+44',   mask: 'XXXX XXXXXX', len: 10 },
  { code: 'PL', name: 'Polska',              dial: '+48',   mask: 'XXX XXX XXX', len: 9 },
  { code: 'DE', name: 'Deutschland',         dial: '+49',   mask: 'XXXX XXXXXXX', len: 10 },
  { code: 'FR', name: 'France',              dial: '+33',   mask: 'X XX XX XX XX', len: 9 },
  { code: 'IT', name: 'Italia',              dial: '+39',   mask: 'XXX XXX XXXX', len: 10 },
  { code: 'ES', name: 'España',              dial: '+34',   mask: 'XXX XX XX XX', len: 9 },
  { code: 'IL', name: 'Israel',              dial: '+972',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'CA', name: 'Canada',              dial: '+1',    mask: 'XXX XXX XXXX', len: 10 },
  { code: 'AU', name: 'Australia',           dial: '+61',   mask: 'XXXX XXXXXX', len: 9 },
  { code: 'AT', name: 'Österreich',          dial: '+43',   mask: 'XXX XXXXXX', len: 10 },
  { code: 'BE', name: 'België',              dial: '+32',   mask: 'XXX XX XX XX', len: 9 },
  { code: 'BG', name: 'България',            dial: '+359',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'HR', name: 'Hrvatska',            dial: '+385',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'CY', name: 'Κύπρος',              dial: '+357',  mask: 'XX XXX XXX', len: 8 },
  { code: 'CZ', name: 'Česko',               dial: '+420',  mask: 'XXX XXX XXX', len: 9 },
  { code: 'DK', name: 'Danmark',             dial: '+45',   mask: 'XX XX XX XX', len: 8 },
  { code: 'EE', name: 'Eesti',               dial: '+372',  mask: 'XXXX XXXX', len: 8 },
  { code: 'FI', name: 'Suomi',               dial: '+358',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'GR', name: 'Ελλάδα',              dial: '+30',   mask: 'XX XXX XXXX', len: 10 },
  { code: 'HU', name: 'Magyarország',        dial: '+36',   mask: 'XX XXX XXX', len: 9 },
  { code: 'IE', name: 'Ireland',             dial: '+353',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'JP', name: '日本',                dial: '+81',   mask: 'XX XXXX XXXX', len: 10 },
  { code: 'LV', name: 'Latvija',             dial: '+371',  mask: 'XX XXX XXX', len: 8 },
  { code: 'LT', name: 'Lietuva',             dial: '+370',  mask: 'XXX XXX XXX', len: 8 },
  { code: 'MT', name: 'Malta',               dial: '+356',  mask: 'XXXX XXXX', len: 8 },
  { code: 'MD', name: 'Moldova',             dial: '+373',  mask: 'XXXX XXXX', len: 8 },
  { code: 'NL', name: 'Nederland',           dial: '+31',   mask: 'XX XXXXXXX', len: 9 },
  { code: 'NO', name: 'Norge',               dial: '+47',   mask: 'XXX XX XXX', len: 8 },
  { code: 'PT', name: 'Portugal',            dial: '+351',  mask: 'XXX XXX XXX', len: 9 },
  { code: 'RO', name: 'România',             dial: '+40',   mask: 'XX XXX XXX', len: 9 },
  { code: 'SK', name: 'Slovensko',           dial: '+421',  mask: 'XXX XXX XXX', len: 9 },
  { code: 'SI', name: 'Slovenija',           dial: '+386',  mask: 'XX XXX XXX', len: 8 },
  { code: 'SE', name: 'Sverige',             dial: '+46',   mask: 'XX XXX XXXX', len: 9 },
  { code: 'CH', name: 'Schweiz',             dial: '+41',   mask: 'XX XXX XX XX', len: 9 },
  { code: 'TR', name: 'Türkiye',             dial: '+90',   mask: 'XXX XXX XX XX', len: 10 },
  { code: 'AE', name: 'الإمارات',            dial: '+971',  mask: 'XX XXX XXXX', len: 9 },
  { code: 'SA', name: 'المملكة العربية السعودية', dial: '+966', mask: 'XX XXX XXXX', len: 9 },
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
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  const country = COUNTRIES.find((c) => {
    const v = (value || '').replace(/\s/g, '');
    return v.startsWith(c.dial);
  }) || COUNTRIES[0];

  const filtered = COUNTRIES.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.dial.includes(q);
  });

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  function handleSelect(c) {
    setOpen(false);
    setSearch('');
    onChange(`${c.dial} `);
  }

  function handleInput(e) {
    const raw = e.target.value;
    const dialLen = country.dial.length;
    const local = raw.replace(/[^\d]/g, '');
    const formatted = formatPhoneValue(local.slice(dialLen > 0 ? 0 : 0), country);
    if (local.length > 0) {
      onChange(`${country.dial} ${formatted}`);
    } else {
      onChange('');
    }
  }

  function handleRawKeyDown(e) {
    if (e.key === 'Backspace') {
      const localDigits = (value || '').replace(/[^\d]/g, '').slice(country.dial.length);
      if (localDigits.length === 0) {
        onChange('');
      }
    }
  }

  return (
    <div ref={ref} className="phone-input-wrap">
      <div className="phone-input-box">
        <button type="button" className="phone-country-btn" onClick={() => { setOpen(!open); setSearch(''); }}>
          <span className="phone-flag">{country.code}</span>
          <span className="phone-dial">{country.dial}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 2, opacity: 0.5 }}><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <input
          type="tel"
          className="phone-number-input"
          value={value ? value.slice(country.dial.length + 1) : ''}
          onChange={handleInput}
          onKeyDown={handleRawKeyDown}
          required={required}
          placeholder={formatPhoneValue('', country)}
        />
      </div>
      {open && (
        <div className="phone-dropdown">
          <div className="phone-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              ref={searchRef}
              type="text"
              className="phone-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук країни..."
            />
          </div>
          <div className="phone-list">
            {filtered.map((c) => (
              <button key={c.code} type="button" className={`phone-option ${c.code === country.code ? 'active' : ''}`} onClick={() => handleSelect(c)}>
                <span className="phone-flag">{c.code}</span>
                <span className="phone-option-name">{c.name}</span>
                <span className="phone-option-dial">{c.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="phone-empty">Нічого не знайдено</div>}
          </div>
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
