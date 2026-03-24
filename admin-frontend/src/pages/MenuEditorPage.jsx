import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const CATEGORY_FORM_DEFAULT = {
  name: '',
  slug: '',
  sortOrder: '0',
  isActive: true
};

const ITEM_FORM_DEFAULT = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  sortOrder: '0',
  isActive: true,
  isAvailable: true
};

function emptyState(value) {
  return value || '—';
}

function MenuStatusToggle({ checked, onChange, activeLabel, inactiveLabel }) {
  return (
    <button
      type="button"
      className={`toggle-chip ${checked ? 'on' : ''}`}
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className="toggle-chip-dot" />
      {checked ? activeLabel : inactiveLabel}
    </button>
  );
}

export default function MenuEditorPage() {
  const { t } = useAdminI18n();
  const [menuState, setMenuState] = useState({ loading: true, error: '', categories: [], items: [] });
  const [categoryForm, setCategoryForm] = useState(CATEGORY_FORM_DEFAULT);
  const [itemForm, setItemForm] = useState(ITEM_FORM_DEFAULT);
  const [categoryEditId, setCategoryEditId] = useState(null);
  const [itemEditId, setItemEditId] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [feedback, setFeedback] = useState({ tone: '', message: '' });

  const activeCategoryCount = useMemo(
    () => menuState.categories.filter((category) => category.isActive).length,
    [menuState.categories]
  );
  const visibleItemCount = useMemo(
    () => menuState.items.filter((item) => item.isActive).length,
    [menuState.items]
  );
  const availableItemCount = useMemo(
    () => menuState.items.filter((item) => item.isAvailable).length,
    [menuState.items]
  );

  async function loadMenuEditor() {
    setMenuState((current) => ({ ...current, loading: true, error: '' }));

    try {
      const [categoriesResult, itemsResult] = await Promise.all([
        apiRequest('/api/admin/menu/categories'),
        apiRequest('/api/admin/menu/items')
      ]);

      if (!categoriesResult.response.ok) {
        throw new Error(categoriesResult.body.message || t('menuAdmin.errors.load'));
      }

      if (!itemsResult.response.ok) {
        throw new Error(itemsResult.body.message || t('menuAdmin.errors.load'));
      }

      const categories = Array.isArray(categoriesResult.body) ? categoriesResult.body : [];
      const items = Array.isArray(itemsResult.body) ? itemsResult.body : [];
      setMenuState({ loading: false, error: '', categories, items });

      setItemForm((current) => ({
        ...current,
        categoryId: current.categoryId || String(categories[0]?.id || '')
      }));
    } catch (error) {
      setMenuState({ loading: false, error: error.message || t('menuAdmin.errors.load'), categories: [], items: [] });
    }
  }

  useEffect(() => {
    loadMenuEditor();
  }, [t]);

  function resetCategoryForm() {
    setCategoryEditId(null);
    setCategoryForm(CATEGORY_FORM_DEFAULT);
  }

  function resetItemForm(defaultCategoryId = '') {
    setItemEditId(null);
    setItemForm({
      ...ITEM_FORM_DEFAULT,
      categoryId: defaultCategoryId || String(menuState.categories[0]?.id || '')
    });
  }

  function startCategoryEdit(category) {
    setCategoryEditId(category.id);
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      sortOrder: String(category.sortOrder ?? 0),
      isActive: Boolean(category.isActive)
    });
  }

  function startItemEdit(item) {
    setItemEditId(item.id);
    setItemForm({
      categoryId: String(item.categoryId || item.category?.id || ''),
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      imageUrl: item.imageUrl || '',
      sortOrder: String(item.sortOrder ?? 0),
      isActive: Boolean(item.isActive),
      isAvailable: Boolean(item.isAvailable)
    });
  }

  async function submitCategory(event) {
    event.preventDefault();
    setSavingKey('category-form');
    setFeedback({ tone: '', message: '' });

    const method = categoryEditId ? 'PATCH' : 'POST';
    const path = categoryEditId
      ? `/api/admin/menu/categories/${categoryEditId}`
      : '/api/admin/menu/categories';

    const { response, body } = await apiRequest(path, {
      method,
      body: JSON.stringify({
        ...categoryForm,
        sortOrder: Number(categoryForm.sortOrder)
      })
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveCategory') });
      return;
    }

    await loadMenuEditor();
    resetCategoryForm();
    setSavingKey('');
    setFeedback({
      tone: 'success',
      message: categoryEditId ? t('menuAdmin.feedback.categoryUpdated') : t('menuAdmin.feedback.categoryCreated')
    });
  }

  async function submitItem(event) {
    event.preventDefault();
    setSavingKey('item-form');
    setFeedback({ tone: '', message: '' });

    const method = itemEditId ? 'PATCH' : 'POST';
    const path = itemEditId ? `/api/admin/menu/items/${itemEditId}` : '/api/admin/menu/items';

    const { response, body } = await apiRequest(path, {
      method,
      body: JSON.stringify({
        ...itemForm,
        categoryId: Number(itemForm.categoryId),
        price: Number(itemForm.price),
        sortOrder: Number(itemForm.sortOrder)
      })
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveItem') });
      return;
    }

    await loadMenuEditor();
    resetItemForm(itemForm.categoryId);
    setSavingKey('');
    setFeedback({
      tone: 'success',
      message: itemEditId ? t('menuAdmin.feedback.itemUpdated') : t('menuAdmin.feedback.itemCreated')
    });
  }

  async function handleItemImageUpload(file) {
    if (!file) {
      return;
    }

    setUploadingItemImage(true);
    setFeedback({ tone: '', message: '' });

    const payload = new FormData();
    payload.append('image', file);
    payload.append('folder', 'menu');

    const { response, body } = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: payload
    });

    setUploadingItemImage(false);

    if (!response.ok) {
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.uploadItemImage') });
      return;
    }

    setItemForm((current) => ({ ...current, imageUrl: body.url || '' }));
    setFeedback({ tone: 'success', message: t('menuAdmin.feedback.itemImageUploaded') });
  }

  async function removeCategory(category) {
    if (!window.confirm(t('menuAdmin.confirmDeleteCategory', { name: category.name }))) {
      return;
    }

    setSavingKey(`delete-category-${category.id}`);
    const { response, body } = await apiRequest(`/api/admin/menu/categories/${category.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.deleteCategory') });
      return;
    }

    await loadMenuEditor();
    if (categoryEditId === category.id) {
      resetCategoryForm();
    }
    setSavingKey('');
    setFeedback({ tone: 'success', message: t('menuAdmin.feedback.categoryDeleted') });
  }

  async function removeItem(item) {
    if (!window.confirm(t('menuAdmin.confirmDeleteItem', { name: item.name }))) {
      return;
    }

    setSavingKey(`delete-item-${item.id}`);
    const { response, body } = await apiRequest(`/api/admin/menu/items/${item.id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.deleteItem') });
      return;
    }

    await loadMenuEditor();
    if (itemEditId === item.id) {
      resetItemForm(String(menuState.categories[0]?.id || ''));
    }
    setSavingKey('');
    setFeedback({ tone: 'success', message: t('menuAdmin.feedback.itemDeleted') });
  }

  async function patchCategory(categoryId, patch, successMessage) {
    setSavingKey(`category-toggle-${categoryId}`);
    const { response, body } = await apiRequest(`/api/admin/menu/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveCategory') });
      return;
    }

    await loadMenuEditor();
    setSavingKey('');
    setFeedback({ tone: 'success', message: successMessage });
  }

  async function patchItem(itemId, patch, successMessage) {
    setSavingKey(`item-toggle-${itemId}`);
    const { response, body } = await apiRequest(`/api/admin/menu/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveItem') });
      return;
    }

    await loadMenuEditor();
    setSavingKey('');
    setFeedback({ tone: 'success', message: successMessage });
  }

  const itemsByCategory = useMemo(
    () => menuState.categories.map((category) => ({
      ...category,
      items: menuState.items.filter((item) => item.categoryId === category.id)
    })),
    [menuState.categories, menuState.items]
  );

  return (
    <AdminLayout>
      <PageContainer
        title={t('menuAdmin.title')}
        description={t('menuAdmin.description')}
        actions={<button type="button" className="btn btn-secondary" onClick={loadMenuEditor}>{t('menuAdmin.refresh')}</button>}
      >
        <section className="page-hero compact">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('menuAdmin.eyebrow')}</span>
            <h3>{t('menuAdmin.heroTitle')}</h3>
            <p className="muted">{t('menuAdmin.heroDescription')}</p>
          </div>
          <div className="hero-stat-grid mini menu-admin-stat-grid">
            <article className="hero-stat-card accent">
              <strong>{menuState.loading ? '—' : menuState.categories.length}</strong>
              <span className="muted">{t('menuAdmin.stats.categories')}</span>
            </article>
            <article className="hero-stat-card">
              <strong>{menuState.loading ? '—' : visibleItemCount}</strong>
              <span className="muted">{t('menuAdmin.stats.visibleItems')}</span>
            </article>
            <article className="hero-stat-card">
              <strong>{menuState.loading ? '—' : availableItemCount}</strong>
              <span className="muted">{t('menuAdmin.stats.availableItems')}</span>
            </article>
          </div>
        </section>

        {feedback.message ? <p className={`form-state menu-admin-feedback is-${feedback.tone || 'success'}`}>{feedback.message}</p> : null}
        {menuState.error ? <p className="error">{menuState.error}</p> : null}

        <section className="menu-admin-grid">
          <PanelCard
            title={categoryEditId ? t('menuAdmin.editCategoryTitle') : t('menuAdmin.newCategoryTitle')}
            subtitle={t('menuAdmin.categoryFormSubtitle')}
            className="surface-muted"
            actions={categoryEditId ? <button type="button" className="btn btn-secondary btn-small" onClick={resetCategoryForm}>{t('menuAdmin.cancelEdit')}</button> : null}
          >
            <form className="admin-form-grid" onSubmit={submitCategory}>
              <label>
                {t('menuAdmin.fields.categoryName')}
                <input
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t('menuAdmin.placeholders.categoryName')}
                  required
                />
              </label>
              <label>
                {t('menuAdmin.fields.categorySlug')}
                <input
                  value={categoryForm.slug}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder={t('menuAdmin.placeholders.categorySlug')}
                />
              </label>
              <label>
                {t('menuAdmin.fields.sortOrder')}
                <input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span>{t('menuAdmin.fields.visibleOnSite')}</span>
              </label>
              <div className="actions wrap-mobile">
                <button type="submit" className="btn" disabled={savingKey === 'category-form'}>
                  {savingKey === 'category-form' ? t('menuAdmin.saving') : categoryEditId ? t('menuAdmin.actions.saveCategory') : t('menuAdmin.actions.addCategory')}
                </button>
              </div>
            </form>
          </PanelCard>

          <PanelCard
            title={itemEditId ? t('menuAdmin.editItemTitle') : t('menuAdmin.newItemTitle')}
            subtitle={t('menuAdmin.itemFormSubtitle')}
            className="surface-muted"
            actions={itemEditId ? <button type="button" className="btn btn-secondary btn-small" onClick={() => resetItemForm(itemForm.categoryId)}>{t('menuAdmin.cancelEdit')}</button> : null}
          >
            <form className="admin-form-grid" onSubmit={submitItem}>
              <label>
                {t('menuAdmin.fields.category')}
                <select
                  value={itemForm.categoryId}
                  onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))}
                  required
                >
                  <option value="">{t('menuAdmin.selectCategory')}</option>
                  {menuState.categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('menuAdmin.fields.itemName')}
                <input
                  value={itemForm.name}
                  onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t('menuAdmin.placeholders.itemName')}
                  required
                />
              </label>
              <label className="admin-form-span-2">
                {t('menuAdmin.fields.description')}
                <input
                  value={itemForm.description}
                  onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder={t('menuAdmin.placeholders.description')}
                />
              </label>
              <label>
                {t('menuAdmin.fields.price')}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(event) => setItemForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="0.00"
                  required
                />
              </label>
              <label>
                {t('menuAdmin.fields.sortOrder')}
                <input
                  type="number"
                  value={itemForm.sortOrder}
                  onChange={(event) => setItemForm((current) => ({ ...current, sortOrder: event.target.value }))}
                />
              </label>
              <label className="admin-form-span-2">
                {t('menuAdmin.fields.imageUrl')}
                <input
                  value={itemForm.imageUrl}
                  onChange={(event) => setItemForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="admin-form-span-2">
                {t('menuAdmin.fields.uploadImage')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingItemImage}
                  onChange={(event) => {
                    const [file] = event.target.files || [];
                    handleItemImageUpload(file);
                    event.target.value = '';
                  }}
                />
              </label>
              <div className="menu-admin-inline-toggles admin-form-span-2">
                <label className="checkbox-row compact-row">
                  <input
                    type="checkbox"
                    checked={itemForm.isActive}
                    onChange={(event) => setItemForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>{t('menuAdmin.fields.visibleOnSite')}</span>
                </label>
                <label className="checkbox-row compact-row">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(event) => setItemForm((current) => ({ ...current, isAvailable: event.target.checked }))}
                  />
                  <span>{t('menuAdmin.fields.availableNow')}</span>
                </label>
              </div>
              <div className="actions wrap-mobile admin-form-span-2">
                <button type="submit" className="btn" disabled={savingKey === 'item-form' || uploadingItemImage || !menuState.categories.length}>
                  {savingKey === 'item-form' ? t('menuAdmin.saving') : itemEditId ? t('menuAdmin.actions.saveItem') : t('menuAdmin.actions.addItem')}
                </button>
              </div>
            </form>
          </PanelCard>
        </section>

        <section className="grid-summary">
          <article className="metric-card">
            <p className="muted">{t('menuAdmin.stats.activeCategories')}</p>
            <strong>{menuState.loading ? '—' : activeCategoryCount}</strong>
          </article>
          <article className="metric-card">
            <p className="muted">{t('menuAdmin.stats.totalItems')}</p>
            <strong>{menuState.loading ? '—' : menuState.items.length}</strong>
          </article>
          <article className="metric-card">
            <p className="muted">{t('menuAdmin.stats.stopList')}</p>
            <strong>{menuState.loading ? '—' : menuState.items.length - availableItemCount}</strong>
          </article>
        </section>

        <section className="menu-admin-grid menu-admin-list-grid">
          <PanelCard title={t('menuAdmin.categoriesListTitle')} subtitle={t('menuAdmin.categoriesListSubtitle')}>
            {!menuState.categories.length ? <p className="muted">{t('menuAdmin.emptyCategories')}</p> : null}
            <div className="menu-admin-stack">
              {menuState.categories.map((category) => (
                <article key={category.id} className="menu-admin-card">
                  <div className="menu-admin-card-head">
                    <div>
                      <strong>{category.name}</strong>
                      <p className="muted small">/{category.slug} · {category.itemsCount} {t('menuAdmin.itemsCountSuffix')}</p>
                    </div>
                    <MenuStatusToggle
                      checked={category.isActive}
                      onChange={() => patchCategory(category.id, { isActive: !category.isActive }, t('menuAdmin.feedback.categoryVisibilityUpdated'))}
                      activeLabel={t('menuAdmin.visible')}
                      inactiveLabel={t('menuAdmin.hidden')}
                    />
                  </div>
                  <div className="menu-admin-card-meta muted small">
                    <span>{t('menuAdmin.fields.sortOrder')}: {category.sortOrder}</span>
                  </div>
                  <div className="actions wrap-mobile">
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => startCategoryEdit(category)}>{t('menuAdmin.actions.edit')}</button>
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      disabled={savingKey === `delete-category-${category.id}`}
                      onClick={() => removeCategory(category)}
                    >
                      {t('menuAdmin.actions.delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </PanelCard>

          <PanelCard title={t('menuAdmin.itemsListTitle')} subtitle={t('menuAdmin.itemsListSubtitle')}>
            {!itemsByCategory.some((category) => category.items.length) ? <p className="muted">{t('menuAdmin.emptyItems')}</p> : null}
            <div className="menu-admin-stack">
              {itemsByCategory.map((category) => (
                <section key={category.id} className="menu-admin-group">
                  <header className="menu-admin-group-head">
                    <div>
                      <h4>{category.name}</h4>
                      <p className="muted small">{category.items.length} {t('menuAdmin.itemsCountSuffix')}</p>
                    </div>
                  </header>
                  {!category.items.length ? <p className="muted small">{t('menuAdmin.emptyCategoryItems')}</p> : null}
                  <div className="menu-admin-stack compact-stack">
                    {category.items.map((item) => (
                      <article key={item.id} className="menu-admin-card item-card">
                        <div className="menu-admin-card-head">
                          <div>
                            <strong>{item.name}</strong>
                            <p className="muted small">{emptyState(item.description)}</p>
                          </div>
                          <strong>{item.price} ₴</strong>
                        </div>
                        <div className="menu-admin-card-meta muted small menu-admin-chip-row">
                          <span className="mini-chip">#{item.sortOrder}</span>
                          <MenuStatusToggle
                            checked={item.isActive}
                            onChange={() => patchItem(item.id, { isActive: !item.isActive }, t('menuAdmin.feedback.itemVisibilityUpdated'))}
                            activeLabel={t('menuAdmin.visible')}
                            inactiveLabel={t('menuAdmin.hidden')}
                          />
                          <MenuStatusToggle
                            checked={item.isAvailable}
                            onChange={() => patchItem(item.id, { isAvailable: !item.isAvailable }, t('menuAdmin.feedback.itemAvailabilityUpdated'))}
                            activeLabel={t('menuAdmin.available')}
                            inactiveLabel={t('menuAdmin.stopListLabel')}
                          />
                        </div>
                        <div className="menu-admin-card-meta muted small">
                          <span>{emptyState(item.imageUrl)}</span>
                        </div>
                        <div className="actions wrap-mobile">
                          <button type="button" className="btn btn-secondary btn-small" onClick={() => startItemEdit(item)}>{t('menuAdmin.actions.edit')}</button>
                          <button
                            type="button"
                            className="btn btn-danger btn-small"
                            disabled={savingKey === `delete-item-${item.id}`}
                            onClick={() => removeItem(item)}
                          >
                            {t('menuAdmin.actions.delete')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </PanelCard>
        </section>
      </PageContainer>
    </AdminLayout>
  );
}
