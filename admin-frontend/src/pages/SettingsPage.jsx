import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const IMAGE_UPLOAD_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

function UploadableUrlField({ label, value, placeholder = 'https://...', hint, uploading, onChange, onUpload }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
        <label className="btn btn-secondary btn-small field-upload-button">
          {uploading ? 'Загрузка...' : 'Загрузить'}
          <input
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(event) => {
              onUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {hint ? <p className="muted" style={{ fontSize: '0.8rem' }}>{hint}</p> : null}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useAdminI18n();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [savingStatus, setSavingStatus] = useState({});
  const [translating, setTranslating] = useState({});
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    apiRequest('/api/admin/settings').then(res => {
      const data = res.body || {};
      // Инициализируем JSON поля, если они пустые
      if (!data.heroTitle) data.heroTitle = { ua: '', ru: '', en: '' };
      if (!data.heroSubtitle) data.heroSubtitle = { ua: '', ru: '', en: '' };
      if (!data.aboutTitle) data.aboutTitle = { ua: '', ru: '', en: '' };
      if (!data.aboutText) data.aboutText = { ua: '', ru: '', en: '' };
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

  const uploadImageToField = async (field, file) => {
    if (!file || uploadingField) return;

    setUploadingField(field);

    try {
      const payload = new FormData();
      payload.append('image', file);
      payload.append('folder', 'settings');

      const { response, body } = await apiRequest('/api/admin/uploads/image', {
        method: 'POST',
        body: payload
      });

      if (!response.ok) {
        alert(body.message || 'Не удалось загрузить файл');
        return;
      }

      setForm((current) => ({ ...current, [field]: body.url || '' }));
    } catch (err) {
      alert('Не удалось загрузить файл');
    } finally {
      setUploadingField(null);
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

        <PageCard title="Сторінка «Про нас»">
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="form-group">
              <label>Заголовок сторінки (UA/RU/EN)</label>
              <div style={{ display: 'grid', gap: 8 }}>
                <input value={form.aboutTitle?.ua || ''} onChange={e => setForm({...form, aboutTitle: {...form.aboutTitle, ua: e.target.value}})} placeholder="Заголовок UA" />
                <input value={form.aboutTitle?.ru || ''} onChange={e => setForm({...form, aboutTitle: {...form.aboutTitle, ru: e.target.value}})} placeholder="Заголовок RU" />
                <input value={form.aboutTitle?.en || ''} onChange={e => setForm({...form, aboutTitle: {...form.aboutTitle, en: e.target.value}})} placeholder="Заголовок EN" />
              </div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslate('aboutTitle')} disabled={translating.aboutTitle} style={{ marginTop: 8 }}>
                {translating.aboutTitle ? 'Перекладаємо...' : 'Автопереклад з UA'}
              </button>
            </div>

            <div className="form-group">
              <label>Опис закладу (UA/RU/EN)</label>
              <textarea value={form.aboutText?.ua || ''} onChange={e => setForm({...form, aboutText: {...form.aboutText, ua: e.target.value}})} placeholder="Текст UA" rows="5" />
              <textarea value={form.aboutText?.ru || ''} onChange={e => setForm({...form, aboutText: {...form.aboutText, ru: e.target.value}})} placeholder="Текст RU" rows="5" />
              <textarea value={form.aboutText?.en || ''} onChange={e => setForm({...form, aboutText: {...form.aboutText, en: e.target.value}})} placeholder="Текст EN" rows="5" />
              <button type="button" className="btn btn-secondary btn-small" onClick={() => autoTranslate('aboutText')} disabled={translating.aboutText} style={{ marginTop: 8 }}>
                {translating.aboutText ? 'Перекладаємо...' : 'Автопереклад з UA'}
              </button>
            </div>

            <UploadableUrlField
              label="Фото / обкладинка сторінки"
              value={form.aboutImageUrl}
              uploading={uploadingField === 'aboutImageUrl'}
              onChange={(value) => setForm({ ...form, aboutImageUrl: value })}
              onUpload={(file) => uploadImageToField('aboutImageUrl', file)}
              hint="Можна залишити порожнім, тоді сторінка використає логотип або стандартний фон."
            />

            <button className="btn btn-primary" onClick={() => updateField('about', { aboutTitle: form.aboutTitle, aboutText: form.aboutText, aboutImageUrl: form.aboutImageUrl })}>
              {savingStatus.about ? 'Зберігаємо...' : 'Зберегти сторінку «Про нас»'}
            </button>
          </div>
        </PageCard>

        {/* Gallery */}
        <PageCard title="Фотогалерея">
          <div style={{ display: 'grid', gap: 16 }}>
            <p className="muted" style={{ fontSize: '0.8rem' }}>
              Фото для каруселі на головній сторінці. Максимум 10 фото. Перше фото = перше в каруселі.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {(form.galleryImages || []).map((url, i) => (
                <div key={url} style={{ position: 'relative', width: 140, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', flexShrink: 0 }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap: 2, padding: 4, background: 'rgba(0,0,0,0.45)' }}>
                    <button type="button" className="btn btn-small" disabled={i === 0} onClick={() => {
                      const arr = [...(form.galleryImages || [])];
                      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                      setForm({ ...form, galleryImages: arr });
                    }} style={{ fontSize: 11, padding: '2px 6px' }}>↑</button>
                    <button type="button" className="btn btn-small" disabled={i === arr.length - 1} onClick={() => {
                      const arr = [...(form.galleryImages || [])];
                      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                      setForm({ ...form, galleryImages: arr });
                    }} style={{ fontSize: 11, padding: '2px 6px' }}>↓</button>
                    <button type="button" className="btn btn-danger btn-small" onClick={async () => {
                      try {
                        const res = await apiRequest('/api/admin/uploads/gallery/delete', {
                          method: 'POST',
                          body: JSON.stringify({ imageUrl: url })
                        });
                        if (res.body?.images) setForm({ ...form, galleryImages: res.body.images });
                      } catch { alert('Помилка при видаленні фото'); }
                    }} style={{ fontSize: 11, padding: '2px 6px', marginLeft: 'auto' }}>&times;</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {(form.galleryImages || []).length} / 10 фото
            </div>
            <div className="form-group">
              <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                {uploadingField === 'gallery' ? 'Завантаження...' : '+ Додати фото'}
                <input
                  type="file"
                  accept={IMAGE_UPLOAD_ACCEPT}
                  style={{ display: 'none' }}
                  disabled={uploadingField === 'gallery'}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || uploadingField) return;
                    setUploadingField('gallery');
                    try {
                      const payload = new FormData();
                      payload.append('image', file);
                      payload.append('folder', 'gallery');
                      const { response, body } = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: payload });
                      if (response.ok && body.url) {
                        setForm((current) => ({
                          ...current,
                          galleryImages: body.images || [...(current.galleryImages || []), body.url]
                        }));
                      } else {
                        alert(body.message || 'Помилка завантаження');
                      }
                    } catch { alert('Помилка завантаження'); }
                    finally { setUploadingField(null); event.target.value = ''; }
                  }}
                />
              </label>
            </div>
            {(form.galleryImages || []).length > 0 ? (
              <button className="btn btn-primary" onClick={() => updateField('gallery', { galleryImages: form.galleryImages })}>
                {savingStatus.gallery ? 'Зберігаємо...' : 'Зберегти порядок фото'}
              </button>
            ) : null}
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
