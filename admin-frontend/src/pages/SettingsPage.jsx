import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'telegram', 'whatsapp'];

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
      socialMedia: [],
      heroTitle: { ru: '', en: '' },
      heroSubtitle: { ru: '', en: '' },
      footerText: { ru: '', en: '' }
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
            socialMedia: Array.isArray(data.socialMedia) ? data.socialMedia : [],
            heroTitle: data.heroTitle || { ru: '', en: '' },
            heroSubtitle: data.heroSubtitle || { ru: '', en: '' },
            footerText: data.footerText || { ru: '', en: '' }
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

  const handleJsonChange = (field, lang, value) => {
    setState((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        [field]: { ...prev.form[field], [lang]: value }
      }
    }));
  };

  const handleSocialChange = (index, key, value) => {
    const updated = [...state.form.socialMedia];
    updated[index] = { ...updated[index], [key]: value };
    setState((prev) => ({ ...prev, form: { ...prev.form, socialMedia: updated } }));
  };

  const addSocial = () => {
    setState((prev) => ({ ...prev, form: { ...prev.form, socialMedia: [...prev.form.socialMedia, { platform: 'instagram', url: '' }] } }));
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

      <form onSubmit={handleSubmit} className="settings-form" style={{ marginTop: 24 }}>
        <div className="stack-grid">
          {/* General & SEO */}
          <div className="grid-two-col">
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
          </div>

          {/* Hero Section */}
          <PageCard title={t('settings.sections.hero')}>
            <div className="grid-two-col">
              <div className="form-group">
                <label>{t('settings.fields.heroTitleRu')}</label>
                <input type="text" value={state.form.heroTitle?.ru || ''} onChange={(e) => handleJsonChange('heroTitle', 'ru', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('settings.fields.heroTitleEn')}</label>
                <input type="text" value={state.form.heroTitle?.en || ''} onChange={(e) => handleJsonChange('heroTitle', 'en', e.target.value)} />
              </div>
            </div>
            <div className="grid-two-col">
              <div className="form-group">
                <label>{t('settings.fields.heroSubtitleRu')}</label>
                <textarea value={state.form.heroSubtitle?.ru || ''} onChange={(e) => handleJsonChange('heroSubtitle', 'ru', e.target.value)} rows="2" />
              </div>
              <div className="form-group">
                <label>{t('settings.fields.heroSubtitleEn')}</label>
                <textarea value={state.form.heroSubtitle?.en || ''} onChange={(e) => handleJsonChange('heroSubtitle', 'en', e.target.value)} rows="2" />
              </div>
            </div>
          </PageCard>

          {/* Contacts & Working Hours */}
          <div className="grid-two-col">
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

            <PageCard title={t('settings.sections.workingHours')}>
              {DAYS.map((day) => (
                <div key={day} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>{day}</span>
                  <input 
                    type="text" 
                    placeholder="Open" 
                    style={{ marginTop: 0 }}
                    value={state.form.workingHours[day]?.open || ''} 
                    onChange={(e) => handleWorkingHoursChange(day, 'open', e.target.value)} 
                  />
                  <input 
                    type="text" 
                    placeholder="Close" 
                    style={{ marginTop: 0 }}
                    value={state.form.workingHours[day]?.close || ''} 
                    onChange={(e) => handleWorkingHoursChange(day, 'close', e.target.value)} 
                  />
                </div>
              ))}
            </PageCard>
          </div>

          {/* Social Media & Footer */}
          <div className="grid-two-col">
            <PageCard title={t('settings.sections.socialMedia')}>
              <div className="stack-grid" style={{ gap: 12 }}>
                {state.form.socialMedia.map((social, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 8, alignItems: 'center' }}>
                    <select 
                      value={social.platform} 
                      style={{ marginTop: 0 }}
                      onChange={(e) => handleSocialChange(index, 'platform', e.target.value)}
                    >
                      {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input 
                      type="text" 
                      placeholder="URL" 
                      style={{ marginTop: 0 }}
                      value={social.url} 
                      onChange={(e) => handleSocialChange(index, 'url', e.target.value)} 
                    />
                    <button type="button" className="btn btn-danger btn-small" onClick={() => removeSocial(index)}>
                      &times;
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-small" onClick={addSocial}>
                  + Add Link
                </button>
              </div>
            </PageCard>

            <PageCard title={t('settings.sections.footer')}>
              <div className="form-group">
                <label>{t('settings.fields.footerTextRu')}</label>
                <textarea value={state.form.footerText?.ru || ''} onChange={(e) => handleJsonChange('footerText', 'ru', e.target.value)} rows="3" />
              </div>
              <div className="form-group">
                <label>{t('settings.fields.footerTextEn')}</label>
                <textarea value={state.form.footerText?.en || ''} onChange={(e) => handleJsonChange('footerText', 'en', e.target.value)} rows="3" />
              </div>
            </PageCard>
          </div>
        </div>

        <div className="form-actions" style={{ position: 'sticky', bottom: 0, background: 'rgba(241, 245, 249, 0.9)', backdropFilter: 'blur(8px)', padding: '16px 0', borderTop: '1px solid #cbd5e1', marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center', zIndex: 10 }}>
          {state.error && <p className="error" style={{ margin: 0 }}>{state.error}</p>}
          {state.success && <p className="success" style={{ margin: 0, color: '#166534' }}>{state.success}</p>}
          <button type="submit" className="btn btn-primary" disabled={state.saving} style={{ minWidth: 160 }}>
            {state.saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
