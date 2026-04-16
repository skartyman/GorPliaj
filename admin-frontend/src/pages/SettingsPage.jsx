import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

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
      workingHours: {},
      socialMedia: []
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
            workingHours: data.workingHours || {},
            socialMedia: Array.isArray(data.socialMedia) ? data.socialMedia : []
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

  const handleSocialChange = (index, key, value) => {
    const updated = [...state.form.socialMedia];
    updated[index][key] = value;
    setState((prev) => ({ ...prev, form: { ...prev.form, socialMedia: updated } }));
  };

  const addSocial = () => {
    setState((prev) => ({ ...prev, form: { ...prev.form, socialMedia: [...prev.form.socialMedia, { platform: '', url: '' }] } }));
  };

  const removeSocial = (index) => {
    setState((prev) => ({ ...prev, form: { ...prev.form, socialMedia: prev.form.socialMedia.filter((_, i) => i !== index) } }));
  };

  const handleWorkingHoursChange = (day, key, value) => {
    setState((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        workingHours: {
          ...prev.form.workingHours,
          [day]: { ...prev.form.workingHours[day], [key]: value }
        }
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, saving: true, error: '', success: '' }));

    apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(state.form)
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

          <PageCard title="Working Hours">
            {DAYS.map((day) => (
              <div key={day} className="form-row">
                <label className="day-label">{day.toUpperCase()}</label>
                <input type="text" placeholder="Open" value={state.form.workingHours[day]?.open || ''} onChange={(e) => handleWorkingHoursChange(day, 'open', e.target.value)} />
                <input type="text" placeholder="Close" value={state.form.workingHours[day]?.close || ''} onChange={(e) => handleWorkingHoursChange(day, 'close', e.target.value)} />
              </div>
            ))}
          </PageCard>

          <PageCard title="Social Media">
            {state.form.socialMedia.map((social, index) => (
              <div key={index} className="form-row">
                <input type="text" placeholder="Platform" value={social.platform} onChange={(e) => handleSocialChange(index, 'platform', e.target.value)} />
                <input type="text" placeholder="URL" value={social.url} onChange={(e) => handleSocialChange(index, 'url', e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={() => removeSocial(index)}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addSocial}>Add Link</button>
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
