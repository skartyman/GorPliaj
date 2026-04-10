import { useEffect, useMemo, useState } from 'react';
import { menuApi } from '../lib/api';
import { localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useCart } from '../state/cart';
import { useMeta } from '../hooks/useMeta';

const LIKES_STORAGE_KEY = 'gorpliaj-menu-likes';

function resolveCategorySection(categoryName, sectionKey) {
  const explicit = String(sectionKey || '').toLowerCase();
  if (explicit === 'bar' || explicit === 'kitchen') return explicit;
  const normalized = String(categoryName || '').toLowerCase();
  const barHints = ['bar', 'napo', 'koktei', 'vino', 'pivo', 'drink', 'coffee', 'tea'];
  return barHints.some((hint) => normalized.includes(hint)) ? 'bar' : 'kitchen';
}

export default function MenuPage() {
  const { locale, t } = useLocale();
  const { items, updateQuantity, clear } = useCart();
  const [menu, setMenu] = useState([]);
  const [likes, setLikes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('kitchen');
  useMeta(t('menuMetaTitle'), t('menuMetaDescription'));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIKES_STORAGE_KEY);
      if (raw) {
        setLikes(JSON.parse(raw));
      }
    } catch {}

    menuApi
      .list()
      .then((payload) => {
        setMenu(payload);
        setLoading(false);
      })
      .catch((loadError) => {
        setError(loadError.message || 'Failed to load menu.');
        setLoading(false);
      });
  }, []);

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

  const categories = grouped[activeSection].length ? grouped[activeSection] : grouped.kitchen.length ? grouped.kitchen : grouped.bar;

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
    return new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US', {
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
          items: category.items.map((item) =>
            item.id === itemId ? { ...item, likesCount: Number(response.item.likesCount || 0) } : item
          )
        }))
      );
    } catch {}
  }

  async function copyOrder() {
    const lines = [t('menuCartTitle')];
    cartEntries.forEach((entry) => {
      lines.push(`${entry.name} x ${entry.quantity} - ${formatPrice(entry.quantity * entry.price)} UAH`);
    });
    lines.push(`${t('menuCartTotal')}: ${formatPrice(cartTotalPrice)} UAH`);
    await navigator.clipboard.writeText(lines.join('\n'));
  }

  return (
    <section className="page-block menu-page">
      {loading ? <div className="state">{t('menuLoading')}</div> : null}
      {!loading && error ? <div className="state state-error">{t('menuError')}</div> : null}
      {!loading && !error && !menu.length ? <div className="state">{t('menuEmpty')}</div> : null}
      {!loading && !error && menu.length ? (
        <>
          <header className="menu-control-header">
            <h1>{t('menuTitle')}</h1>
            <p className="muted">{t('menuSubtitle')}</p>
          </header>

          <div className="chip-row">
            <button type="button" className={`menu-chip ${activeSection === 'kitchen' ? 'is-active' : ''}`} onClick={() => setActiveSection('kitchen')}>
              {t('menuSectionKitchen')}
            </button>
            <button type="button" className={`menu-chip ${activeSection === 'bar' ? 'is-active' : ''}`} onClick={() => setActiveSection('bar')}>
              {t('menuSectionBar')}
            </button>
          </div>

          <div className="menu-section-content">
            {categories.map((category) => (
              <section key={category.categoryKey} className="menu-category-block">
                <h2 className="menu-category-title">{category.categoryLabel}</h2>
                <div className="menu-grid">
                  {category.items.map((item) => {
                    const quantity = Number(items[String(item.id)]?.quantity || 0);
                    const name = localizeField(item.name, locale);
                    return (
                      <article key={item.id} className="menu-card">
                        <div className="menu-card-main">
                          <div className="menu-card-body">
                            <strong className="menu-title">{name}</strong>
                            <p className="muted menu-description">{localizeField(item.description, locale)}</p>
                          </div>
                          <span className="menu-price">{formatPrice(Number(item.price || 0))} UAH</span>
                          <div className="menu-image-wrap">
                            {item.imageUrl ? <img src={item.imageUrl} alt={name} className="menu-image" loading="lazy" /> : <div className="menu-image-fallback">GP</div>}
                          </div>
                        </div>
                        <div className="menu-card-footer">
                          <button type="button" className={`menu-like ${likes[String(item.id)] ? 'is-active' : ''}`} onClick={() => toggleLike(item.id)}>
                            Heart {item.likesCount || 0}
                          </button>
                          <div className="menu-qty">
                            <button type="button" onClick={() => updateQuantity(item.id, -1)} disabled={quantity === 0}>
                              -
                            </button>
                            <span>{quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.id, 1)}>
                              +
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : null}

      {cartTotalItems > 0 ? (
        <button type="button" className="menu-cart-fab" onClick={() => setCartOpen(true)}>
          <strong>{t('menuCartTitle')}</strong>
          <span>
            {cartTotalItems} · {formatPrice(cartTotalPrice)} UAH
          </span>
        </button>
      ) : null}

      {cartOpen ? (
        <div className="menu-cart-overlay" role="dialog" aria-modal="true">
          <button className="menu-cart-backdrop" onClick={() => setCartOpen(false)} aria-label="Close" />
          <section className="menu-cart-panel">
            <h2>{t('menuCartTitle')}</h2>
            {cartEntries.map((entry) => (
              <div key={entry.itemId} className="menu-cart-row">
                <div>
                  <strong>{entry.name}</strong>
                  <p className="muted">{entry.category}</p>
                </div>
                <div className="menu-qty">
                  <button type="button" onClick={() => updateQuantity(entry.itemId, -1)}>
                    -
                  </button>
                  <span>{entry.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(entry.itemId, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
            <p>
              <strong>
                {t('menuCartTotal')}: {formatPrice(cartTotalPrice)} UAH
              </strong>
            </p>
            <div className="hero-cta">
              <button className="btn btn-secondary" type="button" onClick={copyOrder}>
                {t('menuCartCopy')}
              </button>
              <button className="btn" type="button" onClick={clear}>
                {t('menuCartClear')}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
