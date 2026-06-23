import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import DataTable from '../components/DataTable';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const IMAGE_UPLOAD_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

const EMPTY_FORM = {
  value: '', name: { ua: '', ru: '', en: '' }, description: { ua: '', ru: '', en: '' },
  photoUrl: '', defaultPrice: '', defaultDeposit: '',
  code: '', requiresSide: false, bookingKind: 'BEACH', sortOrder: 0, isActive: true
};

export default function PositionTypesPage() {
  const { language } = useAdminI18n();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [feedback, setFeedback] = useState({ tone: '', message: '' });

  async function loadTypes() {
    setLoading(true);
    const { response, body } = await apiRequest('/api/admin/position-types');
    if (response.ok) setTypes(Array.isArray(body) ? body : []);
    setLoading(false);
  }

  useEffect(() => { loadTypes(); }, []);

  function startEdit(type) {
    setEditId(type.id);
    setForm({
      value: type.value || '',
      name: { ua: type.name?.ua || '', ru: type.name?.ru || '', en: type.name?.en || '' },
      description: { ua: type.description?.ua || '', ru: type.description?.ru || '', en: type.description?.en || '' },
      photoUrl: type.photoUrl || '',
      defaultPrice: type.defaultPrice != null ? String(type.defaultPrice) : '',
      defaultDeposit: type.defaultDeposit != null ? String(type.defaultDeposit) : '',
      code: type.code || '',
      requiresSide: type.requiresSide ?? false,
      bookingKind: type.bookingKind || 'BEACH',
      sortOrder: type.sortOrder ?? 0,
      isActive: type.isActive ?? true
    });
  }

  function resetForm() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setUploadingField('photo');
    try {
      const payload = new FormData();
      payload.append('image', file);
      payload.append('folder', 'settings');
      const { response, body } = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: payload });
      if (response.ok && body.url) {
        setForm((current) => ({ ...current, photoUrl: body.url }));
      } else {
        alert(body?.message || 'Upload failed');
      }
    } catch { alert('Upload failed'); }
    finally { setUploadingField(null); }
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder),
      defaultPrice: form.defaultPrice !== '' ? Number(form.defaultPrice) : null,
      defaultDeposit: form.defaultDeposit !== '' ? Number(form.defaultDeposit) : null
    };
    const path = editId ? `/api/admin/position-types/${editId}` : '/api/admin/position-types';
    const method = editId ? 'PATCH' : 'POST';
    const { response, body } = await apiRequest(path, { method, body: JSON.stringify(payload) });
    setSaving(false);
    if (!response.ok) { setFeedback({ tone: 'error', message: body.message || 'Failed to save' }); return; }
    await loadTypes();
    resetForm();
    setFeedback({ tone: 'success', message: editId ? 'Type updated' : 'Type created' });
  }

  async function removeType(id) {
    if (!window.confirm('Delete this position type?')) return;
    setSaving(true);
    const { response, body } = await apiRequest(`/api/admin/position-types/${id}`, { method: 'DELETE' });
    setSaving(false);
    if (!response.ok) { setFeedback({ tone: 'error', message: body.message || 'Failed to delete' }); return; }
    await loadTypes();
    setFeedback({ tone: 'success', message: 'Type deleted' });
  }

  const isBeach = form.bookingKind === 'BEACH';
  const currencyLabel = isBeach ? 'грн' : 'грн';

  const columns = [
    { key: 'value', label: 'Value', render: (row) => <strong>{row.value}</strong> },
    { key: 'name', label: 'Name (UA)', render: (row) => row.name?.ua || '' },
    { key: 'code', label: 'Code', render: (row) => row.code },
    { key: 'photoUrl', label: 'Фото', render: (row) => row.photoUrl ? <img src={row.photoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—' },
    { key: 'defaultPrice', label: 'Ціна', render: (row) => row.defaultPrice ? `${Number(row.defaultPrice).toFixed(0)} грн` : '—' },
    { key: 'defaultDeposit', label: 'Депозит', render: (row) => row.defaultDeposit ? `${Number(row.defaultDeposit).toFixed(0)} грн` : '—' },
    { key: 'bookingKind', label: 'Kind', render: (row) => row.bookingKind },
    { key: 'sortOrder', label: 'Sort', render: (row) => row.sortOrder },
    { key: 'isActive', label: 'Active', render: (row) => row.isActive ? '✓' : '—' },
    {
      key: 'actions', label: '',
      render: (row) => (
        <div className="actions compact">
          <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>Edit</button>
          <button type="button" className="btn btn-small btn-danger" disabled={saving} onClick={() => removeType(row.id)}>Delete</button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <PageContainer title="Позиції" description="Типи позицій: бунгало, ліжка, пірс, столи, тераса тощо">
        {feedback.message ? <p className={feedback.tone === 'error' ? 'error' : 'success'}>{feedback.message}</p> : null}

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>{editId ? 'Редагувати тип' : 'Додати тип'}</h4>
          <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-two-col">
              <label>Value <span className="required">*</span>
                <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.toUpperCase() })} required disabled={!!editId} />
              </label>
              <label>Code <span className="required">*</span>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required maxLength={5} style={{ width: 80 }} />
              </label>
            </div>

            <div className="grid-two-col">
              <label>Назва (UA)
                <input value={form.name.ua} onChange={(e) => setForm({ ...form, name: { ...form.name, ua: e.target.value } })} />
              </label>
              <label>Назва (RU)
                <input value={form.name.ru} onChange={(e) => setForm({ ...form, name: { ...form.name, ru: e.target.value } })} />
              </label>
              <label>Назва (EN)
                <input value={form.name.en} onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })} />
              </label>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Опис (UA)</label>
              <textarea value={form.description.ua} onChange={(e) => setForm({ ...form, description: { ...form.description, ua: e.target.value } })} rows="3" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Опис (RU)</label>
              <textarea value={form.description.ru} onChange={(e) => setForm({ ...form, description: { ...form.description, ru: e.target.value } })} rows="3" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Опис (EN)</label>
              <textarea value={form.description.en} onChange={(e) => setForm({ ...form, description: { ...form.description, en: e.target.value } })} rows="3" />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Фото</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
                ) : null}
                <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
                  {uploadingField === 'photo' ? 'Завантаження...' : (form.photoUrl ? 'Змінити' : 'Завантажити')}
                  <input type="file" accept={IMAGE_UPLOAD_ACCEPT} style={{ display: 'none' }} disabled={uploadingField === 'photo'}
                    onChange={(e) => { uploadPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {form.photoUrl ? (
                  <button type="button" className="btn btn-danger btn-small" onClick={() => setForm({ ...form, photoUrl: '' })}>×</button>
                ) : null}
              </div>
            </div>

            <div className="grid-two-col">
              <label className="menu-admin-checkbox">
                <input type="checkbox" checked={form.requiresSide} onChange={(e) => setForm({ ...form, requiresSide: e.target.checked })} />
                <span>Потрібна сторона</span>
              </label>
              <label>
                Тип бронювання
                <select value={form.bookingKind} onChange={(e) => setForm({ ...form, bookingKind: e.target.value })}>
                  <option value="BEACH">Пляж (BEACH)</option>
                  <option value="TABLE">Стіл (TABLE)</option>
                </select>
              </label>
              <label>
                Сортування
                <input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </label>
              <label className="menu-admin-checkbox" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>Активно</span>
              </label>
            </div>

            {isBeach ? (
              <div className="form-group">
                <label>Ціна за замовчуванням ({currencyLabel})</label>
                <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })} placeholder="Наприклад: 1000" />
              </div>
            ) : (
              <div className="form-group">
                <label>Депозит за замовчуванням ({currencyLabel})</label>
                <input type="number" min="0" step="0.01" value={form.defaultDeposit} onChange={(e) => setForm({ ...form, defaultDeposit: e.target.value })} placeholder="Наприклад: 200" />
              </div>
            )}

            <div className="actions">
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Зберігаємо...' : (editId ? 'Зберегти' : 'Створити')}</button>
              {editId ? <button type="button" className="btn btn-secondary" onClick={resetForm}>Скасувати</button> : null}
            </div>
          </form>
        </div>

        {loading ? <p>Завантаження...</p> : <DataTable columns={columns} rows={types} emptyText="Поки немає типів позицій." />}
      </PageContainer>
    </AdminLayout>
  );
}
