import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { menuApi, tableOrderApi, waiterCallApi } from '../lib/api';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useCart } from '../state/cart';
import { useMeta } from '../hooks/useMeta';

const LIKES_STORAGE_KEY = 'gorpliaj-menu-likes';
const HEADER_OFFSET = 92;

function resolveCategorySection(categoryName, sectionKey) {
  const explicit = String(sectionKey || '').toLowerCase();
  if (explicit === 'bar' || explicit === 'kitchen') return explicit;
  const normalized = String(categoryName || '').toLowerCase();
  const barHints = ['bar', 'бар', 'напо', 'коктей', 'вино', 'пиво', 'drink', 'coffee', 'tea', 'чай', 'кофе'];
  return barHints.some((hint) => normalized.includes(hint)) ? 'bar' : 'kitchen';
}

function getTableIdFromSearch(search) {
  const params = new URLSearchParams(search);
  const raw = params.get('table');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function MenuPage() {
  const { locale, t } = useLocale();
  const location = useLocation();
  const { items, updateQuantity, clear } = useCart();
  const [menu, setMenu] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeSection, setActiveSection] = useState('kitchen');
  const [activeCategory, setActiveCategory] = useState('');
  const [failedImages, setFailedImages] = useState({});
  const categoryNavRef = useRef(null);
  const categoryButtonsRef = useRef(new Map());
  const sectionNodesRef = useRef(new Map());

  const tableId = getTableIdFromSearch(location.search);
  const isTableView = Boolean(tableId);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [callSent, setCallSent] = useState(false);
  const [callError, setCallError] = useState('');
  const eventSourceRef = useRef(null);

  useMeta(t('menuMetaTitle'), t('menuMetaDescription'));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIKES_STORAGE_KEY);
      if (raw) setLikes(JSON.parse(raw));
    } catch {}
    menuApi.list().then((p) => { setMenu(p); setLoading(false); }).catch((e) => { setError(e.message || t('menuError')); setLoading(false); });
  }, [t]);

  useEffect(() => {
    if (!orderSent?.id) return;
    const es = new EventSource(tableOrderApi.sseUrl(orderSent.id));
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'STATUS_UPDATE') setOrderStatus(data.status);
      } catch {}
    };
    es.onerror = () => es.close();
    return () => { es.close(); eventSourceRef.current = null; };
  }, [orderSent?.id]);

  const grouped = useMemo(() => menu.reduce((acc, category) => {
    const categoryLabel = localizeField(category.name, locale);
    const itemsList = Array.isArray(category.items) ? category.items : [];
    if (!categoryLabel || !itemsList.length) return acc;
    const section = resolveCategorySection(categoryLabel, category.section);
    acc[section].push({ categoryKey: categoryLabel, categoryLabel, items: itemsList, noPhoto: category.noPhoto });
    return acc;
  }, { kitchen: [], bar: [] }), [locale, menu]);

  const availableSections = useMemo(() => ['kitchen', 'bar'].filter((s) => grouped[s].length), [grouped]);
  const categories = grouped[activeSection]?.length ? grouped[activeSection] : grouped[availableSections[0]] || [];

  useEffect(() => {
    if (!availableSections.length) return;
    if (!availableSections.includes(activeSection)) setActiveSection(availableSections[0]);
  }, [activeSection, availableSections]);

  useEffect(() => {
    if (categories.length && !categories.some((c) => c.categoryKey === activeCategory)) setActiveCategory(categories[0].categoryKey);
  }, [activeCategory, categories]);

  useEffect(() => {
    if (!categories.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - HEADER_OFFSET) - Math.abs(b.boundingClientRect.top - HEADER_OFFSET));
      if (visible[0]) { const key = visible[0].target.getAttribute('data-category-key'); if (key) setActiveCategory(key); }
    }, { root: null, rootMargin: `-${HEADER_OFFSET}px 0px -55% 0px`, threshold: [0, 0.12, 0.25, 0.5, 0.8] });
    categories.forEach((c) => { const n = sectionNodesRef.current.get(c.categoryKey); if (n) observer.observe(n); });
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    if (!activeCategory || !categoryNavRef.current) return;
    const chip = categoryButtonsRef.current.get(activeCategory);
    if (!chip) return;
    const cr = categoryNavRef.current.getBoundingClientRect();
    const tr = chip.getBoundingClientRect();
    categoryNavRef.current.scrollTo({ left: Math.max(0, categoryNavRef.current.scrollLeft + (tr.left - cr.left) - (cr.width - tr.width) / 2), behavior: 'smooth' });
  }, [activeCategory]);

  const cartEntries = useMemo(() => {
    const m = new Map();
    menu.forEach((cat) => {
      const cl = localizeField(cat.name, locale);
      (cat.items || []).forEach((item) => {
        m.set(item.id, { itemId: item.id, name: localizeField(item.name, locale), category: cl, price: Number(item.price || 0), quantity: Number(items[String(item.id)]?.quantity || 0) });
      });
    });
    return Array.from(m.values()).filter((e) => e.quantity > 0);
  }, [items, locale, menu]);

  const c = (values) => localizedCopy(values, locale);
  const cartTotalItems = cartEntries.reduce((sum, e) => sum + e.quantity, 0);
  const cartTotalPrice = cartEntries.reduce((sum, e) => sum + e.quantity * e.price, 0);
  const menuServiceChargeNote = c({ ua: 'Звертаємо увагу, що до кінцевого рахунку за меню буде додано 10% за обслуговування гостя.', ru: 'Обращаем внимание, что к итоговому счету за меню будет добавлено 10% за обслуживание гостя.', en: 'Please note that a 10% guest service charge will be added to the final menu bill.' });

  function formatPrice(v) {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU'), { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
  }

  async function toggleLike(itemId) {
    const key = String(itemId);
    const next = !likes[key];
    setLikes((p) => ({ ...p, [key]: next }));
    window.localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify({ ...likes, [key]: next }));
    setMenu((cur) => cur.map((cat) => ({ ...cat, items: cat.items.map((it) => it.id === itemId ? { ...it, likesCount: Math.max(0, Number(it.likesCount || 0) + (next ? 1 : -1)) } : it) })));
    try { const r = await menuApi.setLike(itemId, next); setMenu((cur) => cur.map((cat) => ({ ...cat, items: cat.items.map((it) => it.id === itemId ? { ...it, likesCount: Number(r.item.likesCount || 0) } : it) }))); } catch {}
  }

  function hasImageError(id) { return Boolean(failedImages[String(id)]); }
  function handleImageError(id) { setFailedImages((p) => { const k = String(id); return p[k] ? p : { ...p, [k]: true }; }); }

  function scrollToCategory(key, section = activeSection) {
    if (section !== activeSection) setActiveSection(section);
    requestAnimationFrame(() => {
      const target = sectionNodesRef.current.get(key);
      if (!target) return;
      setActiveCategory(key);
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET), behavior: 'smooth' });
    });
  }

  async function submitOrder() {
    if (!orderName.trim() || !orderPhone.trim() || !cartEntries.length || !tableId) return;
    setOrderSubmitting(true);
    setOrderError('');
    try {
      const order = await tableOrderApi.create({
        tableId,
        customerName: orderName.trim(),
        customerPhone: orderPhone.trim(),
        notes: orderNotes.trim() || undefined,
        items: cartEntries.map((e) => ({ menuItemId: e.itemId, quantity: e.quantity, price: e.price }))
      });
      setOrderSent(order);
      setOrderStatus(order.status);
      clear();
      setCartOpen(false);
    } catch (err) {
      setOrderError(err.message || 'Error');
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function callWaiter() {
    if (!tableId) return;
    setCallSent(false);
    setCallError('');
    try {
      await waiterCallApi.create({ tableId, customerName: orderName || undefined });
      setCallSent(true);
      setTimeout(() => setCallSent(false), 10000);
    } catch (err) {
      setCallError(err.message || 'Error');
    }
  }

  const isEn = locale === 'en';

  const statusLabels = {
    PENDING: c({ ua: 'Очікує', ru: 'Ожидает', en: 'Pending' }),
    ACCEPTED: c({ ua: 'Прийнято', ru: 'Принято', en: 'Accepted' }),
    PREPARING: c({ ua: 'Готується', ru: 'Готовится', en: 'Preparing' }),
    COMPLETED: c({ ua: 'Виконано', ru: 'Выполнено', en: 'Completed' }),
    CANCELLED: c({ ua: 'Скасовано', ru: 'Отменено', en: 'Cancelled' })
  };

  return (
    <>
      <div className="menu-page-header">
        {isTableView && (
          <div style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
            {c({ ua: `Стіл №${tableId}`, ru: `Стол №${tableId}`, en: `Table #${tableId}` })}
          </div>
        )}
        <div className="menu-section-tabs">
          {availableSections.map((section) => (
            <button key={section} type="button" className={`menu-tab ${activeSection === section ? 'active' : ''}`}
              onClick={() => { setActiveSection(section); const first = grouped[section][0]?.categoryKey; if (first) scrollToCategory(first, section); }}>
              {section === 'kitchen' ? c({ ua: 'Кухня', ru: 'Кухня', en: 'Kitchen' }) : c({ ua: 'Бар', ru: 'Бар', en: 'Bar' })}
            </button>
          ))}
        </div>
        <div className="menu-category-scroll" ref={categoryNavRef}>
          {categories.map((category) => (
            <button key={category.categoryKey} type="button" className={`menu-category-chip ${activeCategory === category.categoryKey ? 'active' : ''}`}
              ref={(node) => { if (node) categoryButtonsRef.current.set(category.categoryKey, node); else categoryButtonsRef.current.delete(category.categoryKey); }}
              onClick={() => scrollToCategory(category.categoryKey, activeSection)}>
              {category.categoryLabel}
            </button>
          ))}
        </div>
        <div className="menu-legal-note">{menuServiceChargeNote}</div>
      </div>

      <div className="page-container">
        {loading && <div className="state-msg">{t('menuLoading')}</div>}
        {!loading && error && <div className="state-msg state-error">{error}</div>}
        {!loading && !error && !menu.length && <div className="state-msg">{t('menuEmpty')}</div>}
        {!loading && !error && menu.length ? (
          categories.map((category) => (
            <section key={category.categoryKey} className="content-section" data-category-key={category.categoryKey}
              ref={(node) => { if (node) sectionNodesRef.current.set(category.categoryKey, node); else sectionNodesRef.current.delete(category.categoryKey); }}>
              <h2>{category.categoryLabel}</h2>
              <div className="menu-grid">
                {category.items.map((item) => {
                  const quantity = Number(items[String(item.id)]?.quantity || 0);
                  const name = localizeField(item.name, locale);
                  const description = localizeField(item.description, locale);
                  const showImage = item.imageUrl && !hasImageError(item.id);
                  return (
                    <article key={item.id} className={`menu-card${category.noPhoto ? ' no-photo' : ''}`} onClick={() => setSelectedItem({ ...item, name, category: localizeField(category.categoryLabel, locale) })}>
                      {!category.noPhoto && (
                        <div className="menu-card-image">
                          {showImage ? <img src={item.imageUrl} alt={name} loading="lazy" onError={() => handleImageError(item.id)} /> : <div className="menu-card-fallback">GP</div>}
                        </div>
                      )}
                      <div className="menu-card-body">
                        <h3>{name}</h3>
                        {description ? <p className="muted">{description}</p> : null}
                        <div className="menu-card-bottom">
                          <span className="menu-price">{formatPrice(Number(item.price || 0))} грн</span>
                          <div className="menu-card-actions">
                            <button type="button" className={`menu-like-btn ${likes[String(item.id)] ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}>♥ {item.likesCount || 0}</button>
                            <div className="menu-qty" onClick={(e) => e.stopPropagation()}>
                              <button type="button" onClick={() => updateQuantity(item.id, -1)} disabled={quantity === 0}>−</button>
                              <span>{quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        ) : null}
      </div>

      {isTableView && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-secondary" type="button" onClick={callWaiter} style={{ flex: 1 }} disabled={callSent}>
            {callSent ? c({ ua: 'Очікуйте...', ru: 'Ожидайте...', en: 'Wait...' }) : c({ ua: '📞 Викликати офіціанта', ru: '📞 Вызвать официанта', en: '📞 Call waiter' })}
          </button>
          {cartTotalItems > 0 && (
            <button className="btn btn-primary" type="button" onClick={() => setOrderOpen(true)} style={{ flex: 2 }}>
              {c({ ua: `Замовити (${cartTotalItems})`, ru: `Заказать (${cartTotalItems})`, en: `Order (${cartTotalItems})` })} · {formatPrice(cartTotalPrice)} грн
            </button>
          )}
        </div>
      )}

      {!isTableView && cartTotalItems > 0 && (
        <button type="button" className="cart-fab" onClick={() => setCartOpen(true)}>
          <span>{t('menuCartTitle')}</span>
          <span>{cartTotalItems} · {formatPrice(cartTotalPrice)} грн</span>
        </button>
      )}

      {cartOpen && !isTableView && (
        <div className="cart-overlay" role="dialog" aria-modal="true">
          <button className="cart-backdrop" onClick={() => setCartOpen(false)} aria-label={t('menuOpenCart')} />
          <section className="cart-panel">
            <h2>{t('menuCartTitle')}</h2>
            {cartEntries.map((entry) => (
              <div key={entry.itemId} className="cart-item">
                <div><strong>{entry.name}</strong><p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>{entry.category}</p></div>
                <div className="menu-qty">
                  <button type="button" onClick={() => updateQuantity(entry.itemId, -1)}>−</button>
                  <span>{entry.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(entry.itemId, 1)}>+</button>
                </div>
              </div>
            ))}
            <p style={{ marginTop: 20 }}><strong>{t('menuCartTotal')}: {formatPrice(cartTotalPrice)} грн</strong></p>
            <p className="menu-cart-note">{menuServiceChargeNote}</p>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" type="button" onClick={() => { const lines = [t('menuCartTitle')]; cartEntries.forEach((e) => lines.push(`${e.name} x ${e.quantity} - ${formatPrice(e.quantity * e.price)} грн`)); lines.push(`${t('menuCartTotal')}: ${formatPrice(cartTotalPrice)} грн`); navigator.clipboard.writeText(lines.join('\n')); }}>{t('menuCartCopy')}</button>
              <button className="btn btn-secondary" type="button" onClick={clear}>{t('menuCartClear')}</button>
            </div>
          </section>
        </div>
      )}

      {orderOpen && (
        <div className="cart-overlay" role="dialog" aria-modal="true">
          <button className="cart-backdrop" onClick={() => !orderSubmitting && setOrderOpen(false)} aria-label="Close" />
          <section className="cart-panel" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {orderSent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>✅</div>
                <h3>{c({ ua: 'Замовлення надіслано!', ru: 'Заказ отправлен!', en: 'Order submitted!' })}</h3>
                <p className="muted" style={{ marginTop: 8 }}>#{orderSent.id}</p>
                {orderStatus && (
                  <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: orderStatus === 'ACCEPTED' || orderStatus === 'COMPLETED' ? 'var(--success-bg, #e8f5e9)' : 'var(--warning-bg, #fff3e0)', fontWeight: 600 }}>
                    {statusLabels[orderStatus] || orderStatus}
                  </div>
                )}
                <button className="btn btn-secondary" type="button" style={{ marginTop: 20 }} onClick={() => { setOrderOpen(false); setOrderSent(null); setOrderStatus(null); }}>
                  {c({ ua: 'Повернутися до меню', ru: 'Вернуться к меню', en: 'Back to menu' })}
                </button>
              </div>
            ) : (
              <>
                <h2>{c({ ua: 'Оформлення замовлення', ru: 'Оформление заказа', en: 'Place order' })}</h2>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {c({ ua: `Стіл №${tableId}`, ru: `Стол №${tableId}`, en: `Table #${tableId}` })} · {cartTotalItems} {c({ ua: 'поз.', ru: 'поз.', en: 'items' })} · {formatPrice(cartTotalPrice)} грн
                </p>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input type="text" placeholder={c({ ua: "Ім'я", ru: 'Имя', en: 'Name' })} value={orderName} onChange={(e) => setOrderName(e.target.value)} required />
                  <input type="tel" placeholder={c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })} value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} required />
                  <textarea placeholder={c({ ua: 'Коментар (необовʼязково)', ru: 'Комментарий (необязательно)', en: 'Notes (optional)' })} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} />
                </div>
                {orderError && <p style={{ color: 'var(--error, #d32f2f)', marginTop: 8, fontSize: '0.85rem' }}>{orderError}</p>}
                <button className="btn btn-primary" type="button" style={{ marginTop: 16, width: '100%' }} onClick={submitOrder} disabled={orderSubmitting || !orderName.trim() || !orderPhone.trim()}>
                  {orderSubmitting ? '...' : c({ ua: 'Надіслати замовлення', ru: 'Отправить заказ', en: 'Submit order' })}
                </button>
                <button className="btn btn-secondary" type="button" style={{ marginTop: 8, width: '100%' }} onClick={() => setOrderOpen(false)} disabled={orderSubmitting}>
                  {c({ ua: 'Скасувати', ru: 'Отмена', en: 'Cancel' })}
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {selectedItem && (
        <div className="modal-overlay modal-item" role="dialog" aria-modal="true">
          <button className="modal-backdrop" onClick={() => setSelectedItem(null)} aria-label={c({ ua: 'Закрити', ru: 'Закрыть', en: 'Close' })} />
          <div className="modal-sheet">
            <div className="modal-sheet-handle" />
            {selectedItem.imageUrl && !hasImageError(selectedItem.id) && (
              <img className="modal-sheet-image" src={selectedItem.imageUrl} alt={selectedItem.name} onError={() => handleImageError(selectedItem.id)} />
            )}
            <div className="modal-sheet-body">
              <div className="modal-sheet-header">
                <div><p className="modal-sheet-category">{selectedItem.category}</p><h2 style={{ margin: '4px 0 0' }}>{selectedItem.name}</h2></div>
                <button className="modal-close-btn" onClick={() => setSelectedItem(null)} aria-label={c({ ua: 'Закрити', ru: 'Закрыть', en: 'Close' })}>✕</button>
              </div>
              {localizeField(selectedItem.description, locale) ? <p className="modal-sheet-desc">{localizeField(selectedItem.description, locale)}</p> : null}
              <div className="modal-sheet-footer">
                <div className="modal-sheet-price">{formatPrice(Number(selectedItem.price || 0))} грн</div>
                <div className="modal-sheet-actions">
                  <div className="menu-qty">
                    <button type="button" onClick={() => updateQuantity(selectedItem.id, -1)} disabled={Number(items[String(selectedItem.id)]?.quantity || 0) === 0}>−</button>
                    <span>{Number(items[String(selectedItem.id)]?.quantity || 0)}</span>
                    <button type="button" onClick={() => updateQuantity(selectedItem.id, 1)}>+</button>
                  </div>
                  <button className="btn btn-primary" onClick={() => { updateQuantity(selectedItem.id, 1); setSelectedItem(null); }}>
                    {c({ ua: 'До замовлення', ru: 'В заказ', en: 'Add to order' })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
