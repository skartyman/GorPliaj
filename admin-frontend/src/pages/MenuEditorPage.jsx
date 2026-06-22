import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import { apiRequest, localizeField, normalizeLocalizedField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const EMPTY_LOCALIZED = { ua: '', ru: '', en: '' };

function ActionIcon({ type }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true
  };

  if (type === 'edit') {
    return <svg {...commonProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
  }
  if (type === 'eye') {
    return <svg {...commonProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
  }
  if (type === 'eye-off') {
    return <svg {...commonProps}><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a17.2 17.2 0 0 1-2 3.1" /><path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9" /></svg>;
  }
  if (type === 'stop') {
    return <svg {...commonProps}><path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z" /><path d="M9 9h6v6H9z" /></svg>;
  }
  if (type === 'check') {
    return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  }
  if (type === 'add') {
    return <svg {...commonProps}><path d="M12 5v14M5 12h14" /></svg>;
  }
  return <svg {...commonProps}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></svg>;
}

const CATEGORY_FORM_DEFAULT = {
  name: EMPTY_LOCALIZED,
  slug: '',
  section: 'KITCHEN',
  sortOrder: 0,
  isActive: true
};

const ITEM_FORM_DEFAULT = {
  categoryId: '',
  name: EMPTY_LOCALIZED,
  description: EMPTY_LOCALIZED,
  price: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
  isAvailable: true
};

function cloneLocalized(value) {
  return { ...normalizeLocalizedField(value) };
}

function buildCategoryForm(category) {
  return {
    name: cloneLocalized(category?.name),
    slug: category?.slug || '',
    section: category?.section || 'KITCHEN',
    sortOrder: Number(category?.sortOrder || 0),
    isActive: category?.isActive !== false
  };
}

function buildItemForm(item) {
  return {
    categoryId: String(item?.categoryId || item?.category?.id || ''),
    name: cloneLocalized(item?.name),
    description: cloneLocalized(item?.description),
    price: item?.price ?? '',
    imageUrl: item?.imageUrl || '',
    sortOrder: Number(item?.sortOrder || 0),
    isActive: item?.isActive !== false,
    isAvailable: item?.isAvailable !== false
  };
}

function createEmptyItemForm(categoryId = '') {
  return {
    ...ITEM_FORM_DEFAULT,
    name: { ...EMPTY_LOCALIZED },
    description: { ...EMPTY_LOCALIZED },
    categoryId: categoryId ? String(categoryId) : ''
  };
}

function createEmptyCategoryForm() {
  return {
    ...CATEGORY_FORM_DEFAULT,
    name: { ...EMPTY_LOCALIZED }
  };
}

function mergeExpandedState(categories, current) {
  const next = {};
  categories.forEach((category) => {
    const key = String(category.id);
    next[key] = Object.prototype.hasOwnProperty.call(current, key) ? current[key] : true;
  });
  return next;
}

function formatPrice(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(number);
}

export default function MenuEditorPage() {
  const { t, language } = useAdminI18n();
  const [menuState, setMenuState] = useState({ loading: true, error: '', categories: [], items: [] });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [categoryForm, setCategoryForm] = useState(createEmptyCategoryForm);
  const [categoryEditId, setCategoryEditId] = useState(null);
  const [itemForm, setItemForm] = useState(createEmptyItemForm);
  const [itemEditId, setItemEditId] = useState(null);
  const [savingKey, setSavingKey] = useState('');
  const [uploadState, setUploadState] = useState({ status: 'idle', details: '' });
  const [feedback, setFeedback] = useState({ tone: '', message: '' });
  const [translating, setTranslating] = useState({});
  const categoryFormRef = useRef(null);
  const itemFormRef = useRef(null);
  const categoryNameInputRef = useRef(null);
  const itemNameInputRef = useRef(null);

  const categoriesWithItems = useMemo(() => {
    const itemsByCategoryId = new Map();
    menuState.items.forEach((item) => {
      const key = String(item.categoryId);
      if (!itemsByCategoryId.has(key)) itemsByCategoryId.set(key, []);
      itemsByCategoryId.get(key).push(item);
    });

    return menuState.categories.map((category) => ({
      ...category,
      items: (itemsByCategoryId.get(String(category.id)) || []).sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.id - right.id;
      })
    }));
  }, [menuState.categories, menuState.items]);

  const stats = useMemo(() => {
    const categories = menuState.categories.length;
    const activeCategories = menuState.categories.filter((category) => category.isActive).length;
    const totalItems = menuState.items.length;
    const visibleItems = menuState.items.filter((item) => item.isActive).length;
    const availableItems = menuState.items.filter((item) => item.isAvailable).length;
    const stopList = menuState.items.filter((item) => !item.isAvailable).length;
    return { categories, activeCategories, totalItems, visibleItems, availableItems, stopList };
  }, [menuState.categories, menuState.items]);

  async function loadMenuData() {
    setMenuState((current) => ({ ...current, loading: true, error: '' }));

    const [categoriesResult, itemsResult] = await Promise.all([
      apiRequest('/api/admin/menu/categories'),
      apiRequest('/api/admin/menu/items')
    ]);

    if (!categoriesResult.response.ok || !itemsResult.response.ok) {
      setMenuState({
        loading: false,
        error: categoriesResult.body.message || itemsResult.body.message || t('menuAdmin.errors.load'),
        categories: [],
        items: []
      });
      return;
    }

    const categories = Array.isArray(categoriesResult.body) ? categoriesResult.body : [];
    const items = Array.isArray(itemsResult.body) ? itemsResult.body : [];

    setMenuState({ loading: false, error: '', categories, items });
    setExpandedCategories((current) => mergeExpandedState(categories, current));
  }

  useEffect(() => {
    loadMenuData().catch(() => {
      setMenuState({ loading: false, error: t('menuAdmin.errors.load'), categories: [], items: [] });
    });
  }, []);

  function resetCategoryForm() {
    setCategoryEditId(null);
    setCategoryForm(createEmptyCategoryForm());
  }

  function resetItemForm(categoryId = '') {
    setItemEditId(null);
    setItemForm(createEmptyItemForm(categoryId));
    setUploadState({ status: 'idle', details: '' });
  }

  function focusEditor(section) {
    const formNode = section === 'category' ? categoryFormRef.current : itemFormRef.current;
    const inputNode = section === 'category' ? categoryNameInputRef.current : itemNameInputRef.current;

    window.requestAnimationFrame(() => {
      formNode?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        inputNode?.focus();
        inputNode?.select?.();
      }, 180);
    });
  }

  function startCreateCategory() {
    resetCategoryForm();
    focusEditor('category');
  }

  function startEditCategory(category) {
    setCategoryEditId(category.id);
    setCategoryForm(buildCategoryForm(category));
    focusEditor('category');
  }

  function startCreateItem(categoryId = '') {
    resetItemForm(categoryId);
    focusEditor('item');
  }

  function startEditItem(item) {
    setItemEditId(item.id);
    setItemForm(buildItemForm(item));
    setUploadState({ status: 'idle', details: '' });
    focusEditor('item');
  }

  function toggleCategoryExpanded(categoryId) {
    const key = String(categoryId);
    setExpandedCategories((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submitCategory(event) {
    event.preventDefault();
    setSavingKey('category-form');
    setFeedback({ tone: '', message: '' });

    const method = categoryEditId ? 'PATCH' : 'POST';
    const path = categoryEditId ? `/api/admin/menu/categories/${categoryEditId}` : '/api/admin/menu/categories';
    const { response, body } = await apiRequest(path, {
      method,
      body: JSON.stringify(categoryForm)
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveCategory') });
      return;
    }

    await loadMenuData();
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
    const payload = {
      ...itemForm,
      categoryId: Number(itemForm.categoryId),
      price: Number(itemForm.price),
      sortOrder: Number(itemForm.sortOrder || 0)
    };

    const { response, body } = await apiRequest(path, {
      method,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveItem') });
      return;
    }

    const nextCategoryId = itemEditId ? itemForm.categoryId : '';
    await loadMenuData();
    resetItemForm(nextCategoryId);
    setSavingKey('');
    setFeedback({
      tone: 'success',
      message: itemEditId ? t('menuAdmin.feedback.itemUpdated') : t('menuAdmin.feedback.itemCreated')
    });
  }

  async function removeCategory(category) {
    const confirmed = window.confirm(
      t('menuAdmin.confirmDeleteCategory', { name: localizeField(category.name, language) })
    );
    if (!confirmed) return;

    setSavingKey(`delete-category-${category.id}`);
    const { response, body } = await apiRequest(`/api/admin/menu/categories/${category.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.deleteCategory') });
      return;
    }

    await loadMenuData();
    if (categoryEditId === category.id) resetCategoryForm();
    if (String(itemForm.categoryId) === String(category.id)) resetItemForm();
    setSavingKey('');
    setFeedback({ tone: 'success', message: t('menuAdmin.feedback.categoryDeleted') });
  }

  async function removeItem(item) {
    const confirmed = window.confirm(
      t('menuAdmin.confirmDeleteItem', { name: localizeField(item.name, language) })
    );
    if (!confirmed) return;

    setSavingKey(`delete-item-${item.id}`);
    const { response, body } = await apiRequest(`/api/admin/menu/items/${item.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.deleteItem') });
      return;
    }

    await loadMenuData();
    if (itemEditId === item.id) resetItemForm(String(item.categoryId));
    setSavingKey('');
    setFeedback({ tone: 'success', message: t('menuAdmin.feedback.itemDeleted') });
  }

  async function patchCategory(categoryId, patch, successMessage) {
    setSavingKey(`category-${categoryId}`);
    const { response, body } = await apiRequest(`/api/admin/menu/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveCategory') });
      return;
    }

    await loadMenuData();
    setSavingKey('');
    setFeedback({ tone: 'success', message: successMessage });
  }

  async function patchItem(itemId, patch, successMessage) {
    setSavingKey(`item-${itemId}`);
    const { response, body } = await apiRequest(`/api/admin/menu/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      setSavingKey('');
      setFeedback({ tone: 'error', message: body.message || t('menuAdmin.errors.saveItem') });
      return;
    }

    await loadMenuData();
    setSavingKey('');
    setFeedback({ tone: 'success', message: successMessage });
  }

  async function handleItemImageUpload(file) {
    if (!file) return;

    setUploadState({ status: 'uploading', details: file.name });
    const payload = new FormData();
    payload.append('folder', 'menu');
    payload.append('image', file);

    const { response, body } = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: payload
    });

    if (!response.ok || !body.url) {
      setUploadState({
        status: 'error',
        details: body.message || t('menuAdmin.errors.uploadItemImage')
      });
      setFeedback({
        tone: 'error',
        message: body.message || t('menuAdmin.errors.uploadItemImage')
      });
      return;
    }

    setItemForm((current) => ({ ...current, imageUrl: body.url }));
    setUploadState({ status: 'success', details: body.url });
    setFeedback({ tone: 'success', message: t('menuAdmin.feedback.itemImageUploaded') });
  }

  function setLocalizedFieldValue(target, field, locale, value) {
    target((current) => ({
      ...current,
      [field]: {
        ...current[field],
        [locale]: value
      }
    }));
  }

  async function autoTranslateField(formName, field) {
    const isCategory = formName === 'category';
    const source = isCategory ? categoryForm[field]?.ua : itemForm[field]?.ua;

    if (!source?.trim()) {
      setFeedback({ tone: 'error', message: 'Спочатку заповніть поле UA для перекладу.' });
      return;
    }

    const key = `${formName}-${field}`;
    setTranslating((current) => ({ ...current, [key]: true }));

    const { response, body } = await apiRequest('/api/admin/translate', {
      method: 'POST',
      body: JSON.stringify({ text: source, targetLangs: ['ru', 'en'] })
    });

    setTranslating((current) => ({ ...current, [key]: false }));

    if (!response.ok) {
      setFeedback({ tone: 'error', message: body.error || body.message || 'Не вдалося виконати переклад.' });
      return;
    }

    const applyTranslations = (setter) =>
      setter((current) => ({
        ...current,
        [field]: {
          ...current[field],
          ru: body.ru || current[field].ru || '',
          en: body.en || current[field].en || ''
        }
      }));

    applyTranslations(isCategory ? setCategoryForm : setItemForm);
    setFeedback({ tone: 'success', message: 'Переклад оновлено.' });
  }

  const sectionLabel = (section) =>
    section === 'BAR' ? t('menuAdmin.sections.bar') : t('menuAdmin.sections.kitchen');

  return (
    <AdminLayout>
      <PageContainer
        title={t('menuAdmin.title')}
        description={t('menuAdmin.description')}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => loadMenuData()}>
              {t('menuAdmin.refresh')}
            </button>
            <button type="button" className="btn" onClick={startCreateCategory}>
              {t('menuAdmin.actions.addCategory')}
            </button>
          </>
        }
      >
        <div className="metric-compact-grid">
          <div className="metric-compact-item">
            <strong>{stats.categories}</strong>
            <span className="muted">{t('menuAdmin.stats.categories')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.activeCategories}</strong>
            <span className="muted">{t('menuAdmin.stats.activeCategories')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.totalItems}</strong>
            <span className="muted">{t('menuAdmin.stats.totalItems')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.visibleItems}</strong>
            <span className="muted">{t('menuAdmin.stats.visibleItems')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.availableItems}</strong>
            <span className="muted">{t('menuAdmin.stats.availableItems')}</span>
          </div>
          <div className="metric-compact-item">
            <strong>{stats.stopList}</strong>
            <span className="muted">{t('menuAdmin.stats.stopList')}</span>
          </div>
        </div>

        {feedback.message ? (
          <div className={`form-state ${feedback.tone === 'error' ? 'is-error' : 'is-success'}`}>
            {feedback.message}
          </div>
        ) : null}

        {menuState.error ? <p className="error">{menuState.error}</p> : null}
      </PageContainer>

      <div className="grid-two-col menu-admin-layout">
        <PanelCard
          title={t('menuAdmin.categoriesListTitle')}
          subtitle={t('menuAdmin.categoriesListSubtitle')}
        >
          {menuState.loading ? <p className="muted">{t('menuAdmin.refresh')}</p> : null}

          {!menuState.loading && !categoriesWithItems.length ? (
            <p className="muted">{t('menuAdmin.emptyCategories')}</p>
          ) : null}

          <div className="menu-admin-tree">
            {categoriesWithItems.map((category) => {
              const isExpanded = expandedCategories[String(category.id)] !== false;
              return (
                <section key={category.id} className="menu-admin-category">
                  <div className="menu-admin-category-head">
                    <button
                      type="button"
                      className="menu-admin-disclosure"
                      onClick={() => toggleCategoryExpanded(category.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? '-' : '+'}
                    </button>
                    <div className="menu-admin-category-meta">
                      <strong>{localizeField(category.name, language)}</strong>
                      <div className="menu-admin-badges">
                        <span className="status-pill neutral">{sectionLabel(category.section)}</span>
                        <span className={`status-pill ${category.isActive ? 'success' : 'warning'}`}>
                          {category.isActive ? t('menuAdmin.visible') : t('menuAdmin.hidden')}
                        </span>
                        <span className="status-pill neutral">
                          {category.items.length} {t('menuAdmin.itemsCountSuffix')}
                        </span>
                      </div>
                    </div>
                    <div className="menu-admin-actions" aria-label={t('menuAdmin.actions.edit')}>
                      <button type="button" className="menu-action-btn is-add" onClick={() => startCreateItem(category.id)} title={t('menuAdmin.actions.addItem')} aria-label={t('menuAdmin.actions.addItem')}>
                        <ActionIcon type="add" />
                      </button>
                      <button type="button" className="menu-action-btn" onClick={() => startEditCategory(category)} title={t('menuAdmin.actions.edit')} aria-label={t('menuAdmin.actions.edit')}>
                        <ActionIcon type="edit" />
                      </button>
                      <button
                        type="button"
                        className="menu-action-btn"
                        disabled={savingKey === `category-${category.id}`}
                        onClick={() =>
                          patchCategory(category.id, { isActive: !category.isActive }, t('menuAdmin.feedback.categoryVisibilityUpdated'))
                        }
                        title={category.isActive ? t('menuAdmin.hidden') : t('menuAdmin.visible')}
                        aria-label={category.isActive ? t('menuAdmin.hidden') : t('menuAdmin.visible')}
                      >
                        <ActionIcon type={category.isActive ? 'eye-off' : 'eye'} />
                      </button>
                      <button
                        type="button"
                        className="menu-action-btn is-danger"
                        disabled={savingKey === `delete-category-${category.id}`}
                        onClick={() => removeCategory(category)}
                        title={t('menuAdmin.actions.delete')}
                        aria-label={t('menuAdmin.actions.delete')}
                      >
                        <ActionIcon type="delete" />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="menu-admin-items">
                      {!category.items.length ? (
                        <p className="muted">{t('menuAdmin.emptyCategoryItems')}</p>
                      ) : (
                        category.items.map((item) => (
                          <article key={item.id} className="menu-admin-item-row">
                            <div className="menu-admin-item-media">
                              {item.imageUrl ? <img src={item.imageUrl} alt={localizeField(item.name, language)} /> : <span>GP</span>}
                            </div>
                            <div className="menu-admin-item-main">
                              <div className="menu-admin-item-topline">
                                <strong>{localizeField(item.name, language)}</strong>
                                <span className="menu-admin-item-price">{formatPrice(item.price)} UAH</span>
                              </div>
                              {localizeField(item.description, language) ? (
                                <p className="muted">{localizeField(item.description, language)}</p>
                              ) : null}
                              <div className="menu-admin-badges">
                                <span className={`status-pill ${item.isActive ? 'success' : 'warning'}`}>
                                  {item.isActive ? t('menuAdmin.visible') : t('menuAdmin.hidden')}
                                </span>
                                <span className={`status-pill ${item.isAvailable ? 'success' : 'warning'}`}>
                                  {item.isAvailable ? t('menuAdmin.available') : t('menuAdmin.stopListLabel')}
                                </span>
                                <span className="status-pill neutral">#{item.sortOrder}</span>
                              </div>
                            </div>
                            <div className="menu-admin-actions menu-admin-item-actions">
                              <button type="button" className="menu-action-btn" onClick={() => startEditItem(item)} title={t('menuAdmin.actions.edit')} aria-label={t('menuAdmin.actions.edit')}>
                                <ActionIcon type="edit" />
                              </button>
                              <button
                                type="button"
                                className="menu-action-btn"
                                disabled={savingKey === `item-${item.id}`}
                                onClick={() =>
                                  patchItem(item.id, { isActive: !item.isActive }, t('menuAdmin.feedback.itemVisibilityUpdated'))
                                }
                                title={item.isActive ? t('menuAdmin.hidden') : t('menuAdmin.visible')}
                                aria-label={item.isActive ? t('menuAdmin.hidden') : t('menuAdmin.visible')}
                              >
                                <ActionIcon type={item.isActive ? 'eye-off' : 'eye'} />
                              </button>
                              <button
                                type="button"
                                className={`menu-action-btn ${item.isAvailable ? 'is-warning' : 'is-success'}`}
                                disabled={savingKey === `item-${item.id}`}
                                onClick={() =>
                                  patchItem(item.id, { isAvailable: !item.isAvailable }, t('menuAdmin.feedback.itemAvailabilityUpdated'))
                                }
                                title={item.isAvailable ? t('menuAdmin.stopListLabel') : t('menuAdmin.available')}
                                aria-label={item.isAvailable ? t('menuAdmin.stopListLabel') : t('menuAdmin.available')}
                              >
                                <ActionIcon type={item.isAvailable ? 'stop' : 'check'} />
                              </button>
                              <button
                                type="button"
                                className="menu-action-btn is-danger"
                                disabled={savingKey === `delete-item-${item.id}`}
                                onClick={() => removeItem(item)}
                                title={t('menuAdmin.actions.delete')}
                                aria-label={t('menuAdmin.actions.delete')}
                              >
                                <ActionIcon type="delete" />
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </PanelCard>

        <div className="menu-admin-forms">
          <PanelCard
            title={categoryEditId ? t('menuAdmin.editCategoryTitle') : t('menuAdmin.newCategoryTitle')}
            subtitle={t('menuAdmin.categoryFormSubtitle')}
            actions={
              categoryEditId ? (
                <button type="button" className="btn btn-secondary btn-small" onClick={resetCategoryForm}>
                  {t('menuAdmin.cancelEdit')}
                </button>
              ) : null
            }
          >
            <form onSubmit={submitCategory} className="menu-admin-form" ref={categoryFormRef}>
              <div className="grid-two-col">
                <label>
                  {t('menuAdmin.fields.categoryName')} (UA)
                  <input
                    ref={categoryNameInputRef}
                    value={categoryForm.name.ua}
                    onChange={(event) => setLocalizedFieldValue(setCategoryForm, 'name', 'ua', event.target.value)}
                    placeholder={t('menuAdmin.placeholders.categoryName')}
                    required
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.categoryName')} (RU)
                  <input
                    value={categoryForm.name.ru}
                    onChange={(event) => setLocalizedFieldValue(setCategoryForm, 'name', 'ru', event.target.value)}
                    placeholder="Auto"
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.categoryName')} (EN)
                  <input
                    value={categoryForm.name.en}
                    onChange={(event) => setLocalizedFieldValue(setCategoryForm, 'name', 'en', event.target.value)}
                    placeholder="Auto"
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
                  {t('menuAdmin.fields.section')}
                  <select
                    value={categoryForm.section}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, section: event.target.value }))}
                  >
                    <option value="KITCHEN">{t('menuAdmin.sections.kitchen')}</option>
                    <option value="BAR">{t('menuAdmin.sections.bar')}</option>
                  </select>
                </label>
                <label>
                  {t('menuAdmin.fields.sortOrder')}
                  <input
                    type="number"
                    value={categoryForm.sortOrder}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))}
                  />
                </label>
              </div>

              <div className="actions compact">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={Boolean(translating['category-name'])}
                  onClick={() => autoTranslateField('category', 'name')}
                >
                  {translating['category-name'] ? 'Перекладаємо...' : '✦✦ Перекласти RU/EN з UA'}
                </button>
              </div>

              <label className="menu-admin-checkbox">
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(event) => setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span>{t('menuAdmin.fields.visibleOnSite')}</span>
              </label>

              <div className="actions">
                <button type="submit" className="btn" disabled={savingKey === 'category-form'}>
                  {savingKey === 'category-form' ? t('menuAdmin.saving') : t('menuAdmin.actions.saveCategory')}
                </button>
              </div>
            </form>
          </PanelCard>

          <PanelCard
            title={itemEditId ? t('menuAdmin.editItemTitle') : t('menuAdmin.newItemTitle')}
            subtitle={t('menuAdmin.itemFormSubtitle')}
            actions={
              itemEditId ? (
                <button type="button" className="btn btn-secondary btn-small" onClick={() => resetItemForm(itemForm.categoryId)}>
                  {t('menuAdmin.cancelEdit')}
                </button>
              ) : null
            }
          >
            <form onSubmit={submitItem} className="menu-admin-form" ref={itemFormRef}>
              <div className="grid-two-col">
                <label>
                  {t('menuAdmin.fields.category')}
                  <select
                    value={itemForm.categoryId}
                    onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value }))}
                    required
                  >
                    <option value="">{t('menuAdmin.selectCategory')}</option>
                    {menuState.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {localizeField(category.name, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('menuAdmin.fields.price')}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.price}
                    onChange={(event) => setItemForm((current) => ({ ...current, price: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.itemName')} (UA)
                  <input
                    ref={itemNameInputRef}
                    value={itemForm.name.ua}
                    onChange={(event) => setLocalizedFieldValue(setItemForm, 'name', 'ua', event.target.value)}
                    placeholder={t('menuAdmin.placeholders.itemName')}
                    required
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.itemName')} (RU)
                  <input
                    value={itemForm.name.ru}
                    onChange={(event) => setLocalizedFieldValue(setItemForm, 'name', 'ru', event.target.value)}
                    placeholder="Auto"
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.itemName')} (EN)
                  <input
                    value={itemForm.name.en}
                    onChange={(event) => setLocalizedFieldValue(setItemForm, 'name', 'en', event.target.value)}
                    placeholder="Auto"
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.sortOrder')}
                  <input
                    type="number"
                    value={itemForm.sortOrder}
                    onChange={(event) => setItemForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))}
                  />
                </label>
              </div>

              <div className="actions compact">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={Boolean(translating['item-name'])}
                  onClick={() => autoTranslateField('item', 'name')}
                >
                  {translating['item-name'] ? 'Перекладаємо...' : '✦✦ Перекласти назву RU/EN з UA'}
                </button>
              </div>

              <div className="grid-two-col">
                <label>
                  {t('menuAdmin.fields.description')} (UA)
                  <textarea
                    value={itemForm.description.ua}
                    onChange={(event) => setLocalizedFieldValue(setItemForm, 'description', 'ua', event.target.value)}
                    placeholder={t('menuAdmin.placeholders.description')}
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.description')} (RU)
                  <textarea
                    value={itemForm.description.ru}
                    onChange={(event) => setLocalizedFieldValue(setItemForm, 'description', 'ru', event.target.value)}
                    placeholder="Auto"
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.description')} (EN)
                  <textarea
                    value={itemForm.description.en}
                    onChange={(event) => setLocalizedFieldValue(setItemForm, 'description', 'en', event.target.value)}
                    placeholder="Auto"
                  />
                </label>
              </div>

              <div className="actions compact">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  disabled={Boolean(translating['item-description'])}
                  onClick={() => autoTranslateField('item', 'description')}
                >
                  {translating['item-description'] ? 'Перекладаємо...' : '✦✦ Перекласти опис RU/EN з UA'}
                </button>
              </div>

              <div className="grid-two-col">
                <label>
                  {t('menuAdmin.fields.imageUrl')}
                  <input
                    value={itemForm.imageUrl}
                    onChange={(event) => setItemForm((current) => ({ ...current, imageUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label>
                  {t('menuAdmin.fields.uploadImage')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleItemImageUpload(event.target.files?.[0])}
                  />
                </label>
              </div>

              {uploadState.status !== 'idle' ? (
                <div className={`upload-status-card ${uploadState.status === 'error' ? 'is-error' : uploadState.status === 'success' ? 'is-success' : 'is-uploading'}`}>
                  <strong>{t('menuAdmin.fields.uploadImage')}</strong>
                  <p>{uploadState.details}</p>
                </div>
              ) : null}

              {itemForm.imageUrl ? (
                <div className="menu-admin-image-preview">
                  <img src={itemForm.imageUrl} alt={localizeField(itemForm.name, language) || 'Menu item'} />
                </div>
              ) : null}

              <div className="menu-admin-check-grid">
                <label className="menu-admin-checkbox">
                  <input
                    type="checkbox"
                    checked={itemForm.isActive}
                    onChange={(event) => setItemForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>{t('menuAdmin.fields.visibleOnSite')}</span>
                </label>
                <label className="menu-admin-checkbox">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(event) => setItemForm((current) => ({ ...current, isAvailable: event.target.checked }))}
                  />
                  <span>{t('menuAdmin.fields.availableNow')}</span>
                </label>
              </div>

              <div className="actions">
                <button type="submit" className="btn" disabled={savingKey === 'item-form'}>
                  {savingKey === 'item-form' ? t('menuAdmin.saving') : t('menuAdmin.actions.saveItem')}
                </button>
              </div>
            </form>
          </PanelCard>
        </div>
      </div>
    </AdminLayout>
  );
}
