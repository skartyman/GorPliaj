import { useState, useEffect, useRef, useCallback } from 'react';
import { waiterApi } from '../lib/api';
import { localizedCopy } from '../lib/i18n';
import { useLocale } from '../state/locale';

const STATUS_LABELS = {
  PENDING: { ua: 'Очікує', ru: 'Ожидает', en: 'Pending', color: '#f59e0b' },
  ACCEPTED: { ua: 'Прийнято', ru: 'Принято', en: 'Accepted', color: '#3b82f6' },
  PREPARING: { ua: 'Готується', ru: 'Готовится', en: 'Preparing', color: '#8b5cf6' },
  COMPLETED: { ua: 'Виконано', ru: 'Выполнено', en: 'Completed', color: '#10b981' },
  CANCELLED: { ua: 'Скасовано', ru: 'Отменено', en: 'Cancelled', color: '#6b7280' }
};

function timeAgo(dateStr, locale) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}с`;
  if (diff < 3600) return `${Math.floor(diff / 60)}хв`;
  return `${Math.floor(diff / 3600)}год`;
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
  const eventSourceRef = useRef(null);

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
    const token = localStorage.getItem('waiter_token');
    if (token) loadInitial();
    else setLoading(false);
  }, [loadInitial]);

  useEffect(() => {
    if (!waiter) return;
    const es = new EventSource(waiterApi.sseUrl);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'NEW_ORDER') setOrders((p) => [data.order, ...p]);
        if (data.type === 'NEW_CALL') setCalls((p) => [data.call, ...p]);
      } catch {}
    };
    es.onerror = () => es.close();
    return () => { es.close(); eventSourceRef.current = null; };
  }, [waiter]);

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
      const s = await waiterApi.endShift();
      setShift(null);
      setTables([]);
      setOrders([]);
      setCalls([]);
    } else {
      const s = await waiterApi.startShift();
      setShift(s);
    }
  }

  async function handleScanTable() {
    const id = parseInt(scanInput, 10);
    if (!id || !shift) return;
    try {
      await waiterApi.scanTable(id);
      const t = await waiterApi.getTables();
      setTables(t);
      setScanInput('');
    } catch {}
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  if (!waiter) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <form onSubmit={handleLogin} style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: 320 }}>
          <h2 style={{ margin: '0 0 8px', textAlign: 'center' }}>GorPliaj</h2>
          <p style={{ margin: '0 0 20px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>{c({ ua: 'Кабінет офіціанта', ru: 'Кабинет официанта', en: 'Waiter Cabinet' })}</p>
          <input type="password" inputMode="numeric" pattern="[0-9]*" placeholder={c({ ua: 'Введіть PIN-код', ru: 'Введите PIN-код', en: 'Enter PIN' })} value={pin} onChange={(e) => setPin(e.target.value)} style={{ width: '100%', padding: '12px 16px', fontSize: '1.1rem', textAlign: 'center', letterSpacing: 8, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 8 }} autoFocus />
          {authError && <p style={{ color: '#d32f2f', fontSize: '0.85rem', marginTop: 8, textAlign: 'center' }}>{authError}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={!pin.trim()}>OK</button>
        </form>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const activeOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const doneOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>{waiter.name}</strong>
            {shift && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#10b981' }}>● {c({ ua: 'Смена', ru: 'Смена', en: 'Shift' })}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={toggleShift}>
              {shift ? c({ ua: 'Завершити зміну', ru: 'Завершить смену', en: 'End shift' }) : c({ ua: 'Почати зміну', ru: 'Начать смену', en: 'Start shift' })}
            </button>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleLogout}>✕</button>
          </div>
        </div>
        {shift && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {['orders', 'calls', 'tables'].map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: tab === t ? 'var(--primary, #1976d2)' : '#eee', color: tab === t ? '#fff' : '#333', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
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
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>{c({ ua: 'Почніть зміну', ru: 'Начните смену', en: 'Start your shift' })}</p>
            <p style={{ fontSize: '0.9rem' }}>{c({ ua: 'Натисніть "Почати зміну" щоб почати роботу', ru: 'Нажмите "Начать смену" чтобы начать работу', en: 'Press "Start shift" to begin working' })}</p>
          </div>
        )}

        {shift && tab === 'orders' && (
          <div>
            {pendingOrders.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#f59e0b' }}>{c({ ua: '⏳ Нові замовлення', ru: '⏳ Новые заказы', en: '⏳ New orders' })}</h3>
                {pendingOrders.map((order) => (
                  <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong>#{order.id}</strong> · {c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {order.tableId}
                        <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#888' }}>{timeAgo(order.createdAt, locale)}</span>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 12, background: STATUS_LABELS[order.status]?.color + '22', color: STATUS_LABELS[order.status]?.color, fontSize: '0.75rem', fontWeight: 600 }}>
                        {STATUS_LABELS[order.status]?.[locale] || order.status}
                      </span>
                    </div>
                    {order.customerName && <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#555' }}>👤 {order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>}
                    <div style={{ marginTop: 8 }}>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ fontSize: '0.85rem', padding: '2px 0' }}>· {item.quantity}x item #{item.menuItemId}{item.notes ? ` (${item.notes})` : ''}</div>
                      ))}
                    </div>
                    {order.notes && <p style={{ margin: '6px 0 0', fontSize: '0.85rem', fontStyle: 'italic', color: '#888' }}>💬 {order.notes}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary" style={{ flex: 1, padding: '8px 0' }} onClick={() => acceptOrder(order.id)}>
                        {c({ ua: '✅ Прийняти', ru: '✅ Принять', en: '✅ Accept' })}
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => completeOrder(order.id)}>
                        {c({ ua: 'Готово', ru: 'Готово', en: 'Done' })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#3b82f6' }}>{c({ ua: '🔵 В роботі', ru: '🔵 В работе', en: '🔵 In progress' })}</h3>
                {activeOrders.map((order) => (
                  <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div><strong>#{order.id}</strong> · {c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {order.tableId}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 12, background: STATUS_LABELS[order.status]?.color + '22', color: STATUS_LABELS[order.status]?.color, fontSize: '0.75rem', fontWeight: 600 }}>
                        {STATUS_LABELS[order.status]?.[locale] || order.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {order.items?.map((item) => (
                        <div key={item.id} style={{ fontSize: '0.85rem', padding: '2px 0' }}>· {item.quantity}x item #{item.menuItemId}</div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 12, width: '100%', padding: '8px 0' }} onClick={() => completeOrder(order.id)}>
                      {c({ ua: '✅ Завершити', ru: '✅ Завершить', en: '✅ Complete' })}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {doneOrders.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 12px', color: '#6b7280' }}>{c({ ua: 'Завершені', ru: 'Завершённые', en: 'Completed' })}</h3>
                {doneOrders.slice(0, 10).map((order) => (
                  <div key={order.id} style={{ background: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, opacity: 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>#{order.id}</strong> · {c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {order.tableId}</span>
                      <span style={{ color: STATUS_LABELS[order.status]?.color, fontSize: '0.8rem' }}>{STATUS_LABELS[order.status]?.[locale]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {orders.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>{c({ ua: 'Немає замовлень', ru: 'Нет заказов', en: 'No orders' })}</p>}
          </div>
        )}

        {shift && tab === 'calls' && (
          <div>
            {calls.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>{c({ ua: 'Немає викликів', ru: 'Нет вызовов', en: 'No calls' })}</p>}
            {calls.map((call) => (
              <div key={call.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{c({ ua: '📞 Виклик', ru: '📞 Вызов', en: '📞 Call' })}</strong> · {c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} {call.tableId}
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#888' }}>{timeAgo(call.createdAt, locale)}</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 12, width: '100%', padding: '8px 0' }} onClick={() => respondToCall(call.id)}>
                  {c({ ua: '✅ Іду', ru: '✅ Иду', en: '✅ Coming' })}
                </button>
              </div>
            ))}
          </div>
        )}

        {shift && tab === 'tables' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input type="text" inputMode="numeric" placeholder={c({ ua: 'Номер столу', ru: 'Номер стола', en: 'Table number' })} value={scanInput} onChange={(e) => setScanInput(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: '1rem' }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScanTable(); } }} />
              <button className="btn btn-primary" onClick={handleScanTable} disabled={!scanInput.trim()}>
                {c({ ua: 'Додати', ru: 'Добавить', en: 'Add' })}
              </button>
            </div>
            {tables.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 40 }}>{c({ ua: 'Немає закріплених столів', ru: 'Нет закреплённых столов', en: 'No assigned tables' })}</p>}
            {tables.map((t) => (
              <div key={t.id} style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })} #{t.tableId}</strong>
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#888' }}>{timeAgo(t.assignedAt, locale)}</span>
                </div>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => removeTable(t.tableId)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
