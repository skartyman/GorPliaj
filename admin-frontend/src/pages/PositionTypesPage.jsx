import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import DataTable from '../components/DataTable';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const EMPTY_FORM = { value: '', name: { ua: '', ru: '', en: '' }, code: '', requiresSide: false, bookingKind: 'BEACH', sortOrder: 0, isActive: true };

export default function PositionTypesPage() {
  const { language } = useAdminI18n();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
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

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder)
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

  const columns = [
    { key: 'value', label: 'Value', render: (row) => <strong>{row.value}</strong> },
    { key: 'name', label: 'Name (UA)', render: (row) => row.name?.ua || '' },
    { key: 'code', label: 'Code', render: (row) => row.code },
    { key: 'requiresSide', label: 'Side?', render: (row) => row.requiresSide ? '✓' : '—' },
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
      <PageContainer title="Position Types" description="Manage bookable position types (bungalow, daybed, pier, etc.)">
        {feedback.message ? <p className={feedback.tone === 'error' ? 'error' : 'success'}>{feedback.message}</p> : null}

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px' }}>{editId ? 'Edit type' : 'Add type'}</h4>
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
              <label>Name (UA)
                <input value={form.name.ua} onChange={(e) => setForm({ ...form, name: { ...form.name, ua: e.target.value } })} />
              </label>
              <label>Name (RU)
                <input value={form.name.ru} onChange={(e) => setForm({ ...form, name: { ...form.name, ru: e.target.value } })} />
              </label>
              <label>Name (EN)
                <input value={form.name.en} onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })} />
              </label>
            </div>
            <div className="grid-two-col">
              <label className="menu-admin-checkbox">
                <input type="checkbox" checked={form.requiresSide} onChange={(e) => setForm({ ...form, requiresSide: e.target.checked })} />
                <span>Requires side</span>
              </label>
              <label>
                Booking kind
                <select value={form.bookingKind} onChange={(e) => setForm({ ...form, bookingKind: e.target.value })}>
                  <option value="BEACH">BEACH</option>
                  <option value="TABLE">TABLE</option>
                </select>
              </label>
              <label>
                Sort order
                <input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </label>
              <label className="menu-admin-checkbox" style={{ marginTop: 28 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>Active</span>
              </label>
            </div>
            <div className="actions">
              <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : (editId ? 'Save' : 'Create')}</button>
              {editId ? <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button> : null}
            </div>
          </form>
        </div>

        {loading ? <p>Loading...</p> : <DataTable columns={columns} rows={types} emptyText="No position types yet." />}
      </PageContainer>
    </AdminLayout>
  );
}
