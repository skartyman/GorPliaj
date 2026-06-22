import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import RichEditor from '../components/RichEditor';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const EMPTY_LOCALIZED = { ua: '', ru: '', en: '' };

const DEFAULT_FORM = {
  title: { ...EMPTY_LOCALIZED },
  body: { ...EMPTY_LOCALIZED },
  image: ''
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

export default function NewsPage() {
  const { t, language } = useAdminI18n();
  const [state, setState] = useState({ loading: true, error: '', news: [] });
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [translating, setTranslating] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState({ tone: '', message: '' });

  const stats = useMemo(() => ({
    total: state.news.length
  }), [state.news]);

  async function loadNews() {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const { response, body } = await apiRequest('/api/admin/news');
    if (!response.ok) {
      setState({ loading: false, error: body.message || t('newsAdmin.errors.load'), news: [] });
      return;
    }
    setState({ loading: false, error: '', news: Array.isArray(body) ? body : [] });
  }

  useEffect(() => {
    loadNews().catch(() => {
      setState({ loading: false, error: t('newsAdmin.errors.load'), news: [] });
    });
  }, []);

  function resetForm() {
    setForm({
      title: { ...EMPTY_LOCALIZED },
      body: { ...EMPTY_LOCALIZED },
      image: ''
    });
    setEditId(null);
  }

  function startEdit(news) {
    setEditId(news.id);
    setForm({
      title: normalizeLocalized(news.title),
      body: normalizeLocalized(news.body),
      image: news.image || ''
    });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }

  function setLocalizedField(field, locale, value) {
    setForm((current) => ({
      ...current,
      [field]: { ...current[field], [locale]: value }
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

  async function handleImageUpload(file) {
    if (!file) return;
    setUploadingImage(true);
    const payload = new FormData();
    payload.append('folder', 'news');
    payload.append('image', file);
    const { response, body } = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: payload });
    setUploadingImage(false);
    if (!response.ok || !body.url) {
      setFeedback({ tone: 'error', message: body.message || 'Failed to upload image' });
      return;
    }
    setForm((current) => ({ ...current, image: body.url }));
    setFeedback({ tone: 'success', message: 'Image uploaded' });
  }

  async function submitForm(event) {
    event.preventDefault();
    setSavingKey('news-form');
    setFeedback({ tone: '', message: '' });

    const payload = { ...form };
    const path = editId ? `/api/admin/news/${editId}` : '/api/admin/news';
    const method = editId ? 'PATCH' : 'POST';
    const { response, body } = await apiRequest(path, {
      method,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('newsAdmin.errors.save') });
      return;
    }

    await loadNews();
    resetForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: editId ? t('newsAdmin.form.updated') : t('newsAdmin.form.created') });
  }

  async function removeNews(newsRow) {
    if (!window.confirm(t('newsAdmin.form.deleteConfirm', { title: localizeField(newsRow.title, language) }))) return;

    setSavingKey(`delete-${newsRow.id}`);
    const { response, body } = await apiRequest(`/api/admin/news/${newsRow.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('newsAdmin.errors.delete') });
      return;
    }

    await loadNews();
    if (editId === newsRow.id) resetForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: t('newsAdmin.form.deleted') });
  }

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');

  const columns = [
    {
      key: 'title',
      label: t('newsAdmin.columns.title'),
      render: (row) => <strong>{localizeField(row.title, language)}</strong>
    },
    {
      key: 'createdAt',
      label: t('newsAdmin.columns.date'),
      render: (row) => formatDateTime(row.createdAt, dateLocale)
    },
    {
      key: 'actions',
      label: t('newsAdmin.columns.actions'),
      render: (row) => (
        <div className="actions compact">
            <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            disabled={savingKey === `delete-${row.id}`}
            onClick={() => removeNews(row)}
          >
            {t('newsAdmin.form.delete')}
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <PageContainer title={t('newsAdmin.title')} description={t('newsAdmin.description')}>
        <section className="page-hero compact">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('newsAdmin.eyebrow')}</span>
            <h3>{t('newsAdmin.heroTitle')}</h3>
            <p className="muted">{t('newsAdmin.heroDescription')}</p>
          </div>
          <div className="hero-stat-grid mini">
            <article className="hero-stat-card">
              <strong>{state.loading ? '—' : stats.total}</strong>
              <span className="muted">{t('newsAdmin.stats.total')}</span>
            </article>
          </div>
        </section>

        {state.loading ? <p>{t('newsAdmin.loading')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error ? (
          <DataTable columns={columns} rows={state.news} emptyText={t('newsAdmin.empty')} />
        ) : null}
      </PageContainer>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard
          title={editId ? t('newsAdmin.form.editTitle') : t('newsAdmin.form.createTitle')}
          subtitle={t('newsAdmin.heroDescription')}
        >
          <form onSubmit={submitForm} className="event-admin-form">
            <div className="grid-two-col">
              <label>
                {t('newsAdmin.form.titleLabel')} (UA)
                <input value={form.title.ua} onChange={(e) => setLocalizedField('title', 'ua', e.target.value)} required />
              </label>
              <label>
                {t('newsAdmin.form.titleLabel')} (RU)
                <input value={form.title.ru} onChange={(e) => setLocalizedField('title', 'ru', e.target.value)} placeholder="Auto-translated" />
              </label>
              <label>
                {t('newsAdmin.form.titleLabel')} (EN)
                <input value={form.title.en} onChange={(e) => setLocalizedField('title', 'en', e.target.value)} placeholder="Auto-translated" />
              </label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => autoTranslateField('title')}
                disabled={!!translating.title}
              >
                {translating.title ? t('newsAdmin.form.translating') : t('newsAdmin.form.translate')}
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>
                {t('newsAdmin.form.bodyLabel')} (UA)
                <RichEditor
                  value={form.body.ua}
                  onChange={(html) => setLocalizedField('body', 'ua', html)}
                  placeholder="News body in Ukrainian..."
                />
              </label>
              <label>
                {t('newsAdmin.form.bodyLabel')} (RU)
                <RichEditor
                  value={form.body.ru}
                  onChange={(html) => setLocalizedField('body', 'ru', html)}
                  placeholder="News body in Russian..."
                />
              </label>
              <label>
                {t('newsAdmin.form.bodyLabel')} (EN)
                <RichEditor
                  value={form.body.en}
                  onChange={(html) => setLocalizedField('body', 'en', html)}
                  placeholder="News body in English..."
                />
              </label>
            </div>

            <div className="actions compact" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => autoTranslateField('body')}
                disabled={!!translating.body}
              >
                {translating.body ? t('newsAdmin.form.translating') : t('newsAdmin.form.translate')}
              </button>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Image</label>
              {form.image ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={form.image} alt="" style={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                  <button type="button" className="btn btn-small btn-danger" style={{ position: 'absolute', top: 4, right: 4, padding: '2px 8px', fontSize: 11 }} onClick={() => setForm((c) => ({ ...c, image: '' }))}>✕</button>
                </div>
              ) : (
                <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage} onChange={(e) => { handleImageUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
              )}
            </div>

            <div className="actions" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn" disabled={!!savingKey}>
                {savingKey === 'news-form'
                  ? t('newsAdmin.form.saving')
                  : (editId ? t('newsAdmin.form.save') : t('newsAdmin.form.save'))}
              </button>
              {editId ? (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  {t('newsAdmin.form.cancel')}
                </button>
              ) : null}
            </div>

            {feedback.message ? (
              <p className={feedback.tone === 'error' ? 'error' : 'success-text'} style={{ marginTop: '0.5rem' }}>
                {feedback.message}
              </p>
            ) : null}
          </form>
        </PanelCard>

        <PanelCard title={t('newsAdmin.form.editTitle') || 'Preview'} subtitle={localizeField(form.title, language) || 'Title preview'}>
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <h3>{localizeField(form.title, language) || 'News title preview'}</h3>
            <p className="muted">{localizeField(form.body, language) || 'Body text preview...'}</p>
          </div>
        </PanelCard>
      </div>
    </AdminLayout>
  );
}
