import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import CalendarView from '../components/CalendarView';
import RichEditor from '../components/RichEditor';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const EMPTY_LOCALIZED = { ua: '', ru: '', en: '' };

const DEFAULT_FORM = {
  title: { ...EMPTY_LOCALIZED },
  slug: '',
  shortDescription: { ...EMPTY_LOCALIZED },
  fullDescription: { ...EMPTY_LOCALIZED },
  posterImage: '',
  startAt: '',
  endAt: '',
  status: 'PUBLISHED',
  isFeatured: false,
  ctaType: 'BOOKING',
  ticketUrl: ''
};

function normalizeLocalized(value) {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_LOCALIZED, ua: value || '' };
  }

  return {
    ua: value.ua || value.uk || value.ru || value.en || '',
    ru: value.ru || '',
    en: value.en || ''
  };
}

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
  const [viewMode, setViewMode] = useState('table');
  const [state, setState] = useState({ loading: true, error: '', events: [] });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [posterUploadState, setPosterUploadState] = useState({ status: 'idle', details: '' });
  const [translating, setTranslating] = useState({});
  const [feedback, setFeedback] = useState({ tone: '', message: '' });

  const stats = useMemo(() => {
    const total = state.events.length;
    const published = state.events.filter((event) => event.status === 'PUBLISHED').length;
    const featured = state.events.filter((event) => event.isFeatured).length;
    return { total, published, featured };
  }, [state.events]);

  const publicPreviewHref = useMemo(() => {
    if (!editId || !form.slug) return '';
    return `/events/${form.slug}`;
  }, [editId, form.slug]);

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
    setForm({
      ...DEFAULT_FORM,
      title: { ...EMPTY_LOCALIZED },
      shortDescription: { ...EMPTY_LOCALIZED },
      fullDescription: { ...EMPTY_LOCALIZED }
    });
    setEditId(null);
    setUploadingImage(false);
    setPosterUploadState({ status: 'idle', details: '' });
  }

  function startEdit(event) {
    setEditId(event.id);
    setForm({
      title: normalizeLocalized(event.title),
      slug: event.slug || '',
      shortDescription: normalizeLocalized(event.shortDescription),
      fullDescription: normalizeLocalized(event.fullDescription),
      posterImage: event.posterImage || '',
      startAt: toDateTimeLocal(event.startAt),
      endAt: toDateTimeLocal(event.endAt),
      status: event.status || 'DRAFT',
      isFeatured: Boolean(event.isFeatured),
      ctaType: event.ctaType || 'BOOKING',
      ticketUrl: event.ticketUrl || ''
    });
    setPosterUploadState({ status: 'idle', details: '' });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  function setLocalizedField(field, locale, value) {
    setForm((current) => ({
      ...current,
      [field]: {
        ...current[field],
        [locale]: value
      }
    }));
  }

  async function autoTranslateField(field) {
    const sourceText = form[field]?.ua;
    if (!sourceText?.trim()) {
      setFeedback({ tone: 'error', message: 'Спочатку заповніть поле UA для перекладу.' });
      return;
    }

    setTranslating((current) => ({ ...current, [field]: true }));
    const { response, body } = await apiRequest('/api/admin/translate', {
      method: 'POST',
      body: JSON.stringify({ text: sourceText, targetLangs: ['ru', 'en'] })
    });
    setTranslating((current) => ({ ...current, [field]: false }));

    if (!response.ok) {
      setFeedback({ tone: 'error', message: body.error || body.message || 'Translation failed.' });
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: {
        ...current[field],
        ru: body.ru || current[field].ru || '',
        en: body.en || current[field].en || ''
      }
    }));
    setFeedback({ tone: 'success', message: 'Переклад оновлено.' });
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
    setFeedback({ tone: 'success', message: editId ? 'Event updated.' : 'Event created.' });
  }

  async function removeEvent(eventRow) {
    if (!window.confirm(`Delete event "${localizeField(eventRow.title, language)}"?`)) return;

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
    setPosterUploadState({ status: 'uploading', details: file.name });
    const payload = new FormData();
    payload.append('folder', 'events');
    payload.append('image', file);
    const { response, body } = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: payload });
    setUploadingImage(false);

    if (!response.ok || !body.url) {
      setPosterUploadState({ status: 'error', details: body.message || t('eventsAdmin.errors.upload') });
      setFeedback({ tone: 'error', message: body.message || t('eventsAdmin.errors.upload') });
      return;
    }

    setForm((current) => ({ ...current, posterImage: body.url }));
    setPosterUploadState({ status: 'success', details: body.url });
    setFeedback({ tone: 'success', message: 'Постер завантажено.' });
  }

  const columns = [
    { key: 'title', label: t('eventsAdmin.columns.title'), render: (row) => <strong>{localizeField(row.title, language)}</strong> },
    { key: 'startAt', label: t('eventsAdmin.columns.start'), render: (row) => formatDateTime(row.startAt, language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US')) },
    { key: 'status', label: t('eventsAdmin.columns.status') },
    {
      key: 'actions',
      label: t('eventsAdmin.columns.actions'),
      render: (row) => (
        <div className="actions compact">
          <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>{t('eventsAdmin.form.fields.title')}</button>
          <button type="button" className="btn btn-small btn-danger" disabled={savingKey === `delete-${row.id}`} onClick={() => removeEvent(row)}>{t('eventsAdmin.form.delete')}</button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <PageContainer title={t('eventsAdmin.title')} description={t('eventsAdmin.description')}>
        <div className="metric-compact-grid">
          <div className="metric-compact-item">
            <strong>{stats.total}</strong>
            <span className="muted">{t('eventsAdmin.total')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.published}</strong>
            <span className="muted">{t('eventsAdmin.published')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.featured}</strong>
            <span className="muted">{t('eventsAdmin.featured')}</span>
          </div>
        </div>
        <div className="menu-admin-section-switch" role="tablist" style={{ marginTop: 14 }}>
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            {t('eventsAdmin.table')}
          </button>
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            {t('eventsAdmin.calendar')}
          </button>
        </div>

        {state.loading ? <p>{t('eventsAdmin.loading')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && viewMode === 'table' ? (
          <DataTable columns={columns} rows={state.events} emptyText={t('eventsAdmin.empty')} />
        ) : null}
        {!state.loading && viewMode === 'calendar' ? (
          <CalendarView
            items={state.events.map((event) => ({
              date: event.startAt,
              title: localizeField(event.title, language),
              color: event.status === 'PUBLISHED' ? 'success' : event.status === 'DRAFT' ? 'neutral' : 'danger',
              renderItem: () => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 8 }}>
                  <div>
                    <strong>{localizeField(event.title, language)}</strong>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {formatDateTime(event.startAt, language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US'))}
                    </div>
                  </div>
                  <span className={`status-pill ${event.status === 'PUBLISHED' ? 'success' : event.status === 'DRAFT' ? 'neutral' : 'danger'}`}>
                    {event.status}
                  </span>
                </div>
              )
            }))}
            onDateClick={(date) => {
              const match = state.events.find((e) => {
                const d = new Date(e.startAt);
                return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
              });
              if (match) {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }
            }}
          />
        ) : null}
      </PageContainer>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard title={editId ? t('eventsAdmin.form.edit') : t('eventsAdmin.form.create')} subtitle="">
          <form onSubmit={submitForm} className="event-admin-form">
            <div className="grid-two-col">
              <label>{t('eventsAdmin.form.fields.title')} (UA) <input value={form.title.ua} onChange={(e) => setLocalizedField('title', 'ua', e.target.value)} required /></label>
              <label>{t('eventsAdmin.form.fields.title')} (RU) <input value={form.title.ru} onChange={(e) => setLocalizedField('title', 'ru', e.target.value)} placeholder={t('eventsAdmin.form.placeholders.autoTranslated')} /></label>
              <label>{t('eventsAdmin.form.fields.title')} (EN) <input value={form.title.en} onChange={(e) => setLocalizedField('title', 'en', e.target.value)} placeholder={t('eventsAdmin.form.placeholders.autoTranslated')} /></label>
              <label>{t('eventsAdmin.form.fields.slug')} <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslateField('title')} disabled={!!translating.title}>
                {translating.title ? 'Перекладаємо...' : '✦✦ Перекласти title RU/EN з UA'}
              </button>
            </div>

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>{t('eventsAdmin.form.fields.start')} <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} required /></label>
              <label>{t('eventsAdmin.form.fields.end')} <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></label>
              <label>
                {t('eventsAdmin.form.fields.status')}
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="DRAFT">{t('eventsAdmin.statusOptions.DRAFT')}</option>
                  <option value="PUBLISHED">{t('eventsAdmin.statusOptions.PUBLISHED')}</option>
                  <option value="ARCHIVED">{t('eventsAdmin.statusOptions.ARCHIVED')}</option>
                </select>
              </label>
              <label>
                {t('eventsAdmin.form.fields.cta')}
                <select value={form.ctaType} onChange={(e) => setForm({ ...form, ctaType: e.target.value })}>
                  <option value="BOOKING">{t('eventsAdmin.ctaOptions.BOOKING')}</option>
                  <option value="TICKETS">{t('eventsAdmin.ctaOptions.TICKETS')}</option>
                  <option value="BOTH">{t('eventsAdmin.ctaOptions.BOTH')}</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>Short Description (UA) <textarea value={form.shortDescription.ua} onChange={(e) => setLocalizedField('shortDescription', 'ua', e.target.value)} rows="3" /></label>
              <label>Short Description (RU) <textarea value={form.shortDescription.ru} onChange={(e) => setLocalizedField('shortDescription', 'ru', e.target.value)} placeholder="Auto-translated" rows="3" /></label>
              <label>Short Description (EN) <textarea value={form.shortDescription.en} onChange={(e) => setLocalizedField('shortDescription', 'en', e.target.value)} placeholder="Auto-translated" rows="3" /></label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslateField('shortDescription')} disabled={!!translating.shortDescription}>
                {translating.shortDescription ? 'Перекладаємо...' : '✦✦ Перекласти short description RU/EN з UA'}
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>
                Full Description (UA)
                <RichEditor
                  value={form.fullDescription.ua}
                  onChange={(html) => setLocalizedField('fullDescription', 'ua', html)}
                  placeholder="Full description in Ukrainian..."
                />
              </label>
              <label>
                Full Description (RU)
                <RichEditor
                  value={form.fullDescription.ru}
                  onChange={(html) => setLocalizedField('fullDescription', 'ru', html)}
                  placeholder="Full description in Russian..."
                />
              </label>
              <label>
                Full Description (EN)
                <RichEditor
                  value={form.fullDescription.en}
                  onChange={(html) => setLocalizedField('fullDescription', 'en', html)}
                  placeholder="Full description in English..."
                />
              </label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslateField('fullDescription')} disabled={!!translating.fullDescription}>
                {translating.fullDescription ? 'Перекладаємо...' : '✦✦ Перекласти full description RU/EN з UA'}
              </button>
            </div>

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>Poster URL <input value={form.posterImage} onChange={(e) => setForm({ ...form, posterImage: e.target.value })} placeholder="https://..." /></label>
              <label>Upload poster <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handlePosterUpload(e.target.files?.[0])} disabled={uploadingImage} /></label>
            </div>

            {posterUploadState.status !== 'idle' ? (
              <div className={`upload-status-card ${posterUploadState.status === 'error' ? 'is-error' : posterUploadState.status === 'success' ? 'is-success' : 'is-uploading'}`}>
                <strong>Poster upload</strong>
                <p>{posterUploadState.details}</p>
              </div>
            ) : null}

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>
                Ticket URL
                <input value={form.ticketUrl} onChange={(e) => setForm({ ...form, ticketUrl: e.target.value })} placeholder="https://tickets.example.com" />
              </label>
              <label className="menu-admin-checkbox" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                <span>Featured event</span>
              </label>
            </div>

            <div className="actions" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn" disabled={!!savingKey}>
                {savingKey === 'event-form' ? 'Saving...' : (editId ? 'Save changes' : 'Create event')}
              </button>
              {editId ? <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button> : null}
              {publicPreviewHref ? (
                <a className="btn btn-secondary" href={publicPreviewHref} target="_blank" rel="noreferrer">
                  Open public page
                </a>
              ) : null}
            </div>

            {feedback.message ? <p className={feedback.tone === 'error' ? 'error' : 'success'}>{feedback.message}</p> : null}
          </form>
        </PanelCard>

        <PanelCard title="Preview" subtitle="Current form preview in the public style.">
          <div className="menu-admin-image-preview" style={{ width: '100%', maxWidth: 360 }}>
            <img src={form.posterImage || '/icons/lebedi.jpg'} alt={localizeField(form.title, language) || 'Poster preview'} />
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="menu-admin-badges">
              <span className="status-pill neutral">{form.status}</span>
              <span className="status-pill neutral">{form.ctaType}</span>
              {form.isFeatured ? <span className="status-pill success">FEATURED</span> : null}
            </div>
            <h3>{localizeField(form.title, language) || 'Event title preview'}</h3>
            {form.startAt ? (
              <p className="muted">
                {formatDateTime(fromDateTimeLocal(form.startAt), language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US'))}
                {form.endAt ? ` - ${formatDateTime(fromDateTimeLocal(form.endAt), language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US'))}` : ''}
              </p>
            ) : null}
            <p className="muted">{localizeField(form.shortDescription, language) || 'Short description preview'}</p>
            {localizeField(form.fullDescription, language) ? <p>{localizeField(form.fullDescription, language)}</p> : null}
            {form.ticketUrl ? <p><strong>Ticket URL:</strong> {form.ticketUrl}</p> : null}
            {publicPreviewHref ? (
              <a href={publicPreviewHref} target="_blank" rel="noreferrer" className="text-link">
                /events/{form.slug}
              </a>
            ) : (
              <p className="muted">Save the event to open its public page.</p>
            )}
          </div>
        </PanelCard>
      </div>
    </AdminLayout>
  );
}
