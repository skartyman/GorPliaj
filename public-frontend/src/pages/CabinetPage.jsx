import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useLocale } from '../state/locale';
import { useGuest } from '../state/guest';
import { localizedCopy } from '../lib/i18n';
import { guestApi } from '../lib/api';
import { identifyAnalytics, captureAnalytics, resetAnalytics } from '../lib/analytics';
import PhoneInput from '../components/PhoneInput';
import WelcomeCard from '../components/WelcomeCard';
import EveningBeachCard from '../components/EveningBeachCard';

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
  const { guest, isLoggedIn, login, logout: ctxLogout, refresh } = useGuest();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favOrders, setFavOrders] = useState([]);
  const [shellBalance, setShellBalance] = useState(0);
  const [shellHistory, setShellHistory] = useState([]);
  const [shellPage, setShellPage] = useState(1);
  const [shellTotalPages, setShellTotalPages] = useState(1);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reservations');
  const [welcomeData, setWelcomeData] = useState(null);
  const [eveningBeach, setEveningBeach] = useState(null);
  const verifyingTokenRef = useRef(null);

  const loadCabinet = useCallback(async () => {
    try {
      const [res, fav, orders, shell] = await Promise.all([
        guestApi.reservations(),
        guestApi.favorites(),
        guestApi.favoriteOrders(),
        guestApi.shellBalance()
      ]);
      setReservations(res.reservations || []);
      setFavorites(fav.favorites || []);
      setFavOrders(orders.orders || []);
      setShellBalance(shell.balance || 0);
    } catch (err) {
      setError(err.message || c({ ua: 'Не вдалося завантажити кабінет.', ru: 'Не удалось загрузить кабинет.', en: 'Failed to load cabinet.' }));
    }
    try {
      const welcome = await guestApi.welcome();
      setWelcomeData(welcome);
    } catch {}
    try {
      const beach = await guestApi.eveningBeach();
      setEveningBeach(beach);
    } catch {}
  }, [c]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadCabinet();
  }, [isLoggedIn, loadCabinet]);

  useEffect(() => {
    const linkToken = searchParams.get('token');
    if (linkToken && !isLoggedIn && verifyingTokenRef.current !== linkToken) {
      verifyingTokenRef.current = linkToken;
      setLoading(true);
      guestApi.verifyLink(linkToken)
        .then(async (data) => {
          login(data.token, data.guest);
          captureAnalytics('guest_logged_in', { method: 'magic_link' });
          identifyAnalytics(`guest_${data.guest.id}`, { email: data.guest.email, name: data.guest.name });
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('token');
          setSearchParams(nextParams, { replace: true });
        })
        .catch(() => {
          setError(c({ ua: 'Посилання для входу недійсне або застаріле.', ru: 'Ссылка для входа недействительна или устарела.', en: 'Login link is invalid or expired.' }));
        })
        .finally(() => setLoading(false));
    }
  }, [searchParams, isLoggedIn, login, c]);

  useEffect(() => {
    if (searchParams.get('topup') === 'success' && isLoggedIn) {
      setMessage(c({ ua: 'Баланс успішно поповнено!', ru: 'Баланс успешно пополнен!', en: 'Balance topped up successfully!' }));
      setTab('shells');
      loadCabinet();
      loadShellHistory();
      refresh();
      searchParams.delete('topup');
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isLoggedIn]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['reservations', 'favorites', 'favOrders', 'shells'].includes(tabParam)) {
      setTab(tabParam);
      if (tabParam === 'shells') {
        loadShellHistory();
      }
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isLoggedIn]);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.includes('@')) {
      setError(c({ ua: 'Введіть коректний email.', ru: 'Введите корректный email.', en: 'Enter a valid email.' }));
      return;
    }
    if (authMode === 'register' && name.trim().length < 2) {
      setError(c({ ua: 'Введіть імʼя.', ru: 'Введите имя.', en: 'Enter your name.' }));
      return;
    }
    if (authMode === 'register' && phone.replace(/\D/g, '').length < 7) {
      setError(c({ ua: 'Введіть телефон.', ru: 'Введите телефон.', en: 'Enter your phone.' }));
      return;
    }
    setSendingLink(true);
    try {
      await guestApi.requestLink(email, authMode === 'register' ? phone : null, authMode === 'register' ? name : null, authMode === 'login');
      captureAnalytics(authMode === 'register' ? 'guest_registered' : 'guest_login_link_requested', { method: 'magic_link' });
      setMessage(c({ ua: 'Ми надіслали посилання для входу на ваш email. Перевірте пошту.', ru: 'Мы отправили ссылку для входа на ваш email. Проверьте почту.', en: 'We sent a login link to your email. Check your inbox.' }));
    } catch (err) {
      setError(err.status === 404
        ? c({ ua: 'Акаунт із таким email не знайдено. Оберіть реєстрацію.', ru: 'Аккаунт с таким email не найден. Выберите регистрацию.', en: 'No account found for this email. Choose registration.' })
        : (err.message || c({ ua: 'Не вдалося надіслати посилання.', ru: 'Не удалось отправить ссылку.', en: 'Failed to send login link.' })));
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
    setShellBalance(0);
    setShellHistory([]);
  };

  const loadShellHistory = async (page = 1) => {
    try {
      const data = await guestApi.shellHistory(page);
      setShellHistory(data.transactions || []);
      setShellPage(data.page || 1);
      setShellTotalPages(data.totalPages || 1);
    } catch {}
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return;
    setTopupLoading(true);
    try {
      const result = await guestApi.shellTopup(amount);
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      }
    } catch (err) {
      setError(err.message || 'Failed to create top-up.');
      setTopupLoading(false);
    }
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
          <p className="cabinet-sub">{c({ ua: 'Ваші бронювання, улюблені столики та історія - в одному місці. Імʼя та телефон потрібні для бронювання.',
            ru: 'Ваши брони, любимые столики и история - в одном месте. Имя и телефон нужны для бронирования.',
            en: 'Your bookings, favorite tables and history - all in one place. Name and phone are required for booking.' })}</p>
          <div className="cabinet-auth-switch" role="tablist" aria-label={c({ ua: 'Вхід або реєстрація', ru: 'Вход или регистрация', en: 'Login or registration' })}>
            <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setError(''); setMessage(''); }}>
              {c({ ua: 'Увійти', ru: 'Войти', en: 'Log in' })}
            </button>
            <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); setError(''); setMessage(''); }}>
              {c({ ua: 'Реєстрація', ru: 'Регистрация', en: 'Register' })}
            </button>
          </div>
          <form onSubmit={handleRequestLink} className="cabinet-form">
            {authMode === 'register' && <label>
              {c({ ua: 'Імʼя *', ru: 'Имя *', en: 'Name *' })}
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder={c({ ua: 'Ваше імʼя', ru: 'Ваше имя', en: 'Your name' })} />
            </label>}
            {authMode === 'register' && <label>
              {c({ ua: 'Телефон *', ru: 'Телефон *', en: 'Phone *' })}
              <PhoneInput value={phone} onChange={setPhone} required />
            </label>}
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

      {welcomeData && <WelcomeCard data={welcomeData} onPurchased={() => loadCabinet()} />}

      {eveningBeach && <EveningBeachCard data={eveningBeach} />}

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
        <button className={tab === 'shells' ? 'active' : ''} onClick={() => { setTab('shells'); loadShellHistory(); }}>
          {c({ ua: 'Мушлі', ru: 'Моллюски', en: 'Shells' })} {guest?.shellBalance != null ? `(${guest.shellBalance})` : ''}
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

      {tab === 'shells' && (
        <div className="cabinet-shells">
          <div className="shells-balance-card">
            <div className="shells-balance-label">{c({ ua: 'Ваш баланс', ru: 'Ваш баланс', en: 'Your balance' })}</div>
            <div className="shells-balance-value">{guest?.shellBalance || 0} {c({ ua: 'мушель', ru: 'моллюсков', en: 'shells' })}</div>
            <div className="shells-topup-row">
              <input
                type="number"
                min="1"
                step="1"
                className="form-input shells-topup-input"
                placeholder={c({ ua: 'Сума поповнення (₴)', ru: 'Сумма пополнения (₴)', en: 'Top-up amount (₴)' })}
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
              />
              <button className="cabinet-book-btn" onClick={handleTopup} disabled={topupLoading || !topupAmount}>
                {topupLoading ? '...' : c({ ua: 'Поповнити', ru: 'Пополнить', en: 'Top up' })}
              </button>
            </div>
            <p className="shells-rate">1 ₴ = 1 {c({ ua: 'мушля', ru: 'моллюск', en: 'shell' })}</p>
          </div>

          <h3 className="shells-history-title">{c({ ua: 'Історія операцій', ru: 'История операций', en: 'Transaction history' })}</h3>
          {shellHistory.length === 0 && <p className="cabinet-empty">{c({ ua: 'Поки немає операцій.', ru: 'Пока нет операций.', en: 'No transactions yet.' })}</p>}
          {shellHistory.map((t) => (
            <div key={t.id} className="cabinet-card shells-tx">
              <div className="cabinet-card-main">
                <strong>{t.description || t.source}</strong>
                <span className="cabinet-meta">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="cabinet-card-side">
                <span className={`shells-tx-amount ${t.type === 'SPEND' ? 'negative' : 'positive'}`}>
                  {t.type === 'SPEND' ? '-' : '+'}{t.amount}
                </span>
              </div>
            </div>
          ))}
          {shellTotalPages > 1 && (
            <div className="shells-pagination">
              <button className="cabinet-cancel" disabled={shellPage <= 1} onClick={() => loadShellHistory(shellPage - 1)}>←</button>
              <span>{shellPage} / {shellTotalPages}</span>
              <button className="cabinet-cancel" disabled={shellPage >= shellTotalPages} onClick={() => loadShellHistory(shellPage + 1)}>→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
