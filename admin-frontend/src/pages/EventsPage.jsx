import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import CalendarView from '../components/CalendarView';
import RichEditor from '../components/RichEditor';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^а-яa-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const EMPTY_LOCALIZED = { ua: '', ru: '', en: '' };

const DEFAULT_FORM = {
  title: { ...EMPTY_LOCALIZED },
  slug: '',
  shortDescription: { ...EMPTY_LOCALIZED },
  fullDescription: { ...EMPTY_LOCALIZED },
  posterImage: '',
  startAt: '',
  endAt: '',
  status: 'DRAFT',
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
    featured: 'Показувати на головній сторінці',
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
    translateAll: 'Перекласти всі поля',
    translating: 'Перекладаємо...',
    deleteConfirm: 'Видалити подію "{title}"?',
    deleteBlocked: 'Не можна видалити подію, бо до неї вже привʼязані продажі квитків або видані квитки. Перенесіть її в архів або спочатку приберіть повʼязані квиткові дані.',
    discardConfirm: 'Є незбережені зміни. Скасувати?'
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
    featured: 'Показывать на главной странице',
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
    translateAll: 'Перевести все поля',
    translating: 'Переводим...',
    deleteConfirm: 'Удалить событие "{title}"?',
    deleteBlocked: 'Нельзя удалить событие, потому что к нему уже привязаны продажи билетов или выданные билеты. Переведите его в архив или сначала удалите связанные билетные данные.',
    discardConfirm: 'Есть несохранённые изменения. Отменить?'
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
    featured: 'Show on homepage',
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
    translateAll: 'Translate all fields',
    translating: 'Translating...',
    deleteConfirm: 'Delete event "{title}"?',
    deleteBlocked: 'This event cannot be deleted because it already has ticket sales or issued tickets. Archive it instead or remove the related ticket data first.',
    discardConfirm: 'You have unsaved changes. Discard?'
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
  const [isSlugLocked, setIsSlugLocked] = useState(true);
  const [activeLocale, setActiveLocale] = useState('ua');
  const [showPosterUrl, setShowPosterUrl] = useState(false);
  const [posterUploadState, setPosterUploadState] = useState({ status: 'idle', details: '' });
  const [translating, setTranslating] = useState({});
  const [feedback, setFeedback] = useState({ tone: '', message: '' });
  const isFormDirty = useRef(false);
  const slugAutoGenerated = useRef(false);

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
    if (isFormDirty.current && !window.confirm(ui.discardConfirm)) return;
    setForm({
      ...DEFAULT_FORM,
      title: { ...EMPTY_LOCALIZED },
      shortDescription: { ...EMPTY_LOCALIZED },
      fullDescription: { ...EMPTY_LOCALIZED }
    });
    setEditId(null);
    setActiveLocale('ua');
    setShowPosterUrl(false);
    setIsSlugLocked(true);
    slugAutoGenerated.current = false;
    isFormDirty.current = false;
    setPosterUploadState({ status: 'idle', details: '' });
  }

  function startEdit(event) {
    if (isFormDirty.current && !window.confirm(ui.discardConfirm)) return;
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
    setIsSlugLocked(true);
    slugAutoGenerated.current = true;
    isFormDirty.current = false;
    setActiveLocale('ua');
    setPosterUploadState({ status: 'idle', details: '' });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  useEffect(() => {
    if (!editId && !slugAutoGenerated.current && form.title?.ua?.trim() && isSlugLocked) {
      const generated = slugify(form.title.ua);
      if (generated) {
        setForm((current) => ({ ...current, slug: generated }));
        slugAutoGenerated.current = true;
      }
    }
  }, [form.title?.ua, editId, isSlugLocked]);

  function markDirty() { isFormDirty.current = true; }

  function setLocalizedField(field, locale, value) {
    markDirty();
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

  async function autoTranslateAll() {
    const fields = ['title', 'shortDescription', 'fullDescription'];
    for (const field of fields) {
      const sourceText = form[field]?.ua;
      if (!sourceText?.trim()) continue;
      setTranslating((current) => ({ ...current, [field]: true }));
      const { response, body } = await apiRequest('/api/admin/translate', {
        method: 'POST',
        body: JSON.stringify({ text: sourceText, targetLangs: ['ru', 'en'] })
      });
      setTranslating((current) => ({ ...current, [field]: false }));
      if (response.ok) {
        setForm((current) => ({
          ...current,
          [field]: {
            ...current[field],
            ru: body.ru || current[field].ru || '',
            en: body.en || current[field].en || ''
          }
        }));
      }
    }
    setFeedback({ tone: 'success', message: ui.translationUpdated });
  }

  async function handlePosterUpload(file) {
    if (!file) return;
    setPosterUploadState({ status: 'uploading', details: file.name });
    const payload = new FormData();
    payload.append('folder', 'events');
    payload.append('image', file);
    const { response, body } = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: payload });
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
              <label>
                {t('eventsAdmin.form.fields.title')} ({getLocaleCode('ua')}) <span className="required">*</span>
                <input value={form.title.ua} onChange={(event) => setLocalizedField('title', 'ua', event.target.value)} required />
              </label>
              <label>{t('eventsAdmin.form.fields.title')} ({getLocaleCode('ru')}) <input value={form.title.ru} onChange={(event) => setLocalizedField('title', 'ru', event.target.value)} placeholder={ui.autoTranslated} /></label>
              <label>{t('eventsAdmin.form.fields.title')} ({getLocaleCode('en')}) <input value={form.title.en} onChange={(event) => setLocalizedField('title', 'en', event.target.value)} placeholder={ui.autoTranslated} /></label>
              <label>
                {t('eventsAdmin.form.fields.slug')}
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={form.slug} onChange={(e) => { setForm({ ...form, slug: e.target.value }); markDirty(); }} disabled={isSlugLocked} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => setIsSlugLocked(!isSlugLocked)} title={isSlugLocked ? 'Разблокувати' : 'Заблокувати'}>
                    {isSlugLocked ? '🔒' : '🔓'}
                  </button>
                </div>
              </label>
            </div>

            <div className="grid-two-col" style={{ marginTop: '1rem' }}>
              <label>{t('eventsAdmin.form.fields.start')} <span className="required">*</span> <input type="datetime-local" value={form.startAt} onChange={(event) => { setForm({ ...form, startAt: event.target.value }); markDirty(); }} required /></label>
              <label>{t('eventsAdmin.form.fields.end')} <input type="datetime-local" value={form.endAt} onChange={(event) => { setForm({ ...form, endAt: event.target.value }); markDirty(); }} /></label>
              <label>
                {t('eventsAdmin.form.fields.status')}
                <select value={form.status} onChange={(event) => { setForm({ ...form, status: event.target.value }); markDirty(); }}>
                  <option value="DRAFT">{t('eventsAdmin.statusOptions.DRAFT')}</option>
                  <option value="PUBLISHED">{t('eventsAdmin.statusOptions.PUBLISHED')}</option>
                  <option value="ARCHIVED">{t('eventsAdmin.statusOptions.ARCHIVED')}</option>
                </select>
              </label>
              <label>
                {t('eventsAdmin.form.fields.cta')}
                <select value={form.ctaType} onChange={(event) => { setForm({ ...form, ctaType: event.target.value }); markDirty(); }}>
                  <option value="BOOKING">{t('eventsAdmin.ctaOptions.BOOKING')}</option>
                  <option value="TICKETS">{t('eventsAdmin.ctaOptions.TICKETS')}</option>
                  <option value="BOTH">{t('eventsAdmin.ctaOptions.BOTH')}</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <strong>{ui.shortDescription}</strong>
              <div className="locale-tabs" style={{ margin: '6px 0' }}>
                {['ua', 'ru', 'en'].map((loc) => (
                  <button type="button" key={loc} className={`locale-tab ${activeLocale === loc ? 'active' : ''}`} onClick={() => setActiveLocale(loc)}>{loc.toUpperCase()}</button>
                ))}
              </div>
              {['ua', 'ru', 'en'].map((loc) => (
                <label key={loc} style={{ display: activeLocale === loc ? 'block' : 'none' }}>
                  {loc === 'ua' ? <span className="required">*</span> : null}
                  <textarea value={form.shortDescription[loc]} onChange={(e) => setLocalizedField('shortDescription', loc, e.target.value)} rows="3" placeholder={loc === 'ua' ? '' : ui.autoTranslated} />
                </label>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <strong>{ui.fullDescription}</strong>
              <div className="locale-tabs" style={{ margin: '6px 0' }}>
                {['ua', 'ru', 'en'].map((loc) => (
                  <button type="button" key={loc} className={`locale-tab ${activeLocale === loc ? 'active' : ''}`} onClick={() => setActiveLocale(loc)}>{loc.toUpperCase()}</button>
                ))}
              </div>
              {['ua', 'ru', 'en'].map((loc) => (
                <div key={loc} style={{ display: activeLocale === loc ? 'block' : 'none' }}>
                  <RichEditor
                    value={form.fullDescription[loc]}
                    onChange={(html) => setLocalizedField('fullDescription', loc, html)}
                    placeholder={loc === 'ua' ? ui.fullDescriptionUa : ui.autoTranslated}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <strong>{ui.posterUrl}</strong>
              <div style={{ marginTop: 8 }}>
                {form.posterImage ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={form.posterImage} alt="" style={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                    <button type="button" className="btn btn-small btn-danger" style={{ position: 'absolute', top: 4, right: 4, padding: '2px 8px', fontSize: 11 }} onClick={() => { setForm({ ...form, posterImage: '' }); markDirty(); }}>✕</button>
                  </div>
                ) : (
                  <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
                    {posterUploadState.status === 'uploading' ? 'Uploading…' : ui.uploadPoster}
                    <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} disabled={posterUploadState.status === 'uploading'} onChange={(e) => { handlePosterUpload(e.target.files[0]); e.target.value = ''; }} />
                  </label>
                )}
                <div style={{ marginTop: 4 }}>
                  <button type="button" className="btn-link btn-small" onClick={() => setShowPosterUrl(!showPosterUrl)}>
                    {showPosterUrl ? ui.posterUrl : 'або вставте URL'}
                  </button>
                  {showPosterUrl ? (
                    <input value={form.posterImage} onChange={(e) => { setForm({ ...form, posterImage: e.target.value }); markDirty(); }} placeholder="https://..." style={{ marginTop: 4 }} />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid-two-col" style={{ marginTop: '1.5rem' }}>
              <label>
                {ui.ticketUrl}
                <input value={form.ticketUrl} onChange={(event) => { setForm({ ...form, ticketUrl: event.target.value }); markDirty(); }} placeholder="https://tickets.example.com" />
              </label>
              <label className="menu-admin-checkbox" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => { setForm({ ...form, isFeatured: event.target.checked }); markDirty(); }} />
                <span>{ui.featured}</span>
              </label>
            </div>

            <div className="actions compact" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary btn-small" onClick={autoTranslateAll} disabled={!!Object.values(translating).some(Boolean)}>
                {Object.values(translating).some(Boolean) ? ui.translating : ui.translateAll}
              </button>
            </div>

            <div className="actions" style={{ marginTop: '0.5rem' }}>
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
