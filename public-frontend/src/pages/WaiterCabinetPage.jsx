import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale } from '../state/locale';
import { localizedCopy } from '../lib/i18n';
import { waiterApi } from '../lib/api';
import WaiterInstallPrompt from '../components/WaiterInstallPrompt';
import { Html5Qrcode } from 'html5-qrcode';

const STATUS_LABELS = {
  PENDING: { ua: 'Очікує', ru: 'Ожидает', en: 'Pending', color: '#f59e0b' },
  ACCEPTED: { ua: 'Прийнято', ru: 'Принято', en: 'Accepted', color: '#3b82f6' },
  PREPARING: { ua: 'Готується', ru: 'Готовится', en: 'Preparing', color: '#8b5cf6' },
  COMPLETED: { ua: 'Готово', ru: 'Готово', en: 'Done', color: '#10b981' },
  CANCELLED: { ua: 'Скасовано', ru: 'Отменено', en: 'Cancelled', color: '#6b7280' },
};

function timeAgo(dateStr, locale) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '<1 ' + (locale === 'en' ? 'min' : 'хв');
  if (min < 60) return `${min} ` + (locale === 'en' ? 'min' : 'хв');
  const h = Math.floor(min / 60);
  return `${h} ` + (locale === 'en' ? 'h' : 'год');
}

export default function WaiterCabinetPage() {
  const { locale } = useLocale();
  const c = (v) => localizedCopy(v, locale);

  const [waiter, setWaiter] = useState(null);
  const [shift, setShift] = useState(null);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('orders');
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [scannedList, setScannedList] = useState([]);
  const [scanToast, setScanToast] = useState('');
  const eventSourceRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const lastScanRef = useRef({ code: '', time: 0 });

  const loadInitial = useCallback(async () => {
    try {
      const w = await waiterApi.me();
      setWaiter(w);
      const s = await waiterApi.getShift();
      setShift(s);
      if (s) {
        const [t, o, cl] = await Promise.all([waiterApi.getTables(), waiterApi.getOrders(), waiterApi.getCalls()]);
        setTables(t);
        setOrders(o);
        setCalls(cl);
      }
    } catch {
      setWaiter(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const existing = document.querySelector('link[rel="manifest"][href*="waiter"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/waiter.webmanifest?v=1';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('waiter_token');
    if (token) loadInitial();
    else setLoading(false);
  }, [loadInitial]);

  useEffect(() => {
    if (Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [waiter]);

  function showNotification(title, body, tag) {
    if (!Notification || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, tag, icon: '/icons/waiter-192.png', badge: '/icons/waiter-192.png', vibrate: [200, 100, 200] });
    } catch {}
  }

  useEffect(() => {
    if (!waiter) return;
    const es = new EventSource(waiterApi.sseUrl);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'NEW_ORDER') {
          setOrders((p) => [data.order, ...p]);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          const tableLabel = data.order.tableCode || `#${data.order.tableId}`;
          showNotification(
            c({ ua: 'Нове замовлення', ru: 'Новый заказ', en: 'New order' }),
            `${c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} ${tableLabel} · #${data.order.id}`,
            `order-${data.order.id}`
          );
        }
        if (data.type === 'NEW_CALL') {
          setCalls((p) => [data.call, ...p]);
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
          const tableLabel = data.call.tableCode || `#${data.call.tableId}`;
          showNotification(
            c({ ua: '📞 Виклик', ru: '📞 Вызов', en: '📞 Call' }),
            `${c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} ${tableLabel}`,
            `call-${data.call.id}`
          );
        }
        if (data.type === 'ORDER_STATUS_CHANGED') setOrders((p) => p.map((o) => o.id === data.order.id ? data.order : o));
      } catch {}
    };
    es.onerror = () => es.close();
    return () => { es.close(); eventSourceRef.current = null; };
  }, [waiter]);

  useEffect(() => {
    if (!scanMode) return;
    let stopped = false;
    const scanner = new Html5Qrcode('qr-reader');
    html5QrCodeRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 5, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        if (stopped) return;
        const now = Date.now();
        if (lastScanRef.current.code === decodedText && now - lastScanRef.current.time < 2000) return;
        lastScanRef.current = { code: decodedText, time: now };
        await handleCodeScanBatch(decodedText);
      },
      () => {}
    ).catch(() => {
      if (stopped) return;
      stopped = true;
      setScanMode(false);
      setScanToast(c({ ua: 'Не вдалося відкрити камеру', ru: 'Не удалось открыть камеру', en: 'Camera error' }));
      setTimeout(() => setScanToast(''), 3000);
    });
    return () => { stopped = true; scanner.stop().catch(() => {}); html5QrCodeRef.current = null; };
  }, [scanMode]);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    try {
      const result = await waiterApi.login(pin);
      localStorage.setItem('waiter_token', result.token);
      setWaiter(result.waiter);
      const s = await waiterApi.getShift();
      setShift(s);
      if (s) {
        const [t, o, cl] = await Promise.all([waiterApi.getTables(), waiterApi.getOrders(), waiterApi.getCalls()]);
        setTables(t);
        setOrders(o);
        setCalls(cl);
      }
    } catch (err) {
      setAuthError(err.message || 'Error');
    }
  }

  async function handleLogout() {
    try { await waiterApi.logout(); } catch {}
    localStorage.removeItem('waiter_token');
    setWaiter(null);
    setShift(null);
    setTables([]);
    setOrders([]);
    setCalls([]);
  }

  async function toggleShift() {
    if (shift) {
      try { await waiterApi.endShift(); } catch {}
      setShift(null);
      setTables([]);
    } else {
      const s = await waiterApi.startShift();
      setShift(s);
    }
  }

  function extractCode(text) {
    let clean = text.trim();
    try {
      if (clean.includes('table=')) {
        const url = new URL(clean);
        const extracted = url.searchParams.get('table');
        if (extracted) clean = extracted.trim();
      }
    } catch {}
    return clean.toUpperCase();
  }

  async function handleCodeScanBatch(code) {
    if (!shift || !code) return;
    const cleanCode = extractCode(code);
    let status = 'added';
    let message = '';
    try {
      const result = await waiterApi.scanTableByCode(cleanCode);
      if (result.already) {
        status = 'already';
        message = c({ ua: `Стіл ${cleanCode} вже додано`, ru: `Стол ${cleanCode} уже добавлен`, en: `Table ${cleanCode} already assigned` });
      } else {
        message = c({ ua: `Стіл ${cleanCode} додано`, ru: `Стол ${cleanCode} добавлен`, en: `Table ${cleanCode} assigned` });
      }
      const t = await waiterApi.getTables();
      setTables(t);
    } catch (err) {
      status = 'error';
      message = err.message || c({ ua: 'Стіл не знайдено', ru: 'Стол не найден', en: 'Table not found' });
    }
    setScannedList((prev) => [...prev, { code: cleanCode, status }]);
    setScanToast(message);
    setTimeout(() => setScanToast(''), 3000);
  }

  async function handleManualScan() {
    if (!scanInput.trim()) return;
    let code = scanInput.trim();
    try {
      if (code.includes('table=')) {
        const url = new URL(code);
        const extracted = url.searchParams.get('table');
        if (extracted) code = extracted.trim();
      }
    } catch {}
    await handleCodeScanBatch(code);
    setScanInput('');
  }

  async function removeTable(tableId) {
    if (!shift) return;
    await waiterApi.removeTable(tableId);
    const t = await waiterApi.getTables();
    setTables(t);
  }

  async function acceptOrder(id) {
    await waiterApi.acceptOrder(id);
    setOrders((p) => p.map((o) => o.id === id ? { ...o, status: 'ACCEPTED' } : o));
  }

  async function completeOrder(id) {
    await waiterApi.completeOrder(id);
    setOrders((p) => p.map((o) => o.id === id ? { ...o, status: 'COMPLETED' } : o));
  }

  async function respondToCall(id) {
    await waiterApi.respondToCall(id);
    setCalls((p) => p.filter((c) => c.id !== id));
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#ccc', background: '#0f172a', minHeight: '100vh' }}>Loading...</div>;

  if (!waiter) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <form onSubmit={handleLogin} style={{ background: '#1e293b', padding: 32, borderRadius: 16, width: 320, border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 8px', textAlign: 'center', color: '#f8fafc' }}>GorPliaj</h2>
          <p style={{ margin: '0 0 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>{c({ ua: 'Кабінет офіціанта', ru: 'Кабинет официанта', en: 'Waiter Cabinet' })}</p>
          <input type="password" inputMode="numeric" pattern="[0-9]*" placeholder={c({ ua: 'Введіть PIN-код', ru: 'Введите PIN-код', en: 'Enter PIN' })} value={pin} onChange={(e) => setPin(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', fontSize: '1.2rem', textAlign: 'center', letterSpacing: 8, boxSizing: 'border-box', border: '1px solid #475569', borderRadius: 10, background: '#0f172a', color: '#f8fafc', outline: 'none' }} autoFocus />
          {authError && <p style={{ color: '#f87171', fontSize: '0.85rem', marginTop: 8, textAlign: 'center' }}>{authError}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: '12px 0', fontSize: '1rem', borderRadius: 10 }} disabled={!pin.trim()}>OK</button>
        </form>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const activeOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const doneOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{waiter.name}</strong>
            {shift && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#4ade80', background: '#052e16', padding: '2px 8px', borderRadius: 10 }}>● {c({ ua: 'Смена', ru: 'Смена', en: 'Shift' })}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#334155', color: '#f8fafc', border: 'none' }} onClick={toggleShift}>
              {shift ? c({ ua: 'Завершити', ru: 'Завершить', en: 'End' }) : c({ ua: 'Почати', ru: 'Начать', en: 'Start' })}
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#334155', color: '#f8fafc', border: 'none' }} onClick={handleLogout}>✕</button>
          </div>
        </div>
        {shift && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {['orders', 'calls', 'tables'].map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{ padding: '7px 14px', borderRadius: 20, border: tab === t ? 'none' : '1px solid #475569', background: tab === t ? '#3b82f6' : '#1e293b', color: tab === t ? '#fff' : '#94a3b8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                {t === 'orders' && `${c({ ua: 'Замовлення', ru: 'Заказы', en: 'Orders' })} ${pendingOrders.length ? `(${pendingOrders.length})` : ''}`}
                {t === 'calls' && `${c({ ua: 'Виклики', ru: 'Вызовы', en: 'Calls' })} ${calls.length ? `(${calls.length})` : ''}`}
                {t === 'tables' && `${c({ ua: 'Столи', ru: 'Столы', en: 'Tables' })} (${tables.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {!shift && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
            <p style={{ fontSize: '1.3rem', marginBottom: 8, color: '#e2e8f0' }}>{c({ ua: 'Почніть зміну', ru: 'Начните смену', en: 'Start your shift' })}</p>
            <p style={{ fontSize: '0.95rem' }}>{c({ ua: 'Натисніть "Почати" щоб почати роботу', ru: 'Нажмите "Начать" чтобы начать работу', en: 'Press "Start" to begin working' })}</p>
          </div>
        )}

        {shift && tab === 'orders' && (
          <div>
            {pendingOrders.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px', color: '#fbbf24', fontSize: '1.1rem' }}>{c({ ua: '⏳ Нові замовлення', ru: '⏳ Новые заказы', en: '⏳ New orders' })}</h3>
                {pendingOrders.map((order) => (
                  <div key={order.id} style={{ background: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 12, borderLeft: '5px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>#{order.id}</strong>
                        <span style={{ color: '#f8fafc', marginLeft: 8 }}>{c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {order.table?.code || `#${order.tableId}`}</span>
                        <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748b' }}>{timeAgo(order.createdAt, locale)}</span>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 12, background: STATUS_LABELS[order.status]?.color + '22', color: STATUS_LABELS[order.status]?.color, fontSize: '0.8rem', fontWeight: 700 }}>
                        {STATUS_LABELS[order.status]?.[locale] || order.status}
                      </span>
                    </div>
                    {order.customerName && <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>👤 {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>}
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 8 }}>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ fontSize: '0.95rem', padding: '3px 0', color: '#e2e8f0' }}>· {item.quantity}x {item.name || `#${item.menuItemId}`}{item.notes ? ` (${item.notes})` : ''}</div>
                      ))}
                    </div>
                    {order.notes && <p style={{ margin: '8px 0 0', fontSize: '0.9rem', fontStyle: 'italic', color: '#94a3b8' }}>💬 {order.notes}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button className="btn btn-primary" style={{ flex: 1, padding: '12px 0', fontSize: '0.95rem' }} onClick={() => acceptOrder(order.id)}>
                        {c({ ua: '✅ Прийняти', ru: '✅ Принять', en: '✅ Accept' })}
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '12px 16px', fontSize: '0.9rem', background: '#334155', color: '#f8fafc' }} onClick={() => completeOrder(order.id)}>
                        {c({ ua: 'Готово', ru: 'Готово', en: 'Done' })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 12px', color: '#60a5fa', fontSize: '1.1rem' }}>{c({ ua: '🔵 В роботі', ru: '🔵 В работе', en: '🔵 In progress' })}</h3>
                {activeOrders.map((order) => (
                  <div key={order.id} style={{ background: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 12, borderLeft: '5px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>#{order.id}</strong>
                        <span style={{ color: '#f8fafc', marginLeft: 8 }}>{c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {order.table?.code || `#${order.tableId}`}</span>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 12, background: STATUS_LABELS[order.status]?.color + '22', color: STATUS_LABELS[order.status]?.color, fontSize: '0.8rem', fontWeight: 700 }}>
                        {STATUS_LABELS[order.status]?.[locale] || order.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 8 }}>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ fontSize: '0.95rem', padding: '3px 0', color: '#e2e8f0' }}>· {item.quantity}x {item.name || `#${item.menuItemId}`}</div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 14, width: '100%', padding: '12px 0', fontSize: '0.95rem' }} onClick={() => completeOrder(order.id)}>
                      {c({ ua: '✅ Завершити', ru: '✅ Завершить', en: '✅ Complete' })}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {doneOrders.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 12px', color: '#64748b', fontSize: '1.1rem' }}>{c({ ua: 'Завершені', ru: 'Завершённые', en: 'Completed' })}</h3>
                {doneOrders.slice(0, 10).map((order) => (
                  <div key={order.id} style={{ background: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 8, opacity: 0.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}><strong>#{order.id}</strong> · {c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {order.table?.code || `#${order.tableId}`}</span>
                      <span style={{ color: STATUS_LABELS[order.status]?.color, fontSize: '0.85rem' }}>{STATUS_LABELS[order.status]?.[locale]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {orders.length === 0 && <p style={{ textAlign: 'center', color: '#475569', padding: 60, fontSize: '1rem' }}>{c({ ua: 'Немає замовлень', ru: 'Нет заказов', en: 'No orders' })}</p>}
          </div>
        )}

        {shift && tab === 'calls' && (
          <div>
            {calls.length === 0 && <p style={{ textAlign: 'center', color: '#475569', padding: 60, fontSize: '1rem' }}>{c({ ua: 'Немає викликів', ru: 'Нет вызовов', en: 'No calls' })}</p>}
            {calls.map((call) => (
              <div key={call.id} style={{ background: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 12, borderLeft: '5px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ color: '#f87171', fontSize: '1.05rem' }}>{c({ ua: '📞 Виклик', ru: '📞 Вызов', en: '📞 Call' })}</strong>
                    <span style={{ color: '#f8fafc', marginLeft: 8 }}>{c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {call.table?.code || `#${call.tableId}`}</span>
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#64748b' }}>{timeAgo(call.createdAt, locale)}</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 14, width: '100%', padding: '14px 0', fontSize: '1rem' }} onClick={() => respondToCall(call.id)}>
                  {c({ ua: '✅ Іду', ru: '✅ Иду', en: '✅ Coming' })}
                </button>
              </div>
            ))}
          </div>
        )}

        {shift && tab === 'tables' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '14px 0', fontSize: '1rem' }} onClick={() => { setScannedList([]); setScanMode(true); }}>
                📷 {c({ ua: 'Сканувати', ru: 'Сканировать', en: 'Scan' })}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input type="text" placeholder={c({ ua: 'Код столу (напр. R-1)', ru: 'Код стола (напр. R-1)', en: 'Table code (e.g. R-1)' })} value={scanInput} onChange={(e) => setScanInput(e.target.value)}
                style={{ flex: 1, padding: '12px 14px', border: '1px solid #475569', borderRadius: 10, fontSize: '1rem', background: '#1e293b', color: '#f8fafc', outline: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleManualScan(); } }} />
              <button className="btn btn-secondary" style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '12px 16px' }} onClick={handleManualScan} disabled={!scanInput.trim()}>
                {c({ ua: 'Додати', ru: 'Добавить', en: 'Add' })}
              </button>
            </div>
            {tables.length === 0 && <p style={{ textAlign: 'center', color: '#475569', padding: 60, fontSize: '1rem' }}>{c({ ua: 'Немає закріплених столів', ru: 'Нет закреплённых столов', en: 'No assigned tables' })}</p>}
            {tables.map((t) => (
              <div key={t.id} style={{ background: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>{c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {t.code || `#${t.tableId}`}</strong>
                  <span style={{ marginLeft: 8, fontSize: '0.85rem', color: '#64748b' }}>{timeAgo(t.assignedAt, locale)}</span>
                </div>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }} onClick={() => removeTable(t.tableId)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {scanMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#1a1a2e', color: '#fff' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c({ ua: 'Скануйте QR-код столу', ru: 'Сканируйте QR-код стола', en: 'Scan table QR code' })}</span>
            <button onClick={() => setScanMode(false)} style={{ background: '#ef4444', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div id="qr-reader" style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 260, height: 260, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '4px solid #3b82f6', borderRight: '4px solid #3b82f6' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '4px solid #3b82f6', borderRight: '4px solid #3b82f6' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 250, height: 2, background: 'rgba(59,130,246,0.4)' }} />
            </div>
            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ color: '#fff', fontSize: '0.95rem', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20 }}>
                {c({ ua: 'Наведіть камеру на QR-код', ru: 'Направьте камеру на QR-код', en: 'Point camera at QR code' })}
              </span>
            </div>
          </div>
          {scannedList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px', justifyContent: 'center', background: '#1a1a2e' }}>
              {scannedList.map((item, i) => (
                <span key={i} style={{ padding: '5px 12px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700, background: item.status === 'added' ? '#16a34a' : item.status === 'already' ? '#f59e0b' : '#d32f2f', color: '#fff' }}>
                  {item.status === 'added' ? '✓' : item.status === 'already' ? '↺' : '✕'} {item.code}
                </span>
              ))}
            </div>
          )}
          {scanToast && (
            <div style={{ position: 'absolute', bottom: 140, left: 16, right: 16, padding: '12px 16px', borderRadius: 10, background: scanToast.includes('не знайдено') || scanToast.includes('не удалось') || scanToast.includes('Не вдалося') ? '#d32f2f' : '#16a34a', color: '#fff', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              {scanToast}
            </div>
          )}
          <div style={{ padding: '14px 16px', background: '#1a1a2e' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '16px 0', fontSize: '1.05rem', borderRadius: 12 }} onClick={() => setScanMode(false)}>
              ✅ {c({ ua: 'Готово', ru: 'Готово', en: 'Done' })} {scannedList.length > 0 ? `(${scannedList.length})` : ''}
            </button>
          </div>
        </div>
      )}
      <WaiterInstallPrompt />
    </div>
  );
}