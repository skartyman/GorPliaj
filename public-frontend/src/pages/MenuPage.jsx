import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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

function getTableCodeFromSearch(search) {
  const params = new URLSearchParams(search);
  const raw = params.get('table');
  if (!raw) return null;
  const code = raw.trim();
  return code || null;
}

function extractTableCode(text) {
  const trimmed = text.trim();
  try {
    if (trimmed.includes('table=')) {
      const url = new URL(trimmed);
      const code = url.searchParams.get('table');
      if (code) return code.trim();
    }
  } catch {}
  return trimmed;
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

  const tableCode = getTableCodeFromSearch(location.search);
  const isTableView = Boolean(tableCode);

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [orderWaiterName, setOrderWaiterName] = useState('');
  const [orderSuccessBanner, setOrderSuccessBanner] = useState('');
  const [callSent, setCallSent] = useState(false);
  const [callError, setCallError] = useState('');
  const [noTableWarning, setNoTableWarning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState('');
  const [tableWaiterName, setTableWaiterName] = useState('');
  const [serviceToast, setServiceToast] = useState('');
  const [reviewRating, setReviewRating] = useState(null);
  const html5QrCodeRef = useRef(null);
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
    if (!scannerOpen) return;
    let consumed = false;
    const scanner = new Html5Qrcode('menu-qr-reader');
    html5QrCodeRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 5, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (consumed) return;
        consumed = true;
        const code = extractTableCode(decodedText);
        if (code) {
          try { localStorage.setItem('gorpliaj-pending-order', '1'); } catch {}
          window.location.href = `/menu?table=${encodeURIComponent(code)}`;
        }
      },
      () => {}
    ).catch(() => {
      if (consumed) return;
      consumed = true;
      setScannerOpen(false);
      setScanError(c({ ua: 'Не вдалося відкрити камеру', ru: 'Не удалось открыть камеру', en: 'Camera error' }));
      setTimeout(() => setScanError(''), 3000);
    });
    return () => { consumed = true; scanner.stop().catch(() => {}); html5QrCodeRef.current = null; };
  }, [scannerOpen]);

  useEffect(() => {
    if (!isTableView || !tableCode) return;
    tableOrderApi.getTableWaiter(tableCode).then((data) => {
      if (data?.waiterName) setTableWaiterName(data.waiterName);
    }).catch(() => {});
  }, [isTableView, tableCode]);

  useEffect(() => {
    if (!orderSent?.id) return;
    const es = new EventSource(tableOrderApi.sseUrl(orderSent.id));
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'STATUS_UPDATE') {
          setOrderStatus(data.status);
          const labels = {
            ACCEPTED: c({ ua: '👨‍🍳 Прийнято', ru: '👨‍🍳 Принято', en: '👨‍🍳 Accepted' }),
            PREPARING: c({ ua: '👨‍🍳 Готується', ru: '👨‍🍳 Готовится', en: '👨‍🍳 Preparing' }),
            COMPLETED: c({ ua: '✅ Готово', ru: '✅ Готово', en: '✅ Ready' }),
          };
          const label = labels[data.status];
          if (label) {
            const name = orderWaiterName || '';
            setOrderSuccessBanner(`${label}${name ? ` — ${name}` : ''}`);
          }
        }
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
    if (!cartEntries.length || !tableCode || orderSubmitting) return;
    setOrderSubmitting(true);
    setOrderError('');
    try {
      const order = await tableOrderApi.create({
        tableCode,
        items: cartEntries.map((e) => ({ menuItemId: e.itemId, quantity: e.quantity, price: e.price }))
      });
      setOrderSent(order);
      setOrderStatus(order.status);
      setOrderWaiterName(order.waiterName || '');
      clear();
      setCartOpen(false);
      const name = order.waiterName || '';
      const msg = name
        ? c({ ua: `✅ Замовлення надіслано — Офіціант: ${name}`, ru: `✅ Заказ отправлен — Официант: ${name}`, en: `✅ Order sent — Waiter: ${name}` })
        : c({ ua: '✅ Замовлення надіслано', ru: '✅ Заказ отправлен', en: '✅ Order sent' });
      setOrderSuccessBanner(msg);
      setTimeout(() => { setOrderSuccessBanner(''); }, 5000);
    } catch (err) {
      setOrderError(err.message || 'Error');
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function callWaiter() {
    if (!tableCode) return;
    setCallSent(false);
    setCallError('');
    setServiceToast('');
    try {
      await waiterCallApi.create({ tableCode });
      setCallSent(true);
      setCallError('');
      setServiceToast(c({
        ua: 'Виклик надіслано вашому офіціанту',
        ru: 'Вызов отправлен вашему официанту',
        en: 'Your waiter has been called'
      }));
      setTimeout(() => setServiceToast(''), 5000);
      setTimeout(() => setCallSent(false), 10000);
    } catch (err) {
      setCallError(err.message || 'Error');
      setServiceToast(err.message || 'Error');
      setTimeout(() => setServiceToast(''), 5000);
    }
  }

  useEffect(() => {
    if (!isTableView || !tableCode || loading || orderSubmitting || orderSent) return;
    try {
      const pending = localStorage.getItem('gorpliaj-pending-order');
      if (pending && cartEntries.length > 0) {
        localStorage.removeItem('gorpliaj-pending-order');
        setTimeout(() => submitOrder(), 250);
      }
    } catch {}
  }, [isTableView, tableCode, loading, cartEntries.length, orderSubmitting, orderSent]);

  const isEn = locale === 'en';

  const statusLabels = {
    PENDING: c({ ua: 'Очікує', ru: 'Ожидает', en: 'Pending' }),
    ACCEPTED: c({ ua: 'Прийнято', ru: 'Принято', en: 'Accepted' }),
    PREPARING: c({ ua: 'Готується', ru: 'Готовится', en: 'Preparing' }),
    COMPLETED: c({ ua: 'Виконано', ru: 'Выполнено', en: 'Completed' }),
    CANCELLED: c({ ua: 'Скасовано', ru: 'Отменено', en: 'Cancelled' })
  };
  const serviceStatus = orderSubmitting ? 'SENDING' : (orderStatus || orderSent?.status || null);
  const serviceStatusMeta = {
    SENDING: { icon: '...', tone: '#f59e0b', label: c({ ua: 'Йде відправка', ru: 'Идет отправка', en: 'Sending' }) },
    PENDING: { icon: '->', tone: '#3b82f6', label: c({ ua: 'Замовлення надіслано', ru: 'Заказ отправлен', en: 'Order sent' }) },
    ACCEPTED: { icon: '✓', tone: '#16a34a', label: c({ ua: 'Офіціант прийняв', ru: 'Официант принял', en: 'Accepted' }) },
    PREPARING: { icon: '•', tone: '#8b5cf6', label: c({ ua: 'Готується', ru: 'Готовится', en: 'Preparing' }) },
    COMPLETED: { icon: '✓✓', tone: '#10b981', label: c({ ua: 'Готово', ru: 'Готово', en: 'Ready' }) },
    CANCELLED: { icon: 'x', tone: '#64748b', label: c({ ua: 'Скасовано', ru: 'Отменено', en: 'Cancelled' }) }
  };
  const activeServiceStatus = serviceStatus ? serviceStatusMeta[serviceStatus] : null;

  function leaveReview(rating) {
    setReviewRating(rating);
    try {
      localStorage.setItem('gorpliaj-last-waiter-review', JSON.stringify({
        orderId: orderSent?.id || null,
        waiterName: orderWaiterName || tableWaiterName || null,
        rating,
        createdAt: new Date().toISOString()
      }));
    } catch {}
    setServiceToast(c({ ua: 'Дякуємо за відгук', ru: 'Спасибо за отзыв', en: 'Thanks for your feedback' }));
    setTimeout(() => setServiceToast(''), 4000);
  }

  return (
    <>
      <div className="menu-page-header">
        {isTableView && (
          <div className="menu-service-bar">
            <span style={{ flex: '0 0 auto' }}>{c({ ua: `Стіл ${tableCode}`, ru: `Стол ${tableCode}`, en: `Table ${tableCode}` })}</span>
            <span className="menu-service-divider" />
            <span style={{ flex: '0 1 auto', minWidth: 0, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tableWaiterName || orderWaiterName || c({ ua: 'Офіціант ...', ru: 'Официант ...', en: 'Waiter ...' })}
            </span>
            <button type="button" onClick={callWaiter} disabled={callSent} aria-label={c({ ua: 'Викликати офіціанта', ru: 'Позвать официанта', en: 'Call waiter' })}
              className={`menu-service-bell${callSent ? ' called' : ''}`}>
              🔔
            </button>
            {activeServiceStatus && (
              <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 5, color: activeServiceStatus.tone }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${activeServiceStatus.tone}18`, fontSize: '0.68rem', fontWeight: 900 }}>
                  {activeServiceStatus.icon}
                </span>
                <span>{activeServiceStatus.label}</span>
              </span>
            )}
            {(serviceToast || callError) && (
              <span style={{ flex: '0 0 auto', color: callError ? '#991b1b' : '#166534', fontWeight: 800 }}>
                {serviceToast || callError}
              </span>
            )}
            {serviceStatus === 'COMPLETED' && (
              <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} type="button" onClick={() => leaveReview(rating)} aria-label={`${rating}/5`}
                    style={{ width: 22, height: 26, border: 'none', background: 'transparent', color: reviewRating && rating <= reviewRating ? '#16a34a' : '#a08850', fontSize: '0.92rem', lineHeight: 1, cursor: 'pointer', padding: 0 }}>
                    ★
                  </button>
                ))}
              </span>
            )}
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

      {cartTotalItems > 0 && (
        <button type="button" className="cart-fab" onClick={() => setCartOpen(true)}>
          <span>{t('menuCartTitle')}</span>
          <span>{cartTotalItems} · {formatPrice(cartTotalPrice)} грн</span>
        </button>
      )}

      {cartOpen && (
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
            {noTableWarning && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--warning-bg, #fff3e0)', color: 'var(--warning-text, #e65100)', fontSize: 13, fontWeight: 600, marginTop: 12, textAlign: 'center' }}>
                {c({ ua: 'Для оформлення замовлення відскануйте QR-код на столі', ru: 'Для оформления заказа отсканируйте QR-код на столе', en: 'Scan the QR code on your table to place an order' })}
              </div>
            )}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isTableView ? (
                <>
                  <button className="btn btn-primary" type="button" style={{ flex: '2 1 140px' }} onClick={() => { setCartOpen(false); submitOrder(); }} disabled={orderSubmitting}>
                    {orderSubmitting ? '...' : c({ ua: 'Замовити', ru: 'Заказать', en: 'Order' })}
                  </button>
                  <button className="btn btn-secondary" type="button" style={{ flex: '1 1 100px' }} onClick={() => { setCartOpen(false); callWaiter(); }} disabled={callSent}>
                    {callSent ? c({ ua: 'Очікуйте...', ru: 'Ожидайте...', en: 'Wait...' }) : c({ ua: '📞 Офіціант', ru: '📞 Официант', en: '📞 Waiter' })}
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" type="button" style={{ flex: 1 }} onClick={() => setNoTableWarning(true)}>
                  {c({ ua: 'Замовити', ru: 'Заказать', en: 'Order' })}
                </button>
              )}
              <button className="btn btn-secondary" type="button" onClick={() => { const lines = [t('menuCartTitle')]; cartEntries.forEach((e) => lines.push(`${e.name} x ${e.quantity} - ${formatPrice(e.quantity * e.price)} грн`)); lines.push(`${t('menuCartTotal')}: ${formatPrice(cartTotalPrice)} грн`); navigator.clipboard.writeText(lines.join('\n')); }}>{t('menuCartCopy')}</button>
              <button className="btn btn-secondary" type="button" onClick={clear}>{t('menuCartClear')}</button>
            </div>
          </section>
        </div>
      )}

      {orderSuccessBanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000, padding: '14px 16px', background: '#16a34a', color: '#fff', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {orderSuccessBanner}
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
      {noTableWarning && (
        <div className="cart-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1200 }}>
          <button className="cart-backdrop" onClick={() => { setNoTableWarning(false); setScannerOpen(false); setManualCode(''); setScanError(''); }} aria-label="Close" />
          <section className="cart-panel" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🍽️</div>
            <h2 style={{ marginBottom: 8 }}>{c({ ua: 'Скануйте QR-код', ru: 'Сканируйте QR-код', en: 'Scan QR code' })}</h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>
              {c({ ua: 'Для оформлення замовлення відскануйте QR-код на столі або введіть код вручну', ru: 'Для оформления заказа отсканируйте QR-код на столе или введите код вручную', en: 'Scan the QR code on your table or enter the code manually to place an order' })}
            </p>
            {scanError && <p style={{ color: 'var(--error, #d32f2f)', fontSize: '0.85rem', marginBottom: 8 }}>{scanError}</p>}
            {scannerOpen ? (
              <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div id="menu-qr-reader" style={{ width: '100%' }} />
              </div>
            ) : (
              <button className="btn btn-primary" type="button" style={{ width: '100%', marginBottom: 12 }} onClick={() => { setScanError(''); setScannerOpen(true); }}>
                {c({ ua: '📷 Увімкнути сканер', ru: '📷 Включить сканер', en: '📷 Open scanner' })}
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder={c({ ua: 'Код столу (напр. R-1)', ru: 'Код стола (напр. R-1)', en: 'Table code (e.g. R-1)' })} value={manualCode} onChange={(e) => setManualCode(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-warm, #D4C5A9)', borderRadius: 10, fontSize: 14, background: 'var(--bg-input, #FFFEF5)' }} />
              <button className="btn btn-secondary" type="button" disabled={!manualCode.trim()} onClick={() => { const code = manualCode.trim(); if (code) { try { localStorage.setItem('gorpliaj-pending-order', '1'); } catch {} window.location.href = `/menu?table=${encodeURIComponent(code)}`; } }}>
                →
              </button>
            </div>
            <button className="btn btn-secondary" type="button" style={{ width: '100%' }} onClick={() => { setNoTableWarning(false); setScannerOpen(false); setManualCode(''); }}>
              {c({ ua: 'Назад до меню', ru: 'Назад к меню', en: 'Back to menu' })}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
