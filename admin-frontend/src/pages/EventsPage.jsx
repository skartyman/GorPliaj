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

const UI_COPY = {
  ua: {
    edit: 'Редагувати',
    ticketTariffs: 'Тарифи квитків',
    fillUaFirst: 'Спочатку заповніть поле UA для перекладу.',
    translationFailed: 'Не вдалося виконати переклад.',
    translationUpdated: 'Переклад оновлено.',
    posterUploaded: 'Постер завантажено.',
    posterUrl: 'URL постера',
    uploadPoster: 'Завантажити постер',
    ticketUrl: 'URL квитків',
    featured: 'Вибрана подія',
    preview: 'Попередній перегляд',
    previewTitle: 'Назва події',
    previewDescription: 'Короткий опис з’явиться тут.',
    previewHint: 'Збережіть подію, щоб відкрити її публічну сторінку.',
    openPublic: 'Відкрити публічну сторінку',
    saveChanges: 'Зберегти зміни',
    createEvent: 'Створити подію',
    shortDescription: 'Короткий опис',
    fullDescription: 'Повний опис',
    fullDescriptionUa: 'Повний опис українською...',
    fullDescriptionRu: 'Повний опис російською...',
    fullDescriptionEn: 'Full description in English...',
    autoTranslated: 'Автоматичний переклад',
    translate: 'Перекласти RU/EN з UA',
    translating: 'Перекладаємо...',
    deleteConfirm: 'Видалити подію "{title}"?',
    deleteBlocked: 'Не можна видалити подію, бо до неї вже привʼязані продажі квитків або видані квитки. Перенесіть її в архів або спочатку приберіть повʼязані квиткові дані.'
  },
  ru: {
    edit: 'Редактировать',
    ticketTariffs: 'Тарифы билетов',
    fillUaFirst: 'Сначала заполните поле UA для перевода.',
    translationFailed: 'Не удалось выполнить перевод.',
    translationUpdated: 'Перевод обновлён.',
    posterUploaded: 'Постер загружен.',
    posterUrl: 'URL постера',
    uploadPoster: 'Загрузить постер',
    ticketUrl: 'URL билетов',
    featured: 'Избранное событие',
    preview: 'Предпросмотр',
    previewTitle: 'Название события',
    previewDescription: 'Короткое описание появится здесь.',
    previewHint: 'Сохраните событие, чтобы открыть его публичную страницу.',
    openPublic: 'Открыть публичную страницу',
    saveChanges: 'Сохранить изменения',
    createEvent: 'Создать событие',
    shortDescription: 'Короткое описание',
    fullDescription: 'Полное описание',
    fullDescriptionUa: 'Полное описание на украинском...',
    fullDescriptionRu: 'Полное описание на русском...',
    fullDescriptionEn: 'Full description in English...',
    autoTranslated: 'Автоматический перевод',
    translate: 'Перевести RU/EN с UA',
    translating: 'Переводим...',
    deleteConfirm: 'Удалить событие "{title}"?',
    deleteBlocked: 'Нельзя удалить событие, потому что к нему уже привязаны продажи билетов или выданные билеты. Переведите его в архив или сначала удалите связанные билетные данные.'
  },
  en: {
    edit: 'Edit',
    ticketTariffs: 'Ticket tariffs',
    fillUaFirst: 'Fill in the UA field first before translation.',
    translationFailed: 'Translation failed.',
    translationUpdated: 'Translation updated.',
    posterUploaded: 'Poster uploaded.',
    posterUrl: 'Poster URL',
    uploadPoster: 'Upload poster',
    ticketUrl: 'Ticket URL',
    featured: 'Featured event',
    preview: 'Preview',
    previewTitle: 'Event title',
    previewDescription: 'Short description will appear here.',
    previewHint: 'Save the event to open its public page.',
    openPublic: 'Open public page',
    saveChanges: 'Save changes',
    createEvent: 'Create event',
    shortDescription: 'Short description',
    fullDescription: 'Full description',
    fullDescriptionUa: 'Full description in Ukrainian...',
    fullDescriptionRu: 'Full description in Russian...',
    fullDescriptionEn: 'Full description in English...',
    autoTranslated: 'Auto-translated',
    translate: 'Translate RU/EN from UA',
    translating: 'Translating...',
    deleteConfirm: 'Delete event "{title}"?',
    deleteBlocked: 'This event cannot be deleted because it already has ticket sales or issued tickets. Archive it instead or remove the related ticket data first.'
  }
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

function getLocaleCode(locale) {
  return locale.toUpperCase();
}

export default function EventsPage() {
  const { t, language } = useAdminI18n();
  const ui = UI_COPY[language] || UI_COPY.ua;
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

  const ticketSalesHref = useMemo(() => {
    if (!editId) return '/admin/ticket-sales';
    return `/admin/ticket-sales?eventId=${encodeURIComponent(editId)}`;
  }, [editId]);

  async function loadEvents() {
    setState((current) => ({ ...current, loading: true, error: '' }));

    const { response, body } = await apiRequest('/api/admin/events');
    if (!response.ok) {
      setState({ loading: false, error: body.message || t('eventsAdmin.errors.load'), events: [] });
      return;
    }

    setState({ loading: false, error: '', events: Array.isArray(body) ? body : [] });
  }

  useEffect(() => {
    loadEvents().catch(() => {
      setState({ loading: false, error: t('eventsAdmin.errors.load'), events: [] });
    });
  }, [language]);

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
      setFeedback({ tone: 'error', message: ui.fillUaFirst });
      return;
    }

    setTranslating((current) => ({ ...current, [field]: true }));
    const { response, body } = await apiRequest('/api/admin/translate', {
      method: 'POST',
      body: JSON.stringify({ text: sourceText, targetLangs: ['ru', 'en'] })
    });
    setTranslating((current) => ({ ...current, [field]: false }));

    if (!response.ok) {
      setFeedback({ tone: 'error', message: body.error || body.message || ui.translationFailed });
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
    setFeedback({ tone: 'success', message: ui.translationUpdated });
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
      setFeedback({ tone: 'error', message: body.message || t('eventsAdmin.errors.save') });
      return;
    }

    await loadEvents();
    const wasEditing = Boolean(editId);
    resetForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: wasEditing ? t('eventsAdmin.form.updated') : t('eventsAdmin.form.created') });
  }

  async function removeEvent(eventRow) {
    if (!window.confirm(ui.deleteConfirm.replace('{title}', localizeField(eventRow.title, language)))) return;

    setSavingKey(`delete-${eventRow.id}`);
    const { response, body } = await apiRequest(`/api/admin/events/${eventRow.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: response.status === 409 ? ui.deleteBlocked : (body.message || t('eventsAdmin.errors.delete')) });
      return;
    }

    await loadEvents();
    if (editId === eventRow.id) resetForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: t('eventsAdmin.form.deleted') });
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
    setFeedback({ tone: 'success', message: ui.posterUploaded });
  }

  const columns = [
    { key: 'title', label: t('eventsAdmin.columns.title'), render: (row) => <strong>{localizeField(row.title, language)}</strong> },
    { key: 'startAt', label: t('eventsAdmin.columns.start'), render: (row) => formatDateTime(row.startAt, language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US')) },
    { key: 'status', label: t('eventsAdmin.columns.status'), render: (row) => t(`eventsAdmin.statusOptions.${row.status}`) },
    {
      key: 'actions',
      label: t('eventsAdmin.columns.actions'),
      render: (row) => (
        <div className="actions compact">
          <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>{ui.edit}</button>
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
              id: event.id,
              event,
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
                    {t(`eventsAdmin.statusOptions.${event.status}`)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      startEdit(event);
                    }}
                  >
                    {ui.edit}
                  </button>
                </div>
              )
            }))}
            onItemClick={(item) => {
              if (item?.event) startEdit(item.event);
            }}
            onDateClick={(date) => {
              const match = state.events.find((event) => {
                const eventDate = new Date(event.startAt);
                return eventDate.getFullYear() === date.getFullYear()
                  && eventDate.getMonth() === date.getMonth()
                  && eventDate.getDate() === date.getDate();
              });
              if (match) {
                startEdit(match);
              }
            }}
          />
        ) : null}
      </PageContainer>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard title={editId ? t('eventsAdmin.form.edit') : t('eventsAdmin.form.create')} subtitle="">
          <form onSubmit={submitForm} className="event-admin-form">
            <div className="grid-two-col">
              <label>{t('eventsAdmin.form.fields.title')} ({getLocaleCode('ua')}) <input value={form.title.ua} onChange={(event) => setLocalizedField('title', 'ua', event.target.value)} required /></label>
              <label>{t('eventsAdmin.form.fields.title')} ({getLocaleCode('ru')}) <input value={form.title.ru} onChange={(event) => setLocalizedField('title', 'ru', event.target.value)} placeholder={ui.autoTranslated} /></label>
              <label>{t('eventsAdmin.form.fields.title')} ({getLocaleCode('en')}) <input value={form.title.en} onChange={(event) => setLocalizedField('title', 'en', event.target.value)} placeholder={ui.autoTranslated} /></label>
              <label>{t('eventsAdmin.form.fields.slug')} <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslateField('title')} disabled={!!translating.title}>
                {translating.title ? ui.translating : ui.translate}
              </button>
            </div>

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>{t('eventsAdmin.form.fields.start')} <input type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} required /></label>
              <label>{t('eventsAdmin.form.fields.end')} <input type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
              <label>
                {t('eventsAdmin.form.fields.status')}
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  <option value="DRAFT">{t('eventsAdmin.statusOptions.DRAFT')}</option>
                  <option value="PUBLISHED">{t('eventsAdmin.statusOptions.PUBLISHED')}</option>
                  <option value="ARCHIVED">{t('eventsAdmin.statusOptions.ARCHIVED')}</option>
                </select>
              </label>
              <label>
                {t('eventsAdmin.form.fields.cta')}
                <select value={form.ctaType} onChange={(event) => setForm({ ...form, ctaType: event.target.value })}>
                  <option value="BOOKING">{t('eventsAdmin.ctaOptions.BOOKING')}</option>
                  <option value="TICKETS">{t('eventsAdmin.ctaOptions.TICKETS')}</option>
                  <option value="BOTH">{t('eventsAdmin.ctaOptions.BOTH')}</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>{ui.shortDescription} ({getLocaleCode('ua')}) <textarea value={form.shortDescription.ua} onChange={(event) => setLocalizedField('shortDescription', 'ua', event.target.value)} rows="3" /></label>
              <label>{ui.shortDescription} ({getLocaleCode('ru')}) <textarea value={form.shortDescription.ru} onChange={(event) => setLocalizedField('shortDescription', 'ru', event.target.value)} placeholder={ui.autoTranslated} rows="3" /></label>
              <label>{ui.shortDescription} ({getLocaleCode('en')}) <textarea value={form.shortDescription.en} onChange={(event) => setLocalizedField('shortDescription', 'en', event.target.value)} placeholder={ui.autoTranslated} rows="3" /></label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslateField('shortDescription')} disabled={!!translating.shortDescription}>
                {translating.shortDescription ? ui.translating : ui.translate}
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>
                {ui.fullDescription} ({getLocaleCode('ua')})
                <RichEditor
                  value={form.fullDescription.ua}
                  onChange={(html) => setLocalizedField('fullDescription', 'ua', html)}
                  placeholder={ui.fullDescriptionUa}
                />
              </label>
              <label>
                {ui.fullDescription} ({getLocaleCode('ru')})
                <RichEditor
                  value={form.fullDescription.ru}
                  onChange={(html) => setLocalizedField('fullDescription', 'ru', html)}
                  placeholder={ui.fullDescriptionRu}
                />
              </label>
              <label>
                {ui.fullDescription} ({getLocaleCode('en')})
                <RichEditor
                  value={form.fullDescription.en}
                  onChange={(html) => setLocalizedField('fullDescription', 'en', html)}
                  placeholder={ui.fullDescriptionEn}
                />
              </label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslateField('fullDescription')} disabled={!!translating.fullDescription}>
                {translating.fullDescription ? ui.translating : ui.translate}
              </button>
            </div>

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>{ui.posterUrl} <input value={form.posterImage} onChange={(event) => setForm({ ...form, posterImage: event.target.value })} placeholder="https://..." /></label>
              <label>{ui.uploadPoster} <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handlePosterUpload(event.target.files?.[0])} disabled={uploadingImage} /></label>
            </div>

            {posterUploadState.status !== 'idle' ? (
              <div className={`upload-status-card ${posterUploadState.status === 'error' ? 'is-error' : posterUploadState.status === 'success' ? 'is-success' : 'is-uploading'}`}>
                <strong>{ui.uploadPoster}</strong>
                <p>{posterUploadState.details}</p>
              </div>
            ) : null}

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>
                {ui.ticketUrl}
                <input value={form.ticketUrl} onChange={(event) => setForm({ ...form, ticketUrl: event.target.value })} placeholder="https://tickets.example.com" />
              </label>
              <label className="menu-admin-checkbox" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} />
                <span>{ui.featured}</span>
              </label>
            </div>

            <div className="actions" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn" disabled={!!savingKey}>
                {savingKey === 'event-form' ? t('eventsAdmin.form.saving') : (editId ? ui.saveChanges : ui.createEvent)}
              </button>
              {editId ? <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('eventsAdmin.form.cancel')}</button> : null}
              {publicPreviewHref ? (
                <a className="btn btn-secondary" href={publicPreviewHref} target="_blank" rel="noreferrer">
                  {ui.openPublic}
                </a>
              ) : null}
              {['TICKETS', 'BOTH'].includes(form.ctaType) ? (
                <a className="btn btn-secondary" href={ticketSalesHref}>
                  {ui.ticketTariffs}
                </a>
              ) : null}
            </div>

            {feedback.message ? <p className={feedback.tone === 'error' ? 'error' : 'success'}>{feedback.message}</p> : null}
          </form>
        </PanelCard>

        <PanelCard title={ui.preview} subtitle="">
          <div className="menu-admin-image-preview" style={{ width: '100%', maxWidth: 360 }}>
            <img src={form.posterImage || '/icons/lebedi.jpg'} alt={localizeField(form.title, language) || ui.preview} />
          </div>

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div className="menu-admin-badges">
              <span className="status-pill neutral">{t(`eventsAdmin.statusOptions.${form.status}`)}</span>
              <span className="status-pill neutral">{t(`eventsAdmin.ctaOptions.${form.ctaType}`)}</span>
              {form.isFeatured ? <span className="status-pill success">{ui.featured}</span> : null}
            </div>
            <h3>{localizeField(form.title, language) || ui.previewTitle}</h3>
            {form.startAt ? (
              <p className="muted">
                {formatDateTime(fromDateTimeLocal(form.startAt), language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US'))}
                {form.endAt ? ` - ${formatDateTime(fromDateTimeLocal(form.endAt), language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US'))}` : ''}
              </p>
            ) : null}
            <p className="muted">{localizeField(form.shortDescription, language) || ui.previewDescription}</p>
            {localizeField(form.fullDescription, language) ? <p>{localizeField(form.fullDescription, language)}</p> : null}
            {form.ticketUrl ? <p><strong>{ui.ticketUrl}:</strong> {form.ticketUrl}</p> : null}
            {publicPreviewHref ? (
              <a href={publicPreviewHref} target="_blank" rel="noreferrer" className="text-link">
                /events/{form.slug}
              </a>
            ) : (
              <p className="muted">{ui.previewHint}</p>
            )}
          </div>
        </PanelCard>
      </div>
    </AdminLayout>
  );
}
