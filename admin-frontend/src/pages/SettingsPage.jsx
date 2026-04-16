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
    }).then(res => {
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
        <input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
        <button onClick={() => updateField('general', { title: form.title })}>
          {savingStatus.general ? '...' : 'Save General'}
        </button>
      </PageCard>

      {/* Hero Settings */}
      <PageCard title={t('settings.sections.hero')}>
        <input value={form.heroTitle?.ru || ''} onChange={e => setForm({...form, heroTitle: {...form.heroTitle, ru: e.target.value}})} placeholder="Title RU" />
        <button onClick={() => updateField('hero', { heroTitle: form.heroTitle })}>Save Hero</button>
      </PageCard>

      {/* Contacts Settings */}
      <PageCard title={t('settings.sections.contacts')}>
        <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
        <button onClick={() => updateField('contacts', { phone: form.phone })}>Save Contacts</button>
      </PageCard>
    </AdminLayout>
  );
}
