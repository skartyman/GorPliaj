import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function SettingsPage() {
  const { t } = useAdminI18n();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [savingStatus, setSavingStatus] = useState({});
  const [translating, setTranslating] = useState({});

  useEffect(() => {
    apiRequest('/api/admin/settings').then(res => {
      const data = res.body || {};
      // Инициализируем JSON поля, если они пустые
      if (!data.heroTitle) data.heroTitle = { ua: '', ru: '', en: '' };
      if (!data.heroSubtitle) data.heroSubtitle = { ua: '', ru: '', en: '' };
      if (!data.address) data.address = { ua: '', ru: '', en: '' };
      
      setForm(data);
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
      alert('Збережено!');
    }).catch(() => {
      setSavingStatus(prev => ({ ...prev, [section]: false }));
      alert('Помилка при збереженні');
    });
  };

  const autoTranslate = async (field) => {
    const sourceText = form[field]?.ua;
    if (!sourceText) {
      alert('Спочатку введіть текст українською (UA)');
      return;
    }

    setTranslating(prev => ({ ...prev, [field]: true }));
    
    try {
      const res = await apiRequest('/api/admin/translate', {
        method: 'POST',
        body: JSON.stringify({ text: sourceText, targetLangs: ['ru', 'en'] })
      });

      if (res.body) {
        setForm(prev => ({
          ...prev,
          [field]: { ...prev[field], ru: res.body.ru, en: res.body.en }
        }));
      }
    } catch (err) {
      alert('Помилка перекладу');
    } finally {
      setTranslating(prev => ({ ...prev, [field]: false }));
    }
  };

  if (loading) return <AdminLayout>Завантаження...</AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-hero">
        <h2>{t('settings.title')}</h2>
        <p className="muted">{t('settings.description')}</p>
      </div>
      
      <div className="stack-grid" style={{ marginTop: 24, display: 'grid', gap: 24 }}>
        
        {/* Hero Section */}
        <PageCard title={t('settings.sections.hero')}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="form-group">
              <label>Заголовок (UA/RU/EN)</label>
              <div style={{ display: 'grid', gap: 8 }}>
                <input value={form.heroTitle?.ua || ''} onChange={e => setForm({...form, heroTitle: {...form.heroTitle, ua: e.target.value}})} placeholder="Заголовок UA" />
                <input value={form.heroTitle?.ru || ''} onChange={e => setForm({...form, heroTitle: {...form.heroTitle, ru: e.target.value}})} placeholder="Заголовок RU" />
                <input value={form.heroTitle?.en || ''} onChange={e => setForm({...form, heroTitle: {...form.heroTitle, en: e.target.value}})} placeholder="Заголовок EN" />
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslate('heroTitle')} disabled={translating.heroTitle} style={{ marginTop: 8 }}>
                {translating.heroTitle ? 'Перекладаємо...' : '✨ Автопереклад (з UA)'}
              </button>
            </div>

            <div className="form-group">
              <label>Підзаголовок (UA/RU/EN)</label>
              <textarea value={form.heroSubtitle?.ua || ''} onChange={e => setForm({...form, heroSubtitle: {...form.heroSubtitle, ua: e.target.value}})} placeholder="Підзаголовок UA" rows="2" />
              <textarea value={form.heroSubtitle?.ru || ''} onChange={e => setForm({...form, heroSubtitle: {...form.heroSubtitle, ru: e.target.value}})} placeholder="Підзаголовок RU" rows="2" />
              <textarea value={form.heroSubtitle?.en || ''} onChange={e => setForm({...form, heroSubtitle: {...form.heroSubtitle, en: e.target.value}})} placeholder="Підзаголовок EN" rows="2" />
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslate('heroSubtitle')} disabled={translating.heroSubtitle} style={{ marginTop: 8 }}>
                {translating.heroSubtitle ? 'Перекладаємо...' : '✨ Автопереклад (з UA)'}
              </button>
            </div>
            
            <button className="btn btn-primary" onClick={() => updateField('hero', { heroTitle: form.heroTitle, heroSubtitle: form.heroSubtitle })}>
              {savingStatus.hero ? 'Зберігаємо...' : 'Зберегти блок Hero'}
            </button>
          </div>
        </PageCard>

        {/* Contacts & Map */}
        <PageCard title={t('settings.sections.contacts')}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="form-group">
              <label>Телефон</label>
              <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>Адреса (UA/RU/EN)</label>
              <div style={{ display: 'grid', gap: 8 }}>
                <input value={form.address?.ua || ''} onChange={e => setForm({...form, address: {...form.address, ua: e.target.value}})} placeholder="Адреса UA" />
                <input value={form.address?.ru || ''} onChange={e => setForm({...form, address: {...form.address, ru: e.target.value}})} placeholder="Адреса RU" />
                <input value={form.address?.en || ''} onChange={e => setForm({...form, address: {...form.address, en: e.target.value}})} placeholder="Адреса EN (Транслітерація)" />
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslate('address')} disabled={translating.address} style={{ marginTop: 8 }}>
                {translating.address ? 'Перекладаємо...' : '✨ Автопереклад (з UA)'}
              </button>
            </div>

            <div className="form-group" style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <label>Google Maps Embed URL</label>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Скопіюйте 'src' з коду Google Maps (Поділитися → Карта на сайт)</p>
              <input value={form.mapEmbedUrl || ''} onChange={e => setForm({...form, mapEmbedUrl: e.target.value})} placeholder="https://www.google.com/maps/embed?pb=..." />
            </div>

            <button className="btn btn-primary" onClick={() => updateField('contacts', { phone: form.phone, address: form.address, mapEmbedUrl: form.mapEmbedUrl })}>
              {savingStatus.contacts ? 'Зберігаємо...' : 'Зберегти контакти та карту'}
            </button>
          </div>
        </PageCard>

        {/* Working Hours */}
        <PageCard title={t('settings.sections.workingHours')}>
          <div style={{ display: 'grid', gap: 8 }}>
            {DAYS.map(day => (
              <div key={day} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{day.toUpperCase()}</span>
                <input value={form.workingHours?.[day]?.open || ''} onChange={e => setForm({...form, workingHours: {...form.workingHours, [day]: {...form.workingHours[day], open: e.target.value}}})} placeholder="09:00" />
                <input value={form.workingHours?.[day]?.close || ''} onChange={e => setForm({...form, workingHours: {...form.workingHours, [day]: {...form.workingHours[day], close: e.target.value}}})} placeholder="21:00" />
              </div>
            ))}
            <button className="btn btn-primary" onClick={() => updateField('hours', { workingHours: form.workingHours })} style={{ marginTop: 16 }}>
              {savingStatus.hours ? 'Зберігаємо...' : 'Зберегти часи роботи'}
            </button>
          </div>
        </PageCard>

        {/* Social Media */}
        <PageCard title={t('settings.sections.socialMedia')}>
          <div style={{ display: 'grid', gap: 12 }}>
            {(form.socialMedia || []).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 8 }}>
                <select value={s.platform} onChange={e => {
                  const soc = [...form.socialMedia]; soc[i].platform = e.target.value; setForm({...form, socialMedia: soc});
                }}>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="telegram">Telegram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <input value={s.url} onChange={e => {
                  const soc = [...form.socialMedia]; soc[i].url = e.target.value; setForm({...form, socialMedia: soc});
                }} placeholder="URL" />
                <button className="btn btn-danger btn-small" onClick={() => setForm({...form, socialMedia: form.socialMedia.filter((_, idx) => idx !== i)})}>&times;</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-small" onClick={() => setForm({...form, socialMedia: [...(form.socialMedia || []), {platform: 'instagram', url: ''}]})}>+ Додати посилання</button>
            <button className="btn btn-primary" onClick={() => updateField('social', { socialMedia: form.socialMedia })} style={{ marginTop: 12 }}>
              {savingStatus.social ? 'Зберігаємо...' : 'Зберегти соцмережі'}
            </button>
          </div>
        </PageCard>

      </div>
    </AdminLayout>
  );
}
