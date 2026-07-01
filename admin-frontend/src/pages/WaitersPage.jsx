import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import { apiRequest, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

export default function WaitersPage() {
  const { t, language } = useAdminI18n();
  const c = (v) => v[language] || v.ua;

  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', pinCode: '', telegramChatId: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [qrTableCode, setQrTableCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    Promise.all([loadWaiters(), loadPositions()]);
  }, []);

  async function loadWaiters() {
    try {
      const { body } = await apiRequest('/api/admin/waiters');
      setWaiters(body);
    } catch {}
    setLoading(false);
  }

  async function loadPositions() {
    try {
      const { body } = await apiRequest('/api/admin/reservation-positions');
      setPositions(body.positions || []);
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await apiRequest(`/api/admin/waiters/${editingId}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiRequest('/api/admin/waiters', { method: 'POST', body: JSON.stringify(form) });
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
      await apiRequest(`/api/admin/waiters/${id}`, { method: 'DELETE' });
      loadWaiters();
    } catch {}
  }

  function startEdit(w) {
    setEditingId(w.id);
    setForm({ name: w.name, pinCode: w.pinCode, telegramChatId: w.telegramChatId || '' });
  }

  const tablePositions = positions.filter((p) => p.code && (p.bookingKind === 'TABLE' || p.bookingKind === 'BEACH'));
  const inputS = { fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-light, #ddd)' };

  return (
    <AdminLayout>
      <PageContainer title={c({ ua: 'Офіціанти', ru: 'Официанты', en: 'Waiters' })}>
        <div className="admin-two-col">

          {/* Left column: form + QR */}
          <div>
            <div className="admin-collapsible-content" style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                {editingId ? c({ ua: 'Редагувати', ru: 'Редактировать', en: 'Edit' }) : c({ ua: 'Додати офіціанта', ru: 'Добавить официанта', en: 'Add waiter' })}
              </h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 12 }}>
                  {c({ ua: "Ім'я", ru: 'Имя', en: 'Name' })}
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ ...inputS, width: '100%', marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12 }}>
                  PIN
                  <input type="text" inputMode="numeric" value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} required pattern="[0-9]{4,6}" style={{ ...inputS, width: '100%', marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12 }}>
                  Telegram Chat ID
                  <input type="text" value={form.telegramChatId} onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })} placeholder={c({ ua: 'Необовʼязково', ru: 'Необязательно', en: 'Optional' })} style={{ ...inputS, width: '100%', marginTop: 4 }} />
                </label>
                {error && <p style={{ color: '#d32f2f', fontSize: 12 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-small btn-primary" style={{ flex: 1 }}>
                    {editingId ? c({ ua: 'Зберегти', ru: 'Сохранить', en: 'Save' }) : c({ ua: 'Додати', ru: 'Добавить', en: 'Add' })}
                  </button>
                  {editingId && (
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => { setEditingId(null); setForm({ name: '', pinCode: '', telegramChatId: '' }); }}>
                      ✕
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="admin-collapsible-content" style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
              <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                {c({ ua: 'QR код для столу', ru: 'QR код для стола', en: 'Table QR code' })}
              </h3>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                {c({ ua: 'Стіл', ru: 'Стол', en: 'Table' })}
                <select
                  value={qrTableCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setQrTableCode(code);
                    setQrUrl(code ? `/api/admin/waiters/qr?code=${encodeURIComponent(code)}` : '');
                  }}
                  style={{ ...inputS, width: '100%', marginTop: 4 }}
                >
                  <option value="">{c({ ua: '— Оберіть стіл —', ru: '— Выберите стол —', en: '— Select table —' })}</option>
                  {tablePositions.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code}{localizeField(p.name, language) ? ` — ${localizeField(p.name, language)}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {qrUrl && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, border: '1px solid #eee', borderRadius: 8 }} />
                  <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{window.location.origin}/menu?table={qrTableCode}</p>
                  <a href={qrUrl} download={`qr-${qrTableCode}.png`} className="btn btn-small btn-secondary" style={{ marginTop: 8, textDecoration: 'none' }}>
                    {c({ ua: '⬇ Завантажити', ru: '⬇ Скачать', en: '⬇ Download' })}
                  </a>
                </div>
              )}
              <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
                <a
                  href="/api/admin/waiters/qr-pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-small btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  {c({ ua: '⬇ Завантажити PDF з QR (всі столи)', ru: '⬇ Скачать PDF с QR (все столы)', en: '⬇ Download PDF with QR (all tables)' })}
                </a>
              </div>
            </div>
          </div>

          {/* Right column: waiter list */}
          <div className="admin-collapsible-content" style={{ background: '#fff', borderRadius: 12, padding: 20 }}>
            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
              {c({ ua: 'Список офіціантів', ru: 'Список официантов', en: 'Waiter list' })}
            </h3>
            {loading ? (
              <p className="muted">{c({ ua: 'Завантаження...', ru: 'Загрузка...', en: 'Loading...' })}</p>
            ) : waiters.length === 0 ? (
              <p className="muted">{c({ ua: 'Немає офіціантів', ru: 'Нет официантов', en: 'No waiters' })}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {waiters.map((w) => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface-alt, #f9fafb)', opacity: w.isActive ? 1 : 0.5 }}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{w.name}</strong>
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>PIN: {w.pinCode}</span>
                      {w.telegramChatId && <span style={{ marginLeft: 8, fontSize: 11, color: '#3b82f6' }}>@{w.telegramChatId}</span>}
                      {!w.isActive && <span style={{ marginLeft: 8, fontSize: 11, color: '#d32f2f' }}>{c({ ua: 'Неактивний', ru: 'Неактивный', en: 'Inactive' })}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-small btn-secondary" onClick={() => startEdit(w)}>✎</button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(w.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
