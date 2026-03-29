import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import { apiRequest, formatDateTime } from '../lib/api';

const DEFAULT_FORM = {
  title: '',
  slug: '',
  shortDescription: '',
  fullDescription: '',
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
      title: event.title || '',
      slug: event.slug || '',
      shortDescription: event.shortDescription || '',
      fullDescription: event.fullDescription || '',
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
    setFeedback({ tone: 'success', message: editId ? 'Event updated.' : 'Event created.' });
  }

  async function removeEvent(eventRow) {
    if (!window.confirm(`Delete event “${eventRow.title}”?`)) return;

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

    if (!file.type || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPosterUploadState({ status: 'error', details: 'Only JPG, PNG, and WEBP files are supported.' });
      setFeedback({ tone: 'error', message: 'Unsupported image format.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPosterUploadState({ status: 'error', details: 'File exceeds the 5MB limit.' });
      setFeedback({ tone: 'error', message: 'File is too large (max 5MB).' });
      return;
    }

    setUploadingImage(true);
    setFeedback({ tone: '', message: '' });
    setPosterUploadState({ status: 'uploading', details: `Uploading ${file.name} (${Math.round(file.size / 1024)} KB)…` });

    const payload = new FormData();
    payload.append('image', file);
    payload.append('folder', 'events');

    const { response, body } = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: payload
    });

    setUploadingImage(false);

    if (!response.ok) {
      setPosterUploadState({
        status: 'error',
        details: `Upload failed (${response.status || 'network'}): ${body.message || 'unknown error'}`
      });
      setFeedback({ tone: 'error', message: body.message || 'Failed to upload image.' });
      return;
    }

    if (!body.url) {
      setPosterUploadState({ status: 'error', details: 'Server response did not include uploaded URL.' });
      setFeedback({ tone: 'error', message: 'Upload finished, but no image URL was returned.' });
      return;
    }

    setForm((current) => ({ ...current, posterImage: body.url }));
    setPosterUploadState({ status: 'success', details: `Uploaded successfully: ${body.url}` });
    setFeedback({ tone: 'success', message: 'Poster image uploaded.' });
  }

  const columns = [
    { key: 'title', label: 'Event', render: (row) => <strong>{row.title}</strong> },
    { key: 'startAt', label: 'Start', render: (row) => formatDateTime(row.startAt, 'uk-UA') },
    { key: 'status', label: 'Status' },
    { key: 'ctaType', label: 'CTA' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="actions compact">
          <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            disabled={savingKey === `delete-${row.id}`}
            onClick={() => removeEvent(row)}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <section className="grid-summary">
        <article className="metric-compact-card">
          <div className="metric-compact-grid">
            <div className="metric-compact-item"><strong>{stats.total}</strong><span className="muted">All events</span></div>
            <div className="metric-compact-item"><strong>{stats.published}</strong><span className="muted">Published</span></div>
            <div className="metric-compact-item"><strong>{stats.featured}</strong><span className="muted">Featured</span></div>
            <div className="metric-compact-item"><strong>{state.events.filter((item) => item.status === 'DRAFT').length}</strong><span className="muted">Drafts</span></div>
          </div>
        </article>
      </section>

      <PageContainer title="Events" description="Manage posters, publication status, and CTA buttons.">
        {state.loading ? <p>Loading events…</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error ? <DataTable columns={columns} rows={state.events} emptyText="No events yet." /> : null}
      </PageContainer>

      <PanelCard title={editId ? 'Edit event' : 'Create event'} subtitle="Set publishing state, schedule, and booking/ticket CTAs.">
        <form onSubmit={submitForm} className="event-admin-form">
          <div className="grid-two-col">
            <label>Title <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required /></label>
            <label>Slug <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="auto-from-title" /></label>
            <label>Start at <input type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} required /></label>
            <label>End at <input type="datetime-local" value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} /></label>
            <label>Status
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
            <label>CTA type
              <select value={form.ctaType} onChange={(event) => setForm((current) => ({ ...current, ctaType: event.target.value }))}>
                <option value="BOOKING">BOOKING</option>
                <option value="TICKETS">TICKETS</option>
                <option value="BOTH">BOTH</option>
              </select>
            </label>
            <label>Poster image URL <input value={form.posterImage} onChange={(event) => setForm((current) => ({ ...current, posterImage: event.target.value }))} placeholder="https://cdn.../events/..." /></label>
            <label>Upload poster image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImage}
                onChange={(event) => {
                  const [file] = event.target.files || [];
                  handlePosterUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
            <div className={`upload-status-card is-${posterUploadState.status}`}>
              <strong>R2 upload status</strong>
              <p>
                {posterUploadState.status === 'idle'
                  ? 'Select an image to upload poster into cloud storage.'
                  : posterUploadState.details}
              </p>
            </div>
            <label>Ticket URL <input value={form.ticketUrl} onChange={(event) => setForm((current) => ({ ...current, ticketUrl: event.target.value }))} /></label>
          </div>
          {form.posterImage ? (
            <div className="event-poster-preview-block">
              <p className="small muted">Poster preview</p>
              <img src={form.posterImage} alt="Event poster preview" className="event-poster-preview" />
            </div>
          ) : null}
          <label>Short description <textarea rows="3" value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} /></label>
          <label>Full description <textarea rows="6" value={form.fullDescription} onChange={(event) => setForm((current) => ({ ...current, fullDescription: event.target.value }))} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} /> Feature this event on homepage</label>
          <div className="actions">
            <button type="submit" className="btn" disabled={savingKey === 'event-form'}>{savingKey === 'event-form' ? 'Saving…' : editId ? 'Save changes' : 'Create event'}</button>
            {editId ? <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel edit</button> : null}
          </div>
          {uploadingImage ? <p className="muted">Uploading image…</p> : null}
          {feedback.message ? <p className={feedback.tone === 'error' ? 'error' : 'muted'}>{feedback.message}</p> : null}
        </form>
      </PanelCard>
    </AdminLayout>
  );
}
