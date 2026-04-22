import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import DataTable from '../components/DataTable';
import { apiRequest, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const ITEM_FORM_DEFAULT = {
  categoryId: '',
  name: { ua: '', ru: '', en: '' },
  description: { ua: '', ru: '', en: '' },
  price: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
  isAvailable: true
};

const CATEGORY_FORM_DEFAULT = {
  name: { ua: '', ru: '', en: '' },
  slug: '',
  section: 'KITCHEN',
  sortOrder: 0,
  isActive: true
};

export default function MenuEditorPage() {
  const { t, language } = useAdminI18n();
  const [menuState, setMenuState] = useState({ loading: true, error: '', categories: [], items: [] });
  const [itemForm, setItemForm] = useState(ITEM_FORM_DEFAULT);
  const [itemEditId, setItemEditId] = useState(null);
  const [categoryForm, setCategoryForm] = useState(CATEGORY_FORM_DEFAULT);
  const [categoryEditId, setCategoryEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadMenuData() {
    setMenuState((c) => ({ ...c, loading: true }));
    try {
      const [catRes, itemRes] = await Promise.all([
        apiRequest('/api/admin/menu/categories'),
        apiRequest('/api/admin/menu/items')
      ]);
      setMenuState({
        loading: false,
        error: '',
        categories: catRes.body || [],
        items: itemRes.body || []
      });
    } catch (err) {
      setMenuState({ loading: false, error: 'Failed to load menu data', categories: [], items: [] });
    }
  }

  useEffect(() => { loadMenuData(); }, []);

  const saveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = categoryEditId ? 'PATCH' : 'POST';
    const path = categoryEditId ? `/api/admin/menu/categories/${categoryEditId}` : '/api/admin/menu/categories';
    
    const res = await apiRequest(path, { method, body: JSON.stringify(categoryForm) });
    setSaving(false);
    if (res.response.ok) {
      setCategoryForm(CATEGORY_FORM_DEFAULT);
      setCategoryEditId(null);
      loadMenuData();
    } else {
      alert(res.body.message || 'Error saving category');
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = itemEditId ? 'PATCH' : 'POST';
    const path = itemEditId ? `/api/admin/menu/items/${itemEditId}` : '/api/admin/menu/items';
    
    const res = await apiRequest(path, { method, body: JSON.stringify(itemForm) });
    setSaving(false);
    if (res.response.ok) {
      setItemForm(ITEM_FORM_DEFAULT);
      setItemEditId(null);
      loadMenuData();
    } else {
      alert(res.body.message || 'Error saving item');
    }
  };

  const deleteCategory = async (id, name) => {
    if (!window.confirm(`Видалити категорію "${localizeField(name, language)}"?`)) return;
    await apiRequest(`/api/admin/menu/categories/${id}`, { method: 'DELETE' });
    loadMenuData();
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Видалити страву "${localizeField(name, language)}"?`)) return;
    await apiRequest(`/api/admin/menu/items/${id}`, { method: 'DELETE' });
    loadMenuData();
  };

  const categoryColumns = [
    { key: 'name', label: 'Категорія', render: (row) => <strong>{localizeField(row.name, language)}</strong> },
    { key: 'section', label: 'Розділ' },
    { key: 'sortOrder', label: 'Порядок' },
    { key: 'actions', label: 'Дії', render: (row) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-small btn-secondary" onClick={() => {
          setCategoryEditId(row.id);
          setCategoryForm({ ...row.name ? row : { ...row, name: { ua: row.name, ru: '', en: '' } } });
        }}>Ред.</button>
        <button className="btn btn-small btn-danger" onClick={() => deleteCategory(row.id, row.name)}>Вид.</button>
      </div>
    )}
  ];

  const itemColumns = [
    { key: 'name', label: 'Назва', render: (row) => <span>{localizeField(row.name, language)}</span> },
    { key: 'price', label: 'Ціна', render: (row) => `${row.price} ₴` },
    { key: 'category', label: 'Категорія', render: (row) => localizeField(row.category?.name, language) },
    { key: 'actions', label: 'Дії', render: (row) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-small btn-secondary" onClick={() => {
          setItemEditId(row.id);
          setItemForm({ 
            ...row, 
            name: typeof row.name === 'object' ? { ...row.name } : { ua: row.name, ru: '', en: '' },
            description: typeof row.description === 'object' ? { ...row.description } : { ua: row.description, ru: '', en: '' }
          });
        }}>Ред.</button>
        <button className="btn btn-small btn-danger" onClick={() => deleteItem(row.id, row.name)}>Вид.</button>
      </div>
    )}
  ];

  return (
    <AdminLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Categories Section */}
        <div>
          <PageCard title="Категорії меню">
            <DataTable columns={categoryColumns} rows={menuState.categories} emptyText="Немає категорій" />
            
            <form onSubmit={saveCategory} style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 24 }}>
              <h4>{categoryEditId ? 'Редагувати категорію' : 'Додати категорію'}</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <input value={categoryForm.name.ua} onChange={e => setCategoryForm({...categoryForm, name: {...categoryForm.name, ua: e.target.value}})} placeholder="Назва UA" required />
                <input value={categoryForm.name.ru} onChange={e => setCategoryForm({...categoryForm, name: {...categoryForm.name, ru: e.target.value}})} placeholder="Назва RU (Авто)" />
                <input value={categoryForm.name.en} onChange={e => setCategoryForm({...categoryForm, name: {...categoryForm.name, en: e.target.value}})} placeholder="Назва EN (Авто)" />
                <select value={categoryForm.section} onChange={e => setCategoryForm({...categoryForm, section: e.target.value})}>
                  <option value="KITCHEN">Кухня</option>
                  <option value="BAR">Бар</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={saving}>Зберегти категорію</button>
                {categoryEditId && <button type="button" className="btn btn-secondary" onClick={() => { setCategoryEditId(null); setCategoryForm(CATEGORY_FORM_DEFAULT); }}>Скасувати</button>}
              </div>
            </form>
          </PageCard>
        </div>

        {/* Items Section */}
        <div>
          <PageCard title="Страви та напої">
            <DataTable columns={itemColumns} rows={menuState.items} emptyText="Немає страв" />

            <form onSubmit={saveItem} style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 24 }}>
              <h4>{itemEditId ? 'Редагувати страву' : 'Додати страву'}</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <select value={itemForm.categoryId} onChange={e => setItemForm({...itemForm, categoryId: e.target.value})} required>
                  <option value="">Оберіть категорію</option>
                  {menuState.categories.map(c => <option key={c.id} value={c.id}>{localizeField(c.name, language)}</option>)}
                </select>
                
                <input value={itemForm.name.ua} onChange={e => setItemForm({...itemForm, name: {...itemForm.name, ua: e.target.value}})} placeholder="Назва UA" required />
                <input value={itemForm.name.ru} onChange={e => setItemForm({...itemForm, name: {...itemForm.name, ru: e.target.value}})} placeholder="Назва RU (Авто)" />
                <input value={itemForm.name.en} onChange={e => setItemForm({...itemForm, name: {...itemForm.name, en: e.target.value}})} placeholder="Назва EN (Авто)" />
                
                <textarea value={itemForm.description.ua} onChange={e => setItemForm({...itemForm, description: {...itemForm.description, ua: e.target.value}})} placeholder="Опис UA" />
                <textarea value={itemForm.description.ru} onChange={e => setItemForm({...itemForm, description: {...itemForm.description, ru: e.target.value}})} placeholder="Опис RU (Авто)" />
                <textarea value={itemForm.description.en} onChange={e => setItemForm({...itemForm, description: {...itemForm.description, en: e.target.value}})} placeholder="Опис EN (Авто)" />
                
                <input value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} placeholder="Ціна" type="number" step="0.01" required />
                
                <button type="submit" className="btn btn-primary" disabled={saving}>Зберегти страву</button>
                {itemEditId && <button type="button" className="btn btn-secondary" onClick={() => { setItemEditId(null); setItemForm(ITEM_FORM_DEFAULT); }}>Скасувати</button>}
              </div>
            </form>
          </PageCard>
        </div>

      </div>
    </AdminLayout>
  );
}
