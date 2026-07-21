import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';

const VALID_ROLES = ['seo_smm', 'hostess', 'admin', 'manager', 'owner'];
const ADMIN_ROLES = ['admin', 'manager', 'owner'];

export default function UsersPage() {
  const { user } = useAuth();
  const { t } = useAdminI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', role: 'admin' });
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { response, body } = await apiRequest('/api/admin/users');
      if (response.ok) {
        setUsers(body.users);
      } else {
        setError(body.message || t('common.loadFailed'));
      }
    } catch {
      setError(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const { response, body } = await apiRequest('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (response.ok) {
        setShowCreate(false);
        setForm({ email: '', password: '', role: 'admin' });
        fetchUsers();
      } else {
        setError(body.message || t('common.failed'));
      }
    } catch {
      setError(t('common.failed'));
    }
  }

  async function handleUpdate(id, data) {
    setError('');
    try {
      const { response, body } = await apiRequest(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setEditingId(null);
        fetchUsers();
      } else {
        setError(body.message || t('common.failed'));
      }
    } catch {
      setError(t('common.failed'));
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('users.confirmDelete'))) return;
    setError('');
    try {
      const { response, body } = await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        fetchUsers();
      } else {
        setError(body.message || t('common.failed'));
      }
    } catch {
      setError(t('common.failed'));
    }
  }

  if (!ADMIN_ROLES.includes(user?.role)) {
    return (
      <AdminLayout>
        <PageContainer title={t('users.title')}>
          <p className="card">{t('common.noAccess')}</p>
        </PageContainer>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <PageContainer title={t('users.title')}><p className="card">{t('common.loading')}</p></PageContainer>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageContainer title={t('users.title')}>
        {error && <div className="status-pill status-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate((prev) => !prev)}>
          {showCreate ? t('users.cancel') : t('users.createNew')}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ flex: 1, minWidth: 180 }}>
            <span>{t('users.email')}</span>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
          </label>
          <label style={{ flex: 1, minWidth: 140 }}>
            <span>{t('users.password')}</span>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
          </label>
          <label style={{ width: 140 }}>
            <span>{t('users.role')}</span>
            <select className="input" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
              {VALID_ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }}>{t('users.create')}</button>
        </form>
      )}

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>{t('common.id')}</th>
              <th>{t('users.email')}</th>
              <th>{t('users.role')}</th>
              <th>{t('users.createdAt')}</th>
              <th>{t('users.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  {editingId === user.id ? (
                    <input type="email" className="input" defaultValue={user.email} id={`email-${user.id}`} style={{ width: 200 }} />
                  ) : (
                    user.email
                  )}
                </td>
                <td>
                  {editingId === user.id ? (
                    <select className="input" defaultValue={user.role} id={`role-${user.id}`}>
                      {VALID_ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                    </select>
                  ) : (
                    <span className="status-pill">{t(`roles.${user.role}`)}</span>
                  )}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {new Date(user.createdAt).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' })}
                </td>
                <td>
                  {editingId === user.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        const email = document.getElementById(`email-${user.id}`).value;
                        const role = document.getElementById(`role-${user.id}`).value;
                        handleUpdate(user.id, { email, role });
                      }}>{t('users.save')}</button>
                      <button className="btn btn-sm" onClick={() => setEditingId(null)}>{t('users.cancel')}</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => setEditingId(user.id)}>{t('users.edit')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>{t('users.delete')}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </PageContainer>
    </AdminLayout>
  );
}
