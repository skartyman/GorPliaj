import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import { useAdminI18n } from '../lib/i18n';
import { apiRequest } from '../lib/api';

export default function SettingsPage() {
  const { t } = useAdminI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await apiRequest('/api/admin/settings/venue');
      setSettings(data.settings || {});
    } catch (err) {
      setError(t('settings.errors.load'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await apiRequest('/api/admin/settings/venue', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(t('settings.errors.save'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function updateSocialMedia(index, field, value) {
    const social = JSON.parse(settings['social.media'] || '[]');
    if (!social[index]) return;
    
    social[index][field] = value;
    updateSetting('social.media', JSON.stringify(social));
  }

  function addSocialMedia() {
    const social = JSON.parse(settings['social.media'] || '[]');
    social.push({ platform: '', url: '', icon: 'link' });
    updateSetting('social.media', JSON.stringify(social));
  }

  function removeSocialMedia(index) {
    const social = JSON.parse(settings['social.media'] || '[]');
    social.splice(index, 1);
    updateSetting('social.media', JSON.stringify(social));
  }

  if (loading) {
    return (
      <AdminLayout>
        <PageContainer title={t('nav.settings')} description="">
          <p>{t('common.loading')}</p>
        </PageContainer>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageContainer 
        title={t('nav.settings')} 
        description={t('settings.description')}
      >
        {error && (
          <div className="form-state is-error" role="alert">
            {error}
          </div>
        )}
        
        {success && (
          <div className="form-state is-success" role="status">
            {t('settings.saveSuccess')}
          </div>
        )}

        {/* General Information */}
        <PanelCard title={t('settings.sections.general')} className="surface-muted">
          <div className="form-grid">
            <label>
              <span>{t('settings.fields.name')}</span>
              <input
                type="text"
                value={settings['venue.name'] || ''}
                onChange={(e) => updateSetting('venue.name', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.tagline')}</span>
              <input
                type="text"
                value={settings['venue.tagline'] || ''}
                onChange={(e) => updateSetting('venue.tagline', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.description')}</span>
              <textarea
                rows="3"
                value={settings['venue.description'] || ''}
                onChange={(e) => updateSetting('venue.description', e.target.value)}
              />
            </label>
          </div>
        </PanelCard>

        {/* Contact Information */}
        <PanelCard title={t('settings.sections.contacts')} className="surface-muted">
          <div className="form-grid">
            <label>
              <span>{t('settings.fields.address')}</span>
              <input
                type="text"
                value={settings['venue.address'] || ''}
                onChange={(e) => updateSetting('venue.address', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.phone')}</span>
              <input
                type="tel"
                value={settings['venue.phone'] || ''}
                onChange={(e) => updateSetting('venue.phone', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.email')}</span>
              <input
                type="email"
                value={settings['venue.email'] || ''}
                onChange={(e) => updateSetting('venue.email', e.target.value)}
              />
            </label>
          </div>
        </PanelCard>

        {/* Working Hours */}
        <PanelCard title={t('settings.sections.workingHours')} className="surface-muted">
          <div className="form-grid form-grid-double">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <label key={day}>
                <span>{t(`settings.days.${day}`)}</span>
                <input
                  type="text"
                  placeholder="10:00 - 22:00"
                  value={settings[`venue.workingHours.${day}`] || ''}
                  onChange={(e) => updateSetting(`venue.workingHours.${day}`, e.target.value)}
                />
              </label>
            ))}
          </div>
        </PanelCard>

        {/* Hero Section */}
        <PanelCard title={t('settings.sections.hero')} className="surface-muted">
          <div className="form-grid">
            <label>
              <span>{t('settings.fields.heroEyebrow')}</span>
              <input
                type="text"
                value={settings['hero.eyebrow'] || ''}
                onChange={(e) => updateSetting('hero.eyebrow', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.heroTitle')}</span>
              <input
                type="text"
                value={settings['hero.title'] || ''}
                onChange={(e) => updateSetting('hero.title', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.heroSubtitle')}</span>
              <textarea
                rows="2"
                value={settings['hero.subtitle'] || ''}
                onChange={(e) => updateSetting('hero.subtitle', e.target.value)}
              />
            </label>
            <label>
              <span>{t('settings.fields.heroDescription')}</span>
              <textarea
                rows="3"
                value={settings['hero.description'] || ''}
                onChange={(e) => updateSetting('hero.description', e.target.value)}
              />
            </label>
          </div>
        </PanelCard>

        {/* Social Media */}
        <PanelCard title={t('settings.sections.social')} className="surface-muted">
          <div className="social-media-list">
            {JSON.parse(settings['social.media'] || '[]').map((item, index) => (
              <div key={index} className="social-media-item">
                <div className="social-media-row">
                  <select
                    value={item.icon || 'link'}
                    onChange={(e) => updateSocialMedia(index, 'icon', e.target.value)}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="telegram">Telegram</option>
                    <option value="youtube">YouTube</option>
                    <option value="link">Link</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={item.url || ''}
                    onChange={(e) => updateSocialMedia(index, 'url', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => removeSocialMedia(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addSocialMedia}>
              {t('settings.addSocial')}
            </button>
          </div>
        </PanelCard>

        {/* Save Button */}
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
