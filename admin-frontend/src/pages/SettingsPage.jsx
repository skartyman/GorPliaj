import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'telegram', 'whatsapp'];

export default function SettingsPage() {
  const { t } = useAdminI18n();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [savingStatus, setSavingStatus] = useState({});

  useEffect(() => {
    apiRequest('/api/admin/settings').then(res => {
      setForm(res.body || {});
      setLoading(false);
    });
  }, []);

  const updateField = (section, payload) => {
    setSavingStatus(prev => ({ ...prev, [section]: true }));
    apiRequest('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }).then(() => {
      setSavingStatus(prev => ({ ...prev, [section]: false }));
      alert('Saved!');
    }).catch(() => {
      setSavingStatus(prev => ({ ...prev, [section]: false }));
      alert('Error!');
    });
  };

  if (loading) return <AdminLayout>Loading...</AdminLayout>;

  return (
    <AdminLayout>
      <h2>{t('settings.title')}</h2>
      
      {/* General Settings */}
      <PageCard title={t('settings.sections.general')}>
        <div className="form-group"><label>Title</label><input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <button onClick={() => updateField('general', { title: form.title, logoUrl: form.logoUrl })}>Save General</button>
      </PageCard>

      {/* Hero Settings */}
      <PageCard title={t('settings.sections.hero')}>
        <input value={form.heroTitle?.ru || ''} onChange={e => setForm({...form, heroTitle: {...form.heroTitle, ru: e.target.value}})} placeholder="Title RU" />
        <input value={form.heroSubtitle?.ru || ''} onChange={e => setForm({...form, heroSubtitle: {...form.heroSubtitle, ru: e.target.value}})} placeholder="Subtitle RU" />
        <button onClick={() => updateField('hero', { heroTitle: form.heroTitle, heroSubtitle: form.heroSubtitle })}>Save Hero</button>
      </PageCard>

      {/* Contacts Settings */}
      <PageCard title={t('settings.sections.contacts')}>
        <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" />
        <input value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" />
        <input value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" />
        <button onClick={() => updateField('contacts', { phone: form.phone, email: form.email, address: form.address })}>Save Contacts</button>
      </PageCard>

      {/* Working Hours */}
      <PageCard title={t('settings.sections.workingHours')}>
        {DAYS.map(day => (
          <div key={day}>
            {day}: 
            <input value={form.workingHours?.[day]?.open || ''} onChange={e => setForm({...form, workingHours: {...form.workingHours, [day]: {...form.workingHours[day], open: e.target.value}}})} />
            <input value={form.workingHours?.[day]?.close || ''} onChange={e => setForm({...form, workingHours: {...form.workingHours, [day]: {...form.workingHours[day], close: e.target.value}}})} />
          </div>
        ))}
        <button onClick={() => updateField('hours', { workingHours: form.workingHours })}>Save Hours</button>
      </PageCard>

      {/* Social Media */}
      <PageCard title={t('settings.sections.socialMedia')}>
        <button onClick={() => setForm({...form, socialMedia: [...(form.socialMedia || []), {platform: 'instagram', url: ''}]})}>Add Social</button>
        {(form.socialMedia || []).map((s, i) => (
          <div key={i}>
            <input value={s.platform} onChange={e => {
              const soc = [...form.socialMedia]; soc[i].platform = e.target.value; setForm({...form, socialMedia: soc});
            }} />
            <input value={s.url} onChange={e => {
              const soc = [...form.socialMedia]; soc[i].url = e.target.value; setForm({...form, socialMedia: soc});
            }} />
          </div>
        ))}
        <button onClick={() => updateField('social', { socialMedia: form.socialMedia })}>Save Socials</button>
      </PageCard>
    </AdminLayout>
  );
}
