import { useEffect, useState, Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
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
    price: '',
    priceWeekday: '',
    priceWeekend: '',
    depositWeekday: '',
    depositWeekend: '',
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
  const [feedbackType, setFeedbackType] = useState('');
  const [filters, setFilters] = useState({ mapId: '', zoneId: '', positionType: '', bookingKind: '', search: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  const [allPositionTypes, setAllPositionTypes] = useState([]);
  const [savingTypeIds, setSavingTypeIds] = useState([]);

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

  async function loadPositionTypes() {
    const { response, body } = await apiRequest('/api/admin/position-types');
    if (response.ok && Array.isArray(body)) {
      setAllPositionTypes(body);
    }
  }

  function handleTypePriceChange(id, field, value) {
    setAllPositionTypes((prev) =>
      prev.map((pt) => (pt.id === id ? { ...pt, [field]: value } : pt))
    );
  }

  async function savePositionTypePrices(pt) {
    setSavingTypeIds((prev) => [...prev, pt.id]);
    setFeedback('');
    setFeedbackType('');

    const payload = {
      defaultPrice: pt.defaultPrice !== '' && pt.defaultPrice != null ? Number(pt.defaultPrice) : null,
      defaultDeposit: pt.defaultDeposit !== '' && pt.defaultDeposit != null ? Number(pt.defaultDeposit) : null,
      priceWeekday: pt.priceWeekday !== '' && pt.priceWeekday != null ? Number(pt.priceWeekday) : null,
      priceWeekend: pt.priceWeekend !== '' && pt.priceWeekend != null ? Number(pt.priceWeekend) : null,
      depositWeekday: pt.depositWeekday !== '' && pt.depositWeekday != null ? Number(pt.depositWeekday) : null,
      depositWeekend: pt.depositWeekend !== '' && pt.depositWeekend != null ? Number(pt.depositWeekend) : null
    };

    const { response, body } = await apiRequest(`/api/admin/position-types/${pt.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    setSavingTypeIds((prev) => prev.filter((id) => id !== pt.id));
    if (response.ok) {
      setFeedback(t('positionTypes.feedback.saved') || 'Ціни успішно збережено');
      setFeedbackType('success');
      await loadPositionTypes();
    } else {
      setFeedback(body.message || t('positionTypes.errors.save') || 'Помилка збереження цін');
      setFeedbackType('error');
    }
  }

  useEffect(() => {
    loadPositions().catch(() => setState({ loading: false, error: t('positions.errors.load'), data: null }));
    loadPositionTypes();
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
      price: row.price != null ? String(row.price) : '',
      priceWeekday: row.priceWeekday != null ? String(row.priceWeekday) : '',
      priceWeekend: row.priceWeekend != null ? String(row.priceWeekend) : '',
      depositWeekday: row.depositWeekday != null ? String(row.depositWeekday) : '',
      depositWeekend: row.depositWeekend != null ? String(row.depositWeekend) : '',
      isActive: row.isActive !== false,
      isBookable: row.isBookable !== false,
      photoUrl: row.photoUrl || '',
      sortOrder: row.sortOrder || 0
    });
    setEditId(row.id);
  }

  function cancelEdit() {
    resetForm();
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    setFeedbackType('');

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
      price: form.price !== '' ? Number(form.price) : null,
      priceWeekday: form.priceWeekday !== '' ? Number(form.priceWeekday) : null,
      priceWeekend: form.priceWeekend !== '' ? Number(form.priceWeekend) : null,
      depositWeekday: form.depositWeekday !== '' ? Number(form.depositWeekday) : null,
      depositWeekend: form.depositWeekend !== '' ? Number(form.depositWeekend) : null,
      isActive: form.isActive,
      isBookable: form.isBookable,
      photoUrl: form.photoUrl,
      sortOrder: Number(form.sortOrder)
    };

    if (method === 'POST') {
      payload.mapId = Number(form.mapId) || null;
    }
    payload.zoneId = Number(form.zoneId) || null;

    const { response, body } = await apiRequest(url, {
      method,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setFeedback(body.message || t('positions.errors.save'));
      setFeedbackType('error');
      setSaving(false);
      return;
    }

    setFeedback(editId ? t('positions.feedback.updated') : t('positions.feedback.created'));
    setFeedbackType('success');
    resetForm();
    setSaving(false);
    await loadPositions();
  }

  async function removePosition(id) {
    if (!window.confirm(t('positions.deleteConfirm'))) return;
    const { response, body } = await apiRequest(`/api/admin/tables/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setFeedback(t('positions.feedback.deleted'));
      setFeedbackType('success');
      await loadPositions();
    } else {
      setFeedback(body.message || t('positions.errors.delete'));
      setFeedbackType('error');
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
      if (bulkAction === 'price') patch.price = bulkValue !== '' ? Number(bulkValue) : null;
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
      setFeedbackType('error');
      setSaving(false);
      return;
    }

    const okCount = (body.results || []).length;
    const failCount = (body.errors || []).length;
    setFeedback(t('positions.feedback.batchDone', { ok: okCount, fail: failCount }));
    setFeedbackType(failCount > 0 ? 'warning' : 'success');
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

  const positionTypes = allPositionTypes.length ? allPositionTypes.map((pt) => pt.value).filter(Boolean) : [...new Set(positions.map((p) => p.positionType).filter(Boolean))];
  const allZonesForFilter = [...new Map(zones.map((z) => [z.id, z])).values()];

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
      key: 'price',
      label: t('positions.columns.price'),
      render: (row) => {
        if (row.priceWeekday != null || row.priceWeekend != null) {
          const wkday = row.priceWeekday != null ? `${Number(row.priceWeekday)}` : '—';
          const wkend = row.priceWeekend != null ? `${Number(row.priceWeekend)}` : '—';
          return `${wkday} / ${wkend} UAH`;
        }
        if (row.price != null && Number(row.price) > 0) {
          return `${Number(row.price).toFixed(2)} UAH`;
        }
        const pt = allPositionTypes.find((t) => t.value === row.positionType);
        if (pt) {
          if (pt.priceWeekday != null || pt.priceWeekend != null) {
            const wkday = pt.priceWeekday != null ? `${Number(pt.priceWeekday)}` : '—';
            const wkend = pt.priceWeekend != null ? `${Number(pt.priceWeekend)}` : '—';
            return <span className="muted" style={{ fontSize: 11 }}>{wkday} / {wkend} UAH (тип)</span>;
          }
          if (pt.defaultPrice != null) {
            return <span className="muted" style={{ fontSize: 11 }}>{Number(pt.defaultPrice)} UAH (тип)</span>;
          }
        }
        return '—';
      }
    },
    {
      key: 'deposit',
      label: t('positions.columns.deposit'),
      render: (row) => {
        if (row.depositWeekday != null || row.depositWeekend != null) {
          const wkday = row.depositWeekday != null ? `${Number(row.depositWeekday)}` : '—';
          const wkend = row.depositWeekend != null ? `${Number(row.depositWeekend)}` : '—';
          return `${wkday} / ${wkend} UAH`;
        }
        if (row.deposit != null && Number(row.deposit) > 0) {
          return `${Number(row.deposit).toFixed(2)} UAH`;
        }
        const pt = allPositionTypes.find((t) => t.value === row.positionType);
        if (pt) {
          if (pt.depositWeekday != null || pt.depositWeekend != null) {
            const wkday = pt.depositWeekday != null ? `${Number(pt.depositWeekday)}` : '—';
            const wkend = pt.depositWeekend != null ? `${Number(pt.depositWeekend)}` : '—';
            return <span className="muted" style={{ fontSize: 11 }}>{wkday} / {wkend} UAH (тип)</span>;
          }
          if (pt.defaultDeposit != null) {
            return <span className="muted" style={{ fontSize: 11 }}>{Number(pt.defaultDeposit)} UAH (тип)</span>;
          }
        }
        return '—';
      }
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
          {editId === row.id ? (
            <span className="muted" style={{ fontSize: 12 }}>{t('positions.editing')}</span>
          ) : (
            <button type="button" className="btn btn-small btn-secondary" onClick={() => startEdit(row)}>{t('common.edit')}</button>
          )}
          <button type="button" className="btn btn-small btn-danger" onClick={() => removePosition(row.id)}>{t('common.delete')}</button>
        </div>
      )
    }
  ];

  function renderFormFields() {
    const inputS = { fontSize: 12, padding: '2px 6px', height: 28 };
    const selectS = { fontSize: 12, padding: '2px 6px', height: 28 };
    return (
      <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
        <div style={{ display: 'contents' }}>
          <label style={{ fontSize: 11, gridColumn: 'span 1' }}>
            {t('positions.fields.code')}
            <input style={inputS} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A1" />
          </label>
          <label style={{ fontSize: 11, gridColumn: 'span 2' }}>
            {t('positions.fields.name')}
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>UA</span>
              <input style={{ ...inputS, flex: 1, minWidth: 0 }} value={form.name.ua} onChange={(e) => setForm({ ...form, name: { ...form.name, ua: e.target.value } })} placeholder="Назва UA" />
              <span style={{ fontSize: 10, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>RU</span>
              <input style={{ ...inputS, flex: 1, minWidth: 0 }} value={form.name.ru} onChange={(e) => setForm({ ...form, name: { ...form.name, ru: e.target.value } })} placeholder="Назва RU" />
              <span style={{ fontSize: 10, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>EN</span>
              <input style={{ ...inputS, flex: 1, minWidth: 0 }} value={form.name.en} onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })} placeholder="Назва EN" />
            </div>
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.positionType')}
            <select style={selectS} value={form.positionType} onChange={(e) => setForm({ ...form, positionType: e.target.value })}>
              <option value="">—</option>
              {positionTypes.map((pt) => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.zone')}
            <select style={selectS} value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
              <option value="">—</option>
              {allZonesForFilter.map((z) => (
                <option key={z.id} value={z.id}>{localizeField(z.name, language)}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.bookingKind')}
            <select style={selectS} value={form.bookingKind} onChange={(e) => setForm({ ...form, bookingKind: e.target.value })}>
              <option value="TABLE">{t('reservationMeta.bookingKind.TABLE')}</option>
              <option value="BEACH">{t('reservationMeta.bookingKind.BEACH')}</option>
            </select>
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.price')}
            <input style={inputS} type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="—" />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.priceWeekday')}
            <input style={inputS} type="number" min="0" step="0.01" value={form.priceWeekday} onChange={(e) => setForm({ ...form, priceWeekday: e.target.value })} placeholder="—" />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.priceWeekend')}
            <input style={inputS} type="number" min="0" step="0.01" value={form.priceWeekend} onChange={(e) => setForm({ ...form, priceWeekend: e.target.value })} placeholder="—" />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.deposit')}
            <input style={inputS} type="number" min="0" step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.depositWeekday')}
            <input style={inputS} type="number" min="0" step="0.01" value={form.depositWeekday} onChange={(e) => setForm({ ...form, depositWeekday: e.target.value })} placeholder="—" />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.depositWeekend')}
            <input style={inputS} type="number" min="0" step="0.01" value={form.depositWeekend} onChange={(e) => setForm({ ...form, depositWeekend: e.target.value })} placeholder="—" />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.seatsMin')}
            <input style={inputS} type="number" min="0" value={form.seatsMin} onChange={(e) => setForm({ ...form, seatsMin: e.target.value })} />
          </label>
          <label style={{ fontSize: 11 }}>
            {t('positions.fields.seatsMax')}
            <input style={inputS} type="number" min="0" value={form.seatsMax} onChange={(e) => setForm({ ...form, seatsMax: e.target.value })} />
          </label>
          <div style={{ fontSize: 11, display: 'flex', gap: 8, alignItems: 'center', height: 28, alignSelf: 'end' }}>
            <label className="menu-admin-checkbox" style={{ gap: 2 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <span style={{ fontSize: 11 }}>{t('positions.fields.isActive')}</span>
            </label>
            <label className="menu-admin-checkbox" style={{ gap: 2 }}>
              <input type="checkbox" checked={form.isBookable} onChange={(e) => setForm({ ...form, isBookable: e.target.checked })} />
              <span style={{ fontSize: 11 }}>{t('positions.fields.isBookable')}</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <PageContainer title={t('positions.title')} description={t('positions.description')}>
        {feedback ? (
          <div className="feedback-bar" style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius-sm)', background: feedbackType === 'error' ? '#fef2f2' : feedbackType === 'warning' ? '#fffbeb' : '#f0fdf4', border: '1px solid', borderColor: feedbackType === 'error' ? '#fecaca' : feedbackType === 'warning' ? '#fde68a' : '#bbf7d0', color: feedbackType === 'error' ? '#dc2626' : feedbackType === 'warning' ? '#92400e' : '#16a34a' }}>
            {feedback}
          </div>
        ) : null}

        <details className="admin-collapsible" open={!!editId}>
          <summary>{editId ? t('positions.editing') : t('positions.create')}</summary>
          <div className="admin-collapsible-content">
            <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, maxWidth: 320 }}>
                {t('positions.fields.map')} <span className="required">*</span>
                <select style={{ fontSize: 12, padding: '2px 6px', height: 28 }} value={form.mapId} onChange={(e) => setForm({ ...form, mapId: e.target.value })} required>
                  <option value="">—</option>
                  {maps.map((m) => (
                    <option key={m.id} value={m.id}>{localizeField(m.name, language)} ({m.usageMode})</option>
                  ))}
                </select>
              </label>
              {renderFormFields()}
              <div className="actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" className="btn btn-small btn-primary" disabled={saving}>
                  {saving ? t('positions.saving') : (editId ? t('common.save') : t('common.create'))}
                </button>
                {editId ? (
                  <button type="button" className="btn btn-small btn-secondary" onClick={cancelEdit}>
                    {t('positionTypes.form.cancel') || 'Скасувати'}
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </details>

        <details className="admin-collapsible">
          <summary>{t('positionTypes.title') || 'Ціни по типам послуг'}</summary>
          <div className="admin-collapsible-content">
            {allPositionTypes.length === 0 ? (
              <p className="muted">{t('positionTypes.loading') || 'Завантаження...'}</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table compact">
                  <thead>
                    <tr>
                      <th>{t('positionTypes.columns.value') || 'Код'}</th>
                      <th>{t('positionTypes.columns.name') || 'Назва'}</th>
                      <th>{t('positionTypes.form.fields.bookingKind') || 'Тип'}</th>
                      <th>{t('positionTypes.form.fields.defaultPrice') || 'Базова ціна'}</th>
                      <th>{t('positionTypes.form.fields.priceWeekday') || 'Ціна (будні)'}</th>
                      <th>{t('positionTypes.form.fields.priceWeekend') || 'Ціна (вихідні)'}</th>
                      <th>{t('positionTypes.form.fields.defaultDeposit') || 'Базовий депозит'}</th>
                      <th>{t('positionTypes.form.fields.depositWeekday') || 'Деп. (будні)'}</th>
                      <th>{t('positionTypes.form.fields.depositWeekend') || 'Деп. (вихідні)'}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPositionTypes.map((pt) => {
                      const isSaving = savingTypeIds.includes(pt.id);
                      return (
                        <tr key={pt.id}>
                          <td><strong>{pt.value}</strong></td>
                          <td>{localizeField(pt.name, language) || '—'}</td>
                          <td>
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--color-surface-alt, #f3f4f6)', color: 'var(--color-text-muted)' }}>
                              {t(`positionTypes.bookingKind.${pt.bookingKind}`) || pt.bookingKind}
                            </span>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pt.defaultPrice != null ? pt.defaultPrice : ''}
                              onChange={(e) => handleTypePriceChange(pt.id, 'defaultPrice', e.target.value)}
                              placeholder="—"
                              style={{ width: '100%', maxWidth: 80, fontSize: 12, padding: '2px 6px', height: 26 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pt.priceWeekday != null ? pt.priceWeekday : ''}
                              onChange={(e) => handleTypePriceChange(pt.id, 'priceWeekday', e.target.value)}
                              placeholder="—"
                              style={{ width: '100%', maxWidth: 80, fontSize: 12, padding: '2px 6px', height: 26 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pt.priceWeekend != null ? pt.priceWeekend : ''}
                              onChange={(e) => handleTypePriceChange(pt.id, 'priceWeekend', e.target.value)}
                              placeholder="—"
                              style={{ width: '100%', maxWidth: 80, fontSize: 12, padding: '2px 6px', height: 26 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pt.defaultDeposit != null ? pt.defaultDeposit : ''}
                              onChange={(e) => handleTypePriceChange(pt.id, 'defaultDeposit', e.target.value)}
                              placeholder="—"
                              style={{ width: '100%', maxWidth: 80, fontSize: 12, padding: '2px 6px', height: 26 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pt.depositWeekday != null ? pt.depositWeekday : ''}
                              onChange={(e) => handleTypePriceChange(pt.id, 'depositWeekday', e.target.value)}
                              placeholder="—"
                              style={{ width: '100%', maxWidth: 80, fontSize: 12, padding: '2px 6px', height: 26 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pt.depositWeekend != null ? pt.depositWeekend : ''}
                              onChange={(e) => handleTypePriceChange(pt.id, 'depositWeekend', e.target.value)}
                              placeholder="—"
                              style={{ width: '100%', maxWidth: 80, fontSize: 12, padding: '2px 6px', height: 26 }}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-small btn-primary"
                              disabled={isSaving}
                              onClick={() => savePositionTypePrices(pt)}
                              style={{ padding: '2px 8px', fontSize: 11 }}
                            >
                              {isSaving ? t('positionTypes.form.saving') : t('common.save')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>

        <details className="admin-collapsible" open>
          <summary>{t('positions.title')}</summary>
          <div className="admin-collapsible-content">
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
                  <option value="price">{t('positions.bulk.setPrice')}</option>
                  <option value="zone">{t('positions.bulk.setZone')}</option>
                  <option value="bookingKind">{t('positions.bulk.setBookingKind')}</option>
                  <option value="active">{t('positions.bulk.setActive')}</option>
                </select>
                {bulkAction === 'deposit' || bulkAction === 'price' ? (
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
            ) : !filteredPositions.length ? (
              <p className="muted">{t('positions.empty')}</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPositions.map((row) => (
                      <Fragment key={row.id}>
                        <tr className={editId === row.id ? 'row-editing' : ''}>
                          {columns.map((column) => (
                            <td key={`${row.id}-${column.key}`}>
                              {column.render ? column.render(row) : localizeField(row[column.key], language) || '—'}
                            </td>
                          ))}
                        </tr>
                        {editId === row.id ? (
                          <tr className="inline-edit-row">
                            <td colSpan={columns.length} style={{ padding: '8px 16px', background: 'var(--color-surface-alt, #f9fafb)' }}>
                              <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>
                                  {t('positions.editing')} — <span style={{ fontFamily: 'monospace' }}>{row.code}</span>
                                </div>
                                {renderFormFields()}
                                <div className="actions" style={{ display: 'flex', gap: 8 }}>
                                  <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? t('positions.saving') : t('common.save')}
                                  </button>
                                  <button type="button" className="btn btn-secondary" onClick={cancelEdit}>{t('positionTypes.form.cancel')}</button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      </PageContainer>
    </AdminLayout>
  );
}
