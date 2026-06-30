import { useState, useEffect } from 'react';
import { useAdminI18n } from '../lib/i18n';

const API_BASE = '/api/admin';

async function apiRequest(path, init) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(init?.headers || {}) },
    ...init
  });
  if (!res.ok) { const p = await res.json().catch(() => ({})); throw new Error(p.message || `Error ${res.status}`); }
  return res.json();
}

export default function WaitersPage() {
  const { t, language } = useAdminI18n();
  const c = (v) => v[language] || v.ua;

  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', pinCode: '', telegramChatId: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [qrTableId, setQrTableId] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    loadWaiters();
  }, []);

  async function loadWaiters() {
    try {
      const data = await apiRequest('/waiters');
      setWaiters(data);
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await apiRequest(`/waiters/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiRequest('/waiters', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm({ name: '', pinCode: '', telegramChatId: '' });
      setEditingId(null);
      loadWaiters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm(c({ ua: 'Видалити офіціанта?', ru: 'Удалить официанта?', en: 'Delete waiter?' }))) return;
    try {
      await apiRequest(`/waiters/${id}`, { method: 'DELETE' });
      loadWaiters();
    } catch {}
  }

  function startEdit(w) {
    setEditingId(w.id);
    setForm({ name: w.name, pinCode: w.pinCode, telegramChatId: w.telegramChatId || '' });
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>{c({ ua: 'Офіціанти', ru: 'Официанты', en: 'Waiters' })}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h2 style={{ marginBottom: 12 }}>{editingId ? c({ ua: 'Редагувати', ru: 'Редактировать', en: 'Edit' }) : c({ ua: 'Додати офіціанта', ru: 'Добавить официанта', en: 'Add waiter' })}</h2>
          <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>{c({ ua: "Ім'я", ru: 'Имя', en: 'Name' })}</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>PIN</label>
              <input type="text" inputMode="numeric" value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} required pattern="[0-9]{4,6}" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Telegram Chat ID</label>
              <input type="text" value={form.telegramChatId} onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })} placeholder={c({ ua: 'Необовʼязково', ru: 'Необязательно', en: 'Optional' })} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
            </div>
            {error && <p style={{ color: '#d32f2f', fontSize: '0.85rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingId ? c({ ua: 'Зберегти', ru: 'Сохранить', en: 'Save' }) : c({ ua: 'Додати', ru: 'Добавить', en: 'Add' })}</button>
              {editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm({ name: '', pinCode: '', telegramChatId: '' }); }}>✕</button>}
            </div>
          </form>

          <h2 style={{ marginTop: 24, marginBottom: 12 }}>{c({ ua: 'QR код для столу', ru: 'QR код для стола', en: 'Table QR code' })}</h2>
          <div style={{ background: '#fff', padding: 20, borderRadius: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="number" placeholder={c({ ua: 'Номер столу', ru: 'Номер стола', en: 'Table number' })} value={qrTableId} onChange={(e) => setQrTableId(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
              <button className="btn btn-primary" onClick={() => {
                const url = `${window.location.origin}/menu?table=${qrTableId}`;
                setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
              }} disabled={!qrTableId}>
                {c({ ua: 'Згенерувати', ru: 'Сгенерировать', en: 'Generate' })}
              </button>
            </div>
            {qrUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, border: '1px solid #eee', borderRadius: 8 }} />
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 8 }}>{window.location.origin}/menu?table={qrTableId}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 style={{ marginBottom: 12 }}>{c({ ua: 'Список', ru: 'Список', en: 'List' })}</h2>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {waiters.map((w) => (
                <div key={w.id} style={{ background: '#fff', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: w.isActive ? 1 : 0.5 }}>
                  <div>
                    <strong>{w.name}</strong>
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#888' }}>PIN: {w.pinCode}</span>
                    {w.telegramChatId && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#3b82f6' }}>@{w.telegramChatId}</span>}
                    {!w.isActive && <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#d32f2f' }}>{c({ ua: 'Неактивний', ru: 'Неактивный', en: 'Inactive' })}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => startEdit(w)}>✎</button>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(w.id)}>✕</button>
                  </div>
                </div>
              ))}
              {waiters.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>{c({ ua: 'Немає офіціантів', ru: 'Нет официантов', en: 'No waiters' })}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
