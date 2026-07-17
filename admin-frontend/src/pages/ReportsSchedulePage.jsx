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

function RecipientPicker({ globalRecipients, selected, onChange }) {
  const [customEmail, setCustomEmail] = useState('');

  function toggleRecipient(email, name) {
    const exists = selected.some(r => r.email === email);
    if (exists) {
      onChange(selected.filter(r => r.email !== email));
    } else {
      onChange([...selected, { email, name }]);
    }
  }

  function addCustom() {
    if (!customEmail.trim()) return;
    if (selected.some(r => r.email === customEmail.trim())) return;
    onChange([...selected, { email: customEmail.trim(), name: '' }]);
    setCustomEmail('');
  }

  const usedEmails = new Set(selected.map(r => r.email));

  return (
    <div className="recipient-picker">
      {globalRecipients.length > 0 ? (
        <div className="recipient-global-section">
          <div className="recipient-section-label">З глобального списку (Налаштування):</div>
          <div className="recipient-chips">
            {globalRecipients.map(r => (
              <button
                key={r.email}
                type="button"
                className={`recipient-chip ${usedEmails.has(r.email) ? 'active' : ''}`}
                onClick={() => toggleRecipient(r.email, r.name)}
              >
                <span className="chip-name">{r.name || r.email}</span>
                <span className="chip-email">{r.email}</span>
                {usedEmails.has(r.email) && <span className="chip-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="recipient-custom-section">
        <div className="recipient-section-label">Вибрані отримувачі{selected.length > 0 && <span className="recipient-count"> ({selected.length})</span>}:</div>
        {selected.length === 0 ? (
          <div className="recipient-empty">Не обрано жодного отримувача</div>
        ) : (
          <div className="recipient-selected-list">
            {selected.map((r, i) => (
              <div key={r.email} className="recipient-selected-item">
                <span className="recipient-item-email">{r.email}</span>
                {r.name && <span className="recipient-item-name"> · {r.name}</span>}
                <button type="button" className="btn btn-small btn-danger" onClick={() => onChange(selected.filter((_, idx) => idx !== i))}>&times;</button>
              </div>
            ))}
          </div>
        )}

        <div className="recipient-custom-input">
          <input
            type="email"
            value={customEmail}
            onChange={e => setCustomEmail(e.target.value)}
            placeholder="Додати інший email..."
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          />
          <button type="button" className="btn btn-secondary btn-small" onClick={addCustom}>Додати</button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [globalRecipients, setGlobalRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', reportType: 'SUMMARY', frequency: 'WEEKLY', recipients: [], dayOfWeek: 1, hour: 9
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [triggerState, setTriggerState] = useState({});

  async function load() {
    setLoading(true);
    const [schedRes, settingsRes] = await Promise.all([
      apiRequest('/api/admin/report-schedules'),
      apiRequest('/api/admin/settings')
    ]);
    if (schedRes.response.ok) setSchedules(schedRes.body.schedules || []);
    if (settingsRes.response.ok) setGlobalRecipients(settingsRes.body.reportRecipients || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');

    if (form.recipients.length === 0) {
      setError('Оберіть або додайте хоча б одного отримувача.');
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name,
      reportType: form.reportType,
      frequency: form.frequency,
      dayOfWeek: form.dayOfWeek,
      hour: form.hour,
      recipients: form.recipients
    };

    const { response, body } = await apiRequest('/api/admin/report-schedules/batch', {
      method: 'POST', body: JSON.stringify(payload)
    });
    setSaving(false);
    if (!response.ok) { setError(body.message || 'Помилка'); return; }
    setForm({ name: '', reportType: 'SUMMARY', frequency: 'WEEKLY', recipients: [], dayOfWeek: 1, hour: 9 });
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
      setTriggerState(prev => ({ ...prev, [id]: body.reason || body.message || 'Помилка' }));
    }
  }

  function groupSchedulesByEmail() {
    const groups = {};
    for (const s of schedules) {
      const email = s.recipientEmail;
      if (!groups[email]) groups[email] = { email, name: s.recipientName, schedules: [] };
      groups[email].schedules.push(s);
    }
    return Object.values(groups);
  }

  const grouped = groupSchedulesByEmail();

  return (
    <AdminLayout>
      <PageContainer eyebrow="Звіти" title="Розклад звітів" description="Налаштування автоматичної відправки звітів на email керівникам та власникам. Керовані отримувачі доступні у Налаштуваннях.">
        {globalRecipients.length === 0 ? (
          <div className="schedule-notice-warning">
            У розділі «Налаштування» ще не додано email-адрес отримувачів звітів. Додайте їх там, або введіть email-и окремо під час створення розкладу.
          </div>
        ) : null}

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

            <div className="form-field" style={{ marginTop: 8 }}>
              <span>Отримувачі (один розклад = всі обрані отримувачі)</span>
              <RecipientPicker
                globalRecipients={globalRecipients}
                selected={form.recipients}
                onChange={list => setForm(f => ({ ...f, recipients: list }))}
              />
            </div>

            {error ? <p className="state-msg state-error">{error}</p> : null}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Збереження...' : 'Створити розклад'}</button>
            </div>
          </form>
        )}

        {loading ? <div className="loading-state">Завантаження...</div> : (
          <div className="schedules-list">
            {grouped.length === 0 ? (
              <div className="empty-state">Немає налаштованих розкладів. Додайте перший розклад звітності.</div>
            ) : (
              grouped.map(group => (
                <div key={group.email} className="schedule-card-group">
                  <div className="schedule-group-header">
                    <div className="schedule-group-recipient">
                      <span className="schedule-group-email">{group.email}</span>
                      {group.name && <span className="schedule-group-name"> · {group.name}</span>}
                    </div>
                    <span className="schedule-group-count">{group.schedules.length} розклад{group.schedules.length === 1 ? '' : 'ів'}</span>
                  </div>
                  {group.schedules.map(s => (
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
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
