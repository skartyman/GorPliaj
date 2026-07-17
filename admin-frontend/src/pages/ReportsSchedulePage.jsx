import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import { apiRequest } from '../lib/api';

const REPORT_TYPES = [
  { value: 'SUMMARY', label: 'Зведений звіт' },
  { value: 'FINANCIAL', label: 'Фінансовий звіт' },
  { value: 'RESERVATIONS', label: 'Бронювання' },
  { value: 'TICKETS', label: 'Продаж квитків' },
  { value: 'MENU', label: 'Меню' },
  { value: 'EVENTS', label: 'Події' },
  { value: 'STAFF', label: 'Персонал' }
];

const FREQUENCIES = [
  { value: 'DAILY', label: 'Щодня' },
  { value: 'WEEKLY', label: 'Щотижня' },
  { value: 'MONTHLY', label: 'Щомісяця' }
];

const DAYS = [
  { value: 0, label: 'Неділя' }, { value: 1, label: 'Понеділок' },
  { value: 2, label: 'Вівторок' }, { value: 3, label: 'Середа' },
  { value: 4, label: 'Четвер' }, { value: 5, label: 'П\'ятниця' },
  { value: 6, label: 'Субота' }
];

export default function ReportsSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', reportType: 'SUMMARY', frequency: 'WEEKLY', recipientEmail: '', dayOfWeek: 1, hour: 9
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [triggerState, setTriggerState] = useState({});

  async function load() {
    setLoading(true);
    const { response, body } = await apiRequest('/api/admin/report-schedules');
    if (response.ok) setSchedules(body.schedules || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    const { response, body } = await apiRequest('/api/admin/report-schedules', {
      method: 'POST', body: JSON.stringify(form)
    });
    setSaving(false);
    if (!response.ok) { setError(body.message || 'Помилка'); return; }
    setForm({ name: '', reportType: 'SUMMARY', frequency: 'WEEKLY', recipientEmail: '', dayOfWeek: 1, hour: 9 });
    setShowForm(false);
    load();
  }

  async function onDelete(id) {
    if (!confirm('Видалити розклад?')) return;
    await apiRequest(`/api/admin/report-schedules/${id}`, { method: 'DELETE' });
    load();
  }

  async function onToggleActive(schedule) {
    await apiRequest(`/api/admin/report-schedules/${schedule.id}`, {
      method: 'PATCH', body: JSON.stringify({ isActive: !schedule.isActive })
    });
    load();
  }

  async function onTrigger(id) {
    setTriggerState(prev => ({ ...prev, [id]: 'sending' }));
    const { response, body } = await apiRequest(`/api/admin/report-schedules/${id}/trigger`, { method: 'POST' });
    if (response.ok && body.sent) {
      setTriggerState(prev => ({ ...prev, [id]: 'sent' }));
      setTimeout(() => setTriggerState(prev => ({ ...prev, [id]: null })), 3000);
    } else {
      setTriggerState(prev => ({ ...prev, [id]: body.reason || 'Помилка' }));
    }
  }

  return (
    <AdminLayout>
      <PageContainer eyebrow="Звіти" title="Розклад звітів" description="Налаштування автоматичної відправки звітів на email керівникам та власникам.">
        <div className="schedule-toolbar">
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Скасувати' : '+ Додати розклад'}
          </button>
        </div>

        {showForm && (
          <form className="schedule-form" onSubmit={onCreate}>
            <div className="form-row">
              <label className="form-field">
                <span>Назва</span>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Щотижневий для власників" required />
              </label>
              <label className="form-field">
                <span>Тип звіту</span>
                <select value={form.reportType} onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}>
                  {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>Частота</span>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Email отримувача</span>
                <input type="email" value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} placeholder="manager@gopliaj.ua" required />
              </label>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>День тижня</span>
                <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}>
                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="form-field">
                <span>Година (0-23)</span>
                <input type="number" min="0" max="23" value={form.hour} onChange={e => setForm(f => ({ ...f, hour: Number(e.target.value) }))} />
              </label>
            </div>
            {error ? <p className="state-msg state-error">{error}</p> : null}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Збереження...' : 'Зберегти'}</button>
            </div>
          </form>
        )}

        {loading ? <div className="loading-state">Завантаження...</div> : (
          <div className="schedules-list">
            {schedules.length === 0 ? (
              <div className="empty-state">Немає налаштованих розкладів. Додайте перший розклад звітності.</div>
            ) : (
              schedules.map(s => (
                <div key={s.id} className={`schedule-card ${s.isActive ? 'active' : 'inactive'}`}>
                  <div className="schedule-card-main">
                    <div className="schedule-info">
                      <div className="schedule-name">{s.name}</div>
                      <div className="schedule-meta">
                        <span className="schedule-type">{REPORT_TYPES.find(t => t.value === s.reportType)?.label || s.reportType}</span>
                        <span>·</span>
                        <span>{FREQUENCIES.find(f => f.value === s.frequency)?.label || s.frequency}</span>
                        {s.frequency === 'WEEKLY' && s.dayOfWeek != null ? (
                          <><span>·</span><span>{DAYS.find(d => d.value === s.dayOfWeek)?.label}</span></>
                        ) : null}
                        <span>·</span>
                        <span>о {s.hour}:00</span>
                      </div>
                      <div className="schedule-email">{s.recipientEmail}</div>
                      {s.lastSentAt ? <div className="schedule-last">Останній: {new Date(s.lastSentAt).toLocaleString('uk')}</div> : null}
                    </div>
                    <div className="schedule-actions">
                      <button type="button" className="btn btn-small" onClick={() => onTrigger(s.id)} disabled={triggerState[s.id] === 'sending'}>
                        {triggerState[s.id] === 'sending' ? 'Відправ...' : 'Відправити зараз'}
                      </button>
                      <button type="button" className={`btn btn-small ${s.isActive ? 'btn-warning' : 'btn-success'}`} onClick={() => onToggleActive(s)}>
                        {s.isActive ? 'Вимкнути' : 'Увімкнути'}
                      </button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => onDelete(s.id)}>Видалити</button>
                    </div>
                  </div>
                  {triggerState[s.id] && triggerState[s.id] !== 'sending' ? (
                    <div className={`schedule-trigger-msg ${triggerState[s.id] === 'sent' ? 'success' : 'error'}`}>
                      {triggerState[s.id] === 'sent' ? 'Звіт успішно відправлено' : triggerState[s.id]}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
