import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const DEFAULT_FORM = {
  title: { ua: '', ru: '', en: '' },
  slug: '',
  shortDescription: { ua: '', ru: '', en: '' },
  fullDescription: { ua: '', ru: '', en: '' },
  posterImage: '',
  startAt: '',
  endAt: '',
  status: 'PUBLISHED',
  isFeatured: false,
  ctaType: 'BOOKING',
  ticketUrl: ''
};

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function EventsPage() {
  const { language } = useAdminI18n();
  const [state, setState] = useState({ loading: true, error: '', events: [] });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posterUploadState, setPosterUploadState] = useState({ status: 'idle', details: '' });
  const [feedback, setFeedback] = useState({ tone: '', message: '' });

  const stats = useMemo(() => {
    const total = state.events.length;
    const published = state.events.filter((event) => event.status === 'PUBLISHED').length;
    const featured = state.events.filter((event) => event.isFeatured).length;
    return { total, published, featured };
  }, [state.events]);

  async function loadEvents() {
    setState((current) => ({ ...current, loading: true, error: '' }));

    const { response, body } = await apiRequest('/api/admin/events');
    if (!response.ok) {
      setState({ loading: false, error: body.message || 'Failed to load events.', events: [] });
      return;
    }

    setState({ loading: false, error: '', events: Array.isArray(body) ? body : [] });
  }

  useEffect(() => {
    loadEvents().catch(() => {
      setState({ loading: false, error: 'Failed to load events.', events: [] });
    });
  }, []);

  function resetForm() {
    setForm(DEFAULT_FORM);
    setEditId(null);
    setUploadingImage(false);
  }

  function startEdit(event) {
    setEditId(event.id);
    setForm({
      title: typeof event.title === 'object' ? { ...event.title } : { ua: event.title, ru: '', en: '' },
      slug: event.slug || '',
      shortDescription: typeof event.shortDescription === 'object' ? { ...event.shortDescription } : { ua: event.shortDescription, ru: '', en: '' },
      fullDescription: typeof event.fullDescription === 'object' ? { ...event.fullDescription } : { ua: event.fullDescription, ru: '', en: '' },
      posterImage: event.posterImage || '',
      startAt: toDateTimeLocal(event.startAt),
      endAt: toDateTimeLocal(event.endAt),
      status: event.status || 'DRAFT',
      isFeatured: Boolean(event.isFeatured),
      ctaType: event.ctaType || 'BOOKING',
      ticketUrl: event.ticketUrl || ''
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    setSavingKey('event-form');
    setFeedback({ tone: '', message: '' });

    const payload = {
      ...form,
      startAt: fromDateTimeLocal(form.startAt),
      endAt: form.endAt ? fromDateTimeLocal(form.endAt) : null
    };

    const path = editId ? `/api/admin/events/${editId}` : '/api/admin/events';
    const method = editId ? 'PATCH' : 'POST';
    const { response, body } = await apiRequest(path, {
      method,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || 'Failed to save event.' });
      return;
    }

    await loadEvents();
    resetForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: editId ? 'Event updated. Auto-translation applied.' : 'Event created. Auto-translation applied.' });
  }

  async function removeEvent(eventRow) {
    if (!window.confirm(`Delete event “${localizeField(eventRow.title, language)}”?`)) return;

    setSavingKey(`delete-${eventRow.id}`);
    const { response, body } = await apiRequest(`/api/admin/events/${eventRow.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || 'Failed to delete event.' });
      return;
    }

    await loadEvents();
    if (editId === eventRow.id) resetForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: 'Event deleted.' });
  }

  async function handlePosterUpload(file) {
    if (!file) return;
    setUploadingImage(true);
    const payload = new FormData();
    payload.append('image', file);
    const { response, body } = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: payload });
    setUploadingImage(false);
    if (response.ok && body.url) {
      setForm((current) => ({ ...current, posterImage: body.url }));
    }
  }

  const columns = [
    { key: 'title', label: 'Event', render: (row) => <strong>{localizeField(row.title, language)}</strong> },
    { key: 'startAt', label: 'Start', render: (row) => formatDateTime(row.startAt, language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US')) },
    { key: 'status', label: 'Status' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="actions compact">
          <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>Edit</button>
          <button type="button" className="btn btn-small btn-danger" disabled={savingKey === `delete-${row.id}`} onClick={() => removeEvent(row)}>Delete</button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <PageContainer title="Events" description="Manage posters and schedules. Automatic AI translation is active.">
        {state.loading ? <p>Loading events…</p> : null}
        {!state.loading && <DataTable columns={columns} rows={state.events} emptyText="No events yet." />}
      </PageContainer>

      <PanelCard title={editId ? 'Edit event' : 'Create event'}>
        <form onSubmit={submitForm} className="event-admin-form">
          <div className="grid-two-col">
            <label>Title (UA) <input value={form.title.ua} onChange={(e) => setForm({ ...form, title: { ...form.title, ua: e.target.value } })} required /></label>
            <label>Title (RU) <input value={form.title.ru} onChange={(e) => setForm({ ...form, title: { ...form.title, ru: e.target.value } })} placeholder="Auto-translated" /></label>
            <label>Title (EN) <input value={form.title.en} onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })} placeholder="Auto-translated" /></label>
            <label>Slug <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
          </div>

          <div className="grid-two-col">
            <label>Start <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required /></label>
            <label>End <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label>Short Description (UA) <textarea value={form.shortDescription.ua} onChange={(e) => setForm({ ...form, shortDescription: { ...form.shortDescription, ua: e.target.value } })} /></label>
            <label>Short Description (RU) <textarea value={form.shortDescription.ru} onChange={(e) => setForm({ ...form, shortDescription: { ...form.shortDescription, ru: e.target.value } })} placeholder="Auto-translated" /></label>
            <label>Short Description (EN) <textarea value={form.shortDescription.en} onChange={(e) => setForm({ ...form, shortDescription: { ...form.shortDescription, en: e.target.value } })} placeholder="Auto-translated" /></label>
          </div>

          <div className="actions" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn" disabled={!!savingKey}>
              {savingKey === 'event-form' ? 'Saving…' : (editId ? 'Save changes' : 'Create event')}
            </button>
            {editId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
          {feedback.message && <p className={feedback.tone === 'error' ? 'error' : 'success'}>{feedback.message}</p>}
        </form>
      </PanelCard>
    </AdminLayout>
  );
}
