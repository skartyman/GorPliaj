import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

export default function SettingsPage() {
  const { t } = useAdminI18n();
  const [state, setState] = useState({
    loading: true,
    saving: false,
    error: '',
    success: '',
    form: {
      title: '',
      description: '',
      keywords: '',
      logoUrl: '',
      faviconUrl: '',
      phone: '',
      email: '',
      address: '',
      workingHours: '',
      socialMedia: ''
    }
  });

  useEffect(() => {
    apiRequest('/api/admin/settings')
      .then((result) => {
        if (!result.response.ok) {
          setState((prev) => ({ ...prev, loading: false, error: t('settings.errors.load') }));
          return;
        }
        
        const data = result.body || {};
        setState((prev) => ({
          ...prev,
          loading: false,
          form: {
            title: data.title || '',
            description: data.description || '',
            keywords: data.keywords || '',
            logoUrl: data.logoUrl || '',
            faviconUrl: data.faviconUrl || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            workingHours: data.workingHours ? JSON.stringify(data.workingHours, null, 2) : '',
            socialMedia: data.socialMedia ? JSON.stringify(data.socialMedia, null, 2) : ''
          }
        }));
      })
      .catch(() => setState((prev) => ({ ...prev, loading: false, error: t('settings.errors.load') })));
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      form: { ...prev.form, [name]: value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, saving: true, error: '', success: '' }));

    let workingHours = null;
    let socialMedia = null;

    try {
      if (state.form.workingHours) workingHours = JSON.parse(state.form.workingHours);
      if (state.form.socialMedia) socialMedia = JSON.parse(state.form.socialMedia);
    } catch (err) {
      setState((prev) => ({ ...prev, saving: false, error: 'Invalid JSON format in working hours or social media' }));
      return;
    }

    const payload = {
      ...state.form,
      workingHours,
      socialMedia
    };

    apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
      .then((result) => {
        if (!result.response.ok) {
          setState((prev) => ({ ...prev, saving: false, error: t('settings.errors.save') }));
          return;
        }
        setState((prev) => ({ ...prev, saving: false, success: t('settings.saveSuccess') }));
      })
      .catch(() => setState((prev) => ({ ...prev, saving: false, error: t('settings.errors.save') })));
  };

  if (state.loading) {
    return (
      <AdminLayout>
        <div className="loading-state">{t('common.loading')}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <section className="page-hero">
        <div className="page-hero-copy">
          <span className="eyebrow">{t('settings.eyebrow')}</span>
          <h2>{t('settings.title')}</h2>
          <p className="muted">{t('settings.description')}</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="stack-grid">
          <PageCard title={t('settings.sections.general')}>
            <div className="form-group">
              <label>{t('settings.fields.title')}</label>
              <input type="text" name="title" value={state.form.title} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('settings.fields.logoUrl')}</label>
              <input type="text" name="logoUrl" value={state.form.logoUrl} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('settings.fields.faviconUrl')}</label>
              <input type="text" name="faviconUrl" value={state.form.faviconUrl} onChange={handleChange} />
            </div>
          </PageCard>

          <PageCard title={t('settings.sections.seo')}>
            <div className="form-group">
              <label>{t('settings.fields.description')}</label>
              <textarea name="description" value={state.form.description} onChange={handleChange} rows="3" />
            </div>
            <div className="form-group">
              <label>{t('settings.fields.keywords')}</label>
              <input type="text" name="keywords" value={state.form.keywords} onChange={handleChange} />
            </div>
          </PageCard>

          <PageCard title={t('settings.sections.contacts')}>
            <div className="form-group">
              <label>{t('settings.fields.phone')}</label>
              <input type="text" name="phone" value={state.form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('settings.fields.email')}</label>
              <input type="email" name="email" value={state.form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('settings.fields.address')}</label>
              <input type="text" name="address" value={state.form.address} onChange={handleChange} />
            </div>
          </PageCard>

          <PageCard title="JSON Configuration">
            <div className="form-group">
              <label>{t('settings.fields.workingHours')}</label>
              <textarea name="workingHours" value={state.form.workingHours} onChange={handleChange} rows="5" className="code-font" />
            </div>
            <div className="form-group">
              <label>{t('settings.fields.socialMedia')}</label>
              <textarea name="socialMedia" value={state.form.socialMedia} onChange={handleChange} rows="5" className="code-font" />
            </div>
          </PageCard>
        </div>

        <div className="form-actions sticky-footer">
          {state.error && <p className="error-message">{state.error}</p>}
          {state.success && <p className="success-message">{state.success}</p>}
          <button type="submit" className="btn btn-primary" disabled={state.saving}>
            {state.saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
