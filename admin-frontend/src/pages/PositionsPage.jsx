import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import DataTable from '../components/DataTable';
import { apiRequest, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

function buildEmptyForm() {
  return {
    mapId: '',
    zoneId: '',
    code: '',
    name: { ua: '', ru: '', en: '' },
    positionType: '',
    bookingKind: 'TABLE',
    seatsMin: 0,
    seatsMax: 0,
    deposit: 0,
    isActive: true,
    isBookable: true,
    photoUrl: '',
    sortOrder: 0
  };
}

function normalizeLocalizedFormField(value) {
  if (!value || typeof value === 'string') return { ua: value || '', ru: value || '', en: value || '' };
  return {
    ua: value.ua || '',
    ru: value.ru || '',
    en: value.en || ''
  };
}

export default function PositionsPage() {
  const { t, language } = useAdminI18n();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [form, setForm] = useState(buildEmptyForm());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [filters, setFilters] = useState({ mapId: '', zoneId: '', positionType: '', bookingKind: '', search: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  async function loadPositions() {
    const params = new URLSearchParams();
    if (filters.mapId) params.set('mapId', filters.mapId);
    if (filters.zoneId) params.set('zoneId', filters.zoneId);
    if (filters.positionType) params.set('positionType', filters.positionType);
    if (filters.bookingKind) params.set('bookingKind', filters.bookingKind);
    if (filters.search) params.set('search', filters.search);

    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservation-positions?${params.toString()}`);

    if (!response.ok) {
      setState({ loading: false, error: body.message || t('positions.errors.load'), data: null });
      return;
    }

    setState({ loading: false, error: '', data: body });
  }

  useEffect(() => {
    loadPositions().catch(() => setState({ loading: false, error: t('positions.errors.load'), data: null }));
  }, [filters.mapId, filters.zoneId]);

  function resetForm() {
    setForm(buildEmptyForm());
    setEditId(null);
  }

  function startEdit(row) {
    setForm({
      mapId: row.map?.id || '',
      zoneId: row.zone?.id || '',
      code: row.code || '',
      name: normalizeLocalizedFormField(row.name),
      positionType: row.positionType || '',
      bookingKind: row.bookingKind || 'TABLE',
      seatsMin: row.seatsMin || 0,
      seatsMax: row.seatsMax || 0,
      deposit: Number(row.deposit) || 0,
      isActive: row.isActive !== false,
      isBookable: row.isBookable !== false,
      photoUrl: row.photoUrl || '',
      sortOrder: row.sortOrder || 0
    });
    setEditId(row.id);
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback('');

    let url, method;
    if (editId) {
      url = `/api/admin/reservation-positions/${editId}`;
      method = 'PATCH';
    } else {
      if (!form.mapId) {
        setFeedback(t('positions.errors.save'));
        setSaving(false);
        return;
      }
      url = '/api/admin/tables';
      method = 'POST';
    }

    const payload = {
      code: form.code,
      name: form.name,
      positionType: form.positionType,
      bookingKind: form.bookingKind,
      seatsMin: Number(form.seatsMin),
      seatsMax: Number(form.seatsMax),
      deposit: Number(form.deposit),
      isActive: form.isActive,
      isBookable: form.isBookable,
      photoUrl: form.photoUrl,
      sortOrder: Number(form.sortOrder)
    };

    if (method === 'POST') {
      payload.mapId = Number(form.mapId) || null;
      payload.zoneId = Number(form.zoneId) || null;
    } else {
      if (form.zoneId) payload.zoneId = Number(form.zoneId);
    }

    const { response, body } = await apiRequest(url, {
      method,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setFeedback(body.message || t('positions.errors.save'));
      setSaving(false);
      return;
    }

    setFeedback(editId ? t('positions.feedback.updated') : t('positions.feedback.created'));
    resetForm();
    setSaving(false);
    await loadPositions();
  }

  async function removePosition(id) {
    if (!window.confirm(t('positions.deleteConfirm'))) return;
    const { response } = await apiRequest(`/api/admin/tables/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setFeedback(t('positions.feedback.deleted'));
      await loadPositions();
    } else {
      setFeedback(t('positions.errors.delete'));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (!state.data) return;
    const allIds = state.data.positions.map((p) => p.id);
    setSelectedIds((prev) => (prev.length === allIds.length ? [] : allIds));
  }

  async function applyBulkAction() {
    if (!selectedIds.length) {
      setFeedback(t('positions.bulk.noSelection'));
      return;
    }
    if (!bulkAction) return;

    setSaving(true);
    setFeedback('');

    const updates = selectedIds.map((id) => {
      const patch = {};
      if (bulkAction === 'deposit') patch.deposit = Number(bulkValue) || 0;
      if (bulkAction === 'zone') patch.zoneId = Number(bulkValue) || null;
      if (bulkAction === 'bookingKind') patch.bookingKind = bulkValue;
      if (bulkAction === 'active') patch.isActive = bulkValue === 'true';
      return { id, ...patch };
    });

    const { response, body } = await apiRequest('/api/admin/tables/batch', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      setFeedback(t('positions.errors.batch'));
      setSaving(false);
      return;
    }

    const okCount = (body.results || []).length;
    const failCount = (body.errors || []).length;
    setFeedback(t('positions.feedback.batchDone', { ok: okCount, fail: failCount }));
    setSelectedIds([]);
    setBulkAction('');
    setBulkValue('');
    setSaving(false);
    await loadPositions();
  }

  const maps = state.data?.maps || [];
  const zones = state.data?.maps.flatMap((m) => m.zones || []) || [];
  const positions = state.data?.positions || [];
  const filteredPositions = positions.filter((p) => {
    if (filters.positionType && p.positionType !== filters.positionType) return false;
    if (filters.bookingKind && p.bookingKind !== filters.bookingKind) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [p.code, p.positionType, p.bookingKind, localizeField(p.name, language), localizeField(p.zone?.name, language)].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });

  const positionTypes = [...new Set(positions.map((p) => p.positionType).filter(Boolean))];
  const allZonesForFilter = [...new Map(zones.map((z) => [z.id, z]))].values();

  const columns = [
    {
      key: 'select',
      label: <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === filteredPositions.length && filteredPositions.length > 0} />,
      render: (row) => <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} />
    },
    {
      key: 'code',
      label: t('positions.columns.code'),
      render: (row) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.code || '—'}</span>
    },
    {
      key: 'name',
      label: t('positions.columns.name'),
      render: (row) => localizeField(row.name, language) || row.code || '—'
    },
    {
      key: 'positionType',
      label: t('positions.columns.positionType'),
      render: (row) => t(`reservationMeta.place.${row.positionType}`) || row.positionType || '—'
    },
    {
      key: 'zone',
      label: t('positions.columns.zone'),
      render: (row) => {
        const zoneName = localizeField(row.zone?.name, language);
        return zoneName ? <span style={{ color: row.zone?.color || undefined }}>{zoneName}</span> : '—';
      }
    },
    {
      key: 'bookingKind',
      label: t('positions.columns.bookingKind'),
      render: (row) => t(`reservationMeta.bookingKind.${row.bookingKind}`) || row.bookingKind || '—'
    },
    {
      key: 'seats',
      label: t('positions.columns.seats'),
      render: (row) => `${row.seatsMin || 0}–${row.seatsMax || 0}`
    },
    {
      key: 'deposit',
      label: t('positions.columns.deposit'),
      render: (row) => (Number(row.deposit) > 0 ? `${Number(row.deposit).toFixed(2)} UAH` : '—')
    },
    {
      key: 'active',
      label: t('positions.columns.active'),
      render: (row) => row.isActive !== false ? '✓' : '✗'
    },
    {
      key: 'actions',
      label: t('positions.columns.actions'),
      render: (row) => (
        <div className="actions compact">
          <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>{t('common.edit')}</button>
          <button type="button" className="btn btn-small btn-danger" onClick={() => removePosition(row.id)}>{t('common.delete')}</button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <PageContainer title={t('positions.title')} description={t('positions.description')}>
        {feedback ? (
          <div className="feedback-bar" style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {feedback}
          </div>
        ) : null}

        <div className="admin-section-divider" style={{ marginTop: 0 }}>
          <hr /><span>{t('positions.create')}</span>
        </div>

        <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div className="grid-two-col">
            <label>
              {t('positions.fields.map')} <span className="required">*</span>
              <select value={form.mapId} onChange={(e) => setForm({ ...form, mapId: e.target.value })} required={!editId}>
                <option value="">—</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>{localizeField(m.name, language)} ({m.usageMode})</option>
                ))}
              </select>
            </label>
            <label>
              {t('positions.fields.code')}
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A1" />
            </label>
            <label>
              {t('positions.fields.positionType')}
              <select value={form.positionType} onChange={(e) => setForm({ ...form, positionType: e.target.value })}>
                <option value="">—</option>
                {positionTypes.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </label>
            <label>
              {t('positions.fields.zone')}
              <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
                <option value="">—</option>
                {allZonesForFilter.map((z) => (
                  <option key={z.id} value={z.id}>{localizeField(z.name, language)}</option>
                ))}
              </select>
            </label>
            <label>
              {t('positions.fields.bookingKind')}
              <select value={form.bookingKind} onChange={(e) => setForm({ ...form, bookingKind: e.target.value })}>
                <option value="TABLE">{t('reservationMeta.bookingKind.TABLE')}</option>
                <option value="BEACH">{t('reservationMeta.bookingKind.BEACH')}</option>
              </select>
            </label>
            <label>
              {t('positions.fields.deposit')}
              <input type="number" min="0" step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
            </label>
            <label>
              {t('positions.fields.seatsMin')}
              <input type="number" min="0" value={form.seatsMin} onChange={(e) => setForm({ ...form, seatsMin: e.target.value })} />
            </label>
            <label>
              {t('positions.fields.seatsMax')}
              <input type="number" min="0" value={form.seatsMax} onChange={(e) => setForm({ ...form, seatsMax: e.target.value })} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <span>{t('positions.fields.isActive')}</span>
            </label>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={form.isBookable} onChange={(e) => setForm({ ...form, isBookable: e.target.checked })} />
              <span>{t('positions.fields.isBookable')}</span>
            </label>
          </div>
          <div className="actions" style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('positions.saving') : (editId ? t('common.save') : t('common.create'))}
            </button>
            {editId ? (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('positionTypes.form.cancel')}</button>
            ) : null}
          </div>
        </form>

        <div className="admin-section-divider">
          <hr /><span>{t('positions.title')}</span>
        </div>

        <div className="admin-filters" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <select value={filters.mapId} onChange={(e) => setFilters({ ...filters, mapId: e.target.value })} style={{ fontSize: 12 }}>
            <option value="">{t('positions.filters.all')} ({t('positions.filters.map')})</option>
            {maps.map((m) => (
              <option key={m.id} value={m.id}>{localizeField(m.name, language)}</option>
            ))}
          </select>
          <select value={filters.zoneId} onChange={(e) => setFilters({ ...filters, zoneId: e.target.value })} style={{ fontSize: 12 }}>
            <option value="">{t('positions.filters.all')} ({t('positions.filters.zone')})</option>
            {allZonesForFilter.map((z) => (
              <option key={z.id} value={z.id}>{localizeField(z.name, language)}</option>
            ))}
          </select>
          <select value={filters.positionType} onChange={(e) => setFilters({ ...filters, positionType: e.target.value })} style={{ fontSize: 12 }}>
            <option value="">{t('positions.filters.all')} ({t('positions.filters.positionType')})</option>
            {positionTypes.map((pt) => (
              <option key={pt} value={pt}>{pt}</option>
            ))}
          </select>
          <select value={filters.bookingKind} onChange={(e) => setFilters({ ...filters, bookingKind: e.target.value })} style={{ fontSize: 12 }}>
            <option value="">{t('positions.filters.all')} ({t('positions.filters.bookingKind')})</option>
            <option value="TABLE">{t('reservationMeta.bookingKind.TABLE')}</option>
            <option value="BEACH">{t('reservationMeta.bookingKind.BEACH')}</option>
          </select>
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder={t('positions.filters.search')} style={{ fontSize: 12, flex: '1 0 160px' }} />
        </div>

        {selectedIds.length > 0 ? (
          <div className="admin-bulk-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 13 }}>{t('positions.bulk.selected', { count: selectedIds.length })}</span>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} style={{ fontSize: 12 }}>
              <option value="">—</option>
              <option value="deposit">{t('positions.bulk.setDeposit')}</option>
              <option value="zone">{t('positions.bulk.setZone')}</option>
              <option value="bookingKind">{t('positions.bulk.setBookingKind')}</option>
              <option value="active">{t('positions.bulk.setActive')}</option>
            </select>
            {bulkAction === 'deposit' ? (
              <input type="number" min="0" step="0.01" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder="0.00" style={{ fontSize: 12, width: 100 }} />
            ) : null}
            {bulkAction === 'zone' ? (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">—</option>
                {allZonesForFilter.map((z) => (
                  <option key={z.id} value={z.id}>{localizeField(z.name, language)}</option>
                ))}
              </select>
            ) : null}
            {bulkAction === 'bookingKind' ? (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">—</option>
                <option value="TABLE">{t('reservationMeta.bookingKind.TABLE')}</option>
                <option value="BEACH">{t('reservationMeta.bookingKind.BEACH')}</option>
              </select>
            ) : null}
            {bulkAction === 'active' ? (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} style={{ fontSize: 12 }}>
                <option value="true">{t('positions.bulk.setActive')}</option>
                <option value="false">{t('positions.bulk.setInactive')}</option>
              </select>
            ) : null}
            <button type="button" className="btn btn-small btn-primary" disabled={saving || !bulkAction} onClick={applyBulkAction}>
              {t('positions.bulk.apply')}
            </button>
          </div>
        ) : null}

        {state.loading ? (
          <p className="muted">{t('positions.loading')}</p>
        ) : state.error ? (
          <p className="state-error">{state.error}</p>
        ) : (
          <DataTable columns={columns} rows={filteredPositions} emptyText={t('positions.empty')} />
        )}
      </PageContainer>
    </AdminLayout>
  );
}
