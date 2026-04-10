import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslations } from '../lib/i18n';
import { useMenu } from '../hooks/useApi';

export default function MenuPage() {
  const { t, currentLanguage, setLanguage } = useTranslations();
  const { menu, loading, error } = useMenu();
  const [activeCategory, setActiveCategory] = useState('');

  const handleLanguageToggle = () => {
    const newLang = currentLanguage === 'uk' ? 'en' : 'uk';
    setLanguage(newLang);
  };

  const groupMenu = () => {
    return menu.reduce((acc, item) => {
      const category = item.category[currentLanguage] || item.category.uk;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  };

  const slugify = (value) => {
    return value
      .toLowerCase()
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  };

  const groupedMenu = groupMenu();
  const categories = Object.keys(groupedMenu);
  const featuredDish = menu[0];

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories]);

  if (loading) {
    return (
      <div className="menu-page-body">
        <main className="menu-page-shell">
          <section className="menu-page-surface">
            <p className="menu-page-description">Завантаження меню...</p>
          </section>
        </main>
      </div>
    );
  }

  if (error || menu.length === 0) {
    return (
      <div className="menu-page-body">
        <main className="menu-page-shell">
          <section className="menu-page-surface">
            <p className="menu-page-description">{t('noMenu')}</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="menu-page-body">
      <main className="menu-page-shell">
        <section className="menu-page-surface">
          {/* Header */}
          <header className="menu-page-header">
            <Link className="brand" to="/">
              <span className="brand-mark">GP</span>
              <span>
                <strong>ГорПляж</strong>
                <small>{t('brandSubtitle')}</small>
              </span>
            </Link>

            <div className="menu-page-controls">
              <a className="menu-search-btn" href="#menuCatalog" aria-label="Go to menu catalog">⌕</a>
              <button
                id="languageToggle"
                className="lang-toggle"
                type="button"
                aria-label="Switch language"
                onClick={handleLanguageToggle}
              >
                {currentLanguage === 'uk' ? 'EN' : 'UK'}
              </button>
            </div>
          </header>

          {/* Intro */}
          <section className="menu-page-intro">
            <p className="eyebrow">{t('menuPageKicker')}</p>
            <div className="menu-page-intro-row">
              <div>
                <h1>{t('menuPageTitle')}</h1>
                <p className="menu-page-description">{t('menuPageDescription')}</p>
              </div>
              <Link className="text-link menu-back-link" to="/">{t('menuBackHome')}</Link>
            </div>
          </section>

          {/* Category Navigation */}
          <nav className="menu-category-nav" id="categoryNav" aria-label="Menu categories">
            {categories.map((category) => (
              <a
                key={category}
                className={`menu-category-link${category === activeCategory ? ' active' : ''}`}
                href={`#category-${slugify(category)}`}
                data-category={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </a>
            ))}
          </nav>

          {/* Featured Dish */}
          <section className="menu-showcase-card">
            <div>
              <p className="eyebrow">{t('menuFeatureLabel')}</p>
              <h2 id="featuredDishName">{featuredDish?.name[currentLanguage] || featuredDish?.name.uk}</h2>
              <p id="featuredDishText" className="menu-page-description">{t('featuredPrefix')}</p>
              <div className="menu-showcase-meta">
                <span className="menu-badge" id="featuredDishCategory">
                  {featuredDish?.category[currentLanguage] || featuredDish?.category.uk}
                </span>
                <strong id="featuredDishPrice">{featuredDish?.price} ₴</strong>
              </div>
            </div>
            <div className="menu-showcase-image" aria-hidden="true"></div>
          </section>

          {/* Menu Catalog */}
          <section className="menu-catalog" id="menuCatalog">
            {Object.entries(groupedMenu).map(([category, items]) => (
              <section key={category} className="menu-category-block" id={`category-${slugify(category)}`}>
                <div className="section-head section-head-compact">
                  <div>
                    <p className="eyebrow">{category}</p>
                    <h2>{category}</h2>
                  </div>
                  <span className="section-chip">{items.length} {t('categoryCount')}</span>
                </div>
                <div className="menu-card-grid">
                  {items.map((item) => (
                    <article key={item.id} className="menu-card-item">
                      <div className="menu-card-copy">
                        <strong>{item.name[currentLanguage] || item.name.uk}</strong>
                        <p className="menu-meta">{category}</p>
                      </div>
                      <span className="menu-price">{item.price} ₴</span>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </section>
        </section>
      </main>
    </div>
  );
}
