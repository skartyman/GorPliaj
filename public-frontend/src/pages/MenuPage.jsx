import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { menuApi } from '../lib/api';
import { localizeField } from '../lib/i18n';
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

export default function MenuPage() {
  const { locale, t } = useLocale();
  const location = useLocation();
  const { items, updateQuantity, clear } = useCart();
  const [menu, setMenu] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('kitchen');
  const [activeCategory, setActiveCategory] = useState('');
  const categoryNavRef = useRef(null);
  const categoryButtonsRef = useRef(new Map());
  const sectionNodesRef = useRef(new Map());
  useMeta(t('menuMetaTitle'), t('menuMetaDescription'));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIKES_STORAGE_KEY);
      if (raw) setLikes(JSON.parse(raw));
    } catch {}

    menuApi
      .list()
      .then((payload) => {
        setMenu(payload);
        setLoading(false);
      })
      .catch((loadError) => {
        setError(loadError.message || t('menuError'));
        setLoading(false);
      });
  }, [t]);

  const grouped = useMemo(() => {
    return menu.reduce(
      (acc, category) => {
        const categoryLabel = localizeField(category.name, locale);
        const itemsList = Array.isArray(category.items) ? category.items : [];
        if (!categoryLabel || !itemsList.length) return acc;
        const section = resolveCategorySection(categoryLabel, category.section);
        acc[section].push({ categoryKey: categoryLabel, categoryLabel, items: itemsList });
        return acc;
      },
      { kitchen: [], bar: [] }
    );
  }, [locale, menu]);

  const availableSections = useMemo(() => ['kitchen', 'bar'].filter((section) => grouped[section].length), [grouped]);
  const categories = grouped[activeSection]?.length ? grouped[activeSection] : grouped[availableSections[0]] || [];

  useEffect(() => {
    if (!availableSections.length) return;
    if (!availableSections.includes(activeSection)) {
      setActiveSection(availableSections[0]);
    }
  }, [activeSection, availableSections]);

  useEffect(() => {
    if (categories.length && !categories.some((category) => category.categoryKey === activeCategory)) {
      setActiveCategory(categories[0].categoryKey);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    if (!categories.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top - HEADER_OFFSET) - Math.abs(b.boundingClientRect.top - HEADER_OFFSET));
        if (visible[0]) {
          const key = visible[0].target.getAttribute('data-category-key');
          if (key) setActiveCategory(key);
        }
      },
      { root: null, rootMargin: `-${HEADER_OFFSET}px 0px -55% 0px`, threshold: [0, 0.12, 0.25, 0.5, 0.8] }
    );

    categories.forEach((category) => {
      const node = sectionNodesRef.current.get(category.categoryKey);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    if (!activeCategory || !categoryNavRef.current) return;
    const activeChip = categoryButtonsRef.current.get(activeCategory);
    if (!activeChip) return;
    const containerRect = categoryNavRef.current.getBoundingClientRect();
    const chipRect = activeChip.getBoundingClientRect();
    const nextLeft = categoryNavRef.current.scrollLeft + (chipRect.left - containerRect.left) - (containerRect.width - chipRect.width) / 2;
    categoryNavRef.current.scrollTo({ left: Math.max(0, nextLeft), behavior: 'smooth' });
  }, [activeCategory]);

  const cartEntries = useMemo(() => {
    const itemMap = new Map();
    menu.forEach((category) => {
      const categoryLabel = localizeField(category.name, locale);
      (category.items || []).forEach((item) => {
        itemMap.set(item.id, {
          itemId: item.id,
          name: localizeField(item.name, locale),
          category: categoryLabel,
          price: Number(item.price || 0),
          quantity: Number(items[String(item.id)]?.quantity || 0)
        });
      });
    });
    return Array.from(itemMap.values()).filter((entry) => entry.quantity > 0);
  }, [items, locale, menu]);

  const cartTotalItems = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const cartTotalPrice = cartEntries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);

  function formatPrice(value) {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  async function toggleLike(itemId) {
    const key = String(itemId);
    const nextLiked = !likes[key];
    const nextLikes = { ...likes, [key]: nextLiked };
    setLikes(nextLikes);
    window.localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(nextLikes));

    setMenu((current) =>
      current.map((category) => ({
        ...category,
        items: category.items.map((item) =>
          item.id === itemId ? { ...item, likesCount: Math.max(0, Number(item.likesCount || 0) + (nextLiked ? 1 : -1)) } : item
        )
      }))
    );

    try {
      const response = await menuApi.setLike(itemId, nextLiked);
      setMenu((current) =>
        current.map((category) => ({
          ...category,
          items: category.items.map((item) => (item.id === itemId ? { ...item, likesCount: Number(response.item.likesCount || 0) } : item))
        }))
      );
    } catch {}
  }

  async function copyOrder() {
    const lines = [t('menuCartTitle')];
    cartEntries.forEach((entry) => {
      lines.push(`${entry.name} x ${entry.quantity} - ${formatPrice(entry.quantity * entry.price)} грн`);
    });
    lines.push(`${t('menuCartTotal')}: ${formatPrice(cartTotalPrice)} грн`);
    await navigator.clipboard.writeText(lines.join('\n'));
  }

  function scrollToCategory(categoryKey, sectionKey = activeSection) {
    if (sectionKey !== activeSection) {
      setActiveSection(sectionKey);
    }
    requestAnimationFrame(() => {
      const target = sectionNodesRef.current.get(categoryKey);
      if (!target) return;
      setActiveCategory(categoryKey);
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }

  const isEn = locale === 'en';

  return (
    <>
      {/* Sticky header */}
      <div className="menu-page-header">
        <div className="menu-section-tabs">
          {availableSections.map((section) => (
            <button
              key={section}
              type="button"
              className={`menu-tab ${activeSection === section ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(section);
                const firstCategory = grouped[section][0]?.categoryKey;
                if (firstCategory) scrollToCategory(firstCategory, section);
              }}
            >
              {section === 'kitchen' ? (isEn ? 'Kitchen' : 'Кухня') : (isEn ? 'Bar' : 'Бар')}
            </button>
          ))}
        </div>
        <div className="menu-category-scroll" ref={categoryNavRef}>
          {categories.map((category) => (
            <button
              key={category.categoryKey}
              type="button"
              className={`menu-category-chip ${activeCategory === category.categoryKey ? 'active' : ''}`}
              ref={(node) => {
                if (node) categoryButtonsRef.current.set(category.categoryKey, node);
                else categoryButtonsRef.current.delete(category.categoryKey);
              }}
              onClick={() => scrollToCategory(category.categoryKey, activeSection)}
            >
              {category.categoryLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="page-container">
        {loading && <div className="state-msg">{t('menuLoading')}</div>}
        {!loading && error && <div className="state-msg state-error">{error}</div>}
        {!loading && !error && !menu.length && <div className="state-msg">{t('menuEmpty')}</div>}
        {!loading && !error && menu.length ? (
          categories.map((category) => (
            <section
              key={category.categoryKey}
              className="content-section"
              data-category-key={category.categoryKey}
              ref={(node) => {
                if (node) sectionNodesRef.current.set(category.categoryKey, node);
                else sectionNodesRef.current.delete(category.categoryKey);
              }}
            >
              <h2>{category.categoryLabel}</h2>
              <div className="menu-grid">
                {category.items.map((item) => {
                  const quantity = Number(items[String(item.id)]?.quantity || 0);
                  const name = localizeField(item.name, locale);

                  return (
                    <article key={item.id} className="menu-card">
                      <div className="menu-card-body">
                        <h3>{name}</h3>
                        <p className="muted">{localizeField(item.description, locale)}</p>
                        <span className="menu-price">{formatPrice(Number(item.price || 0))} грн</span>
                      </div>
                      <div className="menu-card-image">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={name} loading="lazy" />
                        ) : (
                          <div className="menu-card-fallback">GP</div>
                        )}
                      </div>
                      <div className="menu-card-footer">
                        <button type="button" className={`menu-like-btn ${likes[String(item.id)] ? 'active' : ''}`} onClick={() => toggleLike(item.id)}>
                          ♥ {item.likesCount || 0}
                        </button>
                        <div className="menu-qty">
                          <button type="button" onClick={() => updateQuantity(item.id, -1)} disabled={quantity === 0}>−</button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
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

      {/* Cart FAB */}
      {cartTotalItems > 0 && (
        <button type="button" className="cart-fab" onClick={() => setCartOpen(true)}>
          <span>{t('menuCartTitle')}</span>
          <span>
            {cartTotalItems} · {formatPrice(cartTotalPrice)} грн
          </span>
        </button>
      )}

      {/* Cart Panel */}
      {cartOpen && (
        <div className="cart-overlay" role="dialog" aria-modal="true">
          <button className="cart-backdrop" onClick={() => setCartOpen(false)} aria-label={t('menuOpenCart')} />
          <section className="cart-panel">
            <h2>{t('menuCartTitle')}</h2>
            {cartEntries.map((entry) => (
              <div key={entry.itemId} className="cart-item">
                <div>
                  <strong>{entry.name}</strong>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>{entry.category}</p>
                </div>
                <div className="menu-qty">
                  <button type="button" onClick={() => updateQuantity(entry.itemId, -1)}>−</button>
                  <span>{entry.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(entry.itemId, 1)}>+</button>
                </div>
              </div>
            ))}
            <p style={{ marginTop: 20 }}>
              <strong>
                {t('menuCartTotal')}: {formatPrice(cartTotalPrice)} грн
              </strong>
            </p>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" type="button" onClick={copyOrder}>{t('menuCartCopy')}</button>
              <button className="btn btn-secondary" type="button" onClick={clear}>{t('menuCartClear')}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
