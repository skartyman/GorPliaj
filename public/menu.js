const categoryNav = document.getElementById('categoryNav');
const menuCatalog = document.getElementById('menuCatalog');
const languageToggle = document.getElementById('languageToggle');
const featuredDishName = document.getElementById('featuredDishName');
const featuredDishText = document.getElementById('featuredDishText');
const featuredDishCategory = document.getElementById('featuredDishCategory');
const featuredDishPrice = document.getElementById('featuredDishPrice');

let currentLanguage = localStorage.getItem('language') || 'uk';
let menuCache = [];
let activeCategory = '';

function getLocalizedValue(value) {
  if (value && typeof value === 'object') {
    return value[currentLanguage] || value.uk || value.en || Object.values(value)[0] || '';
  }

  return String(value || '');
}

const translations = {
  uk: {
    pageTitle: 'ГорПляж — Меню',
    brandSubtitle: 'Beach · Restaurant · Events',
    languageToggleLabel: 'EN',
    languageToggleAria: 'Switch language to English',
    menuPageKicker: 'Kitchen & bar',
    menuPageTitle: 'Меню ГорПляжу',
    menuPageDescription: 'Окрема сторінка з категоріями та зручним переглядом основних позицій, як у digital menu.',
    menuBackHome: '← На головну',
    menuFeatureLabel: 'Рекомендація',
    menuEmpty: 'Меню тимчасово недоступне.',
    featuredPrefix: 'Сьогодні радимо спробувати одну з найпопулярніших позицій комплексу.',
    categoryCount: 'позицій',
    priceCurrency: '₴'
  },
  en: {
    pageTitle: 'GorPliaj — Menu',
    brandSubtitle: 'Beach · Restaurant · Events',
    languageToggleLabel: 'UK',
    languageToggleAria: 'Перемкнути мову на українську',
    menuPageKicker: 'Kitchen & bar',
    menuPageTitle: 'GorPliaj Menu',
    menuPageDescription: 'A dedicated page with categories and an easy overview of signature dishes, similar to a digital menu.',
    menuBackHome: '← Back home',
    menuFeatureLabel: 'Recommended',
    menuEmpty: 'Menu is temporarily unavailable.',
    featuredPrefix: 'Today we recommend trying one of the venue’s most popular items.',
    categoryCount: 'items',
    priceCurrency: '₴'
  }
};

function groupMenu(menu) {
  return menu.reduce((acc, categoryEntry) => {
    const categoryName = getLocalizedValue(categoryEntry.name);
    const items = Array.isArray(categoryEntry.items) ? categoryEntry.items : [];
    if (!categoryName || !items.length) {
      return acc;
    }

    acc[categoryName] = items.map((item) => ({
      ...item,
      category: categoryEntry.name
    }));
    return acc;
  }, {});
}

function renderCategories(groupedMenu) {
  const categories = Object.keys(groupedMenu);
  categoryNav.innerHTML = categories
    .map(
      (category) => `
        <a class="menu-category-link${category === activeCategory ? ' active' : ''}" href="#category-${slugify(category)}" data-category="${category}">${category}</a>`
    )
    .join('');
}

function renderCatalog(groupedMenu) {
  const dictionary = translations[currentLanguage];
  const categories = Object.entries(groupedMenu);

  if (!categories.length) {
    menuCatalog.innerHTML = `<article class="surface"><p class="menu-page-description">${dictionary.menuEmpty}</p></article>`;
    categoryNav.innerHTML = '';
    return;
  }

  menuCatalog.innerHTML = categories
    .map(
      ([category, items]) => `
        <section class="menu-category-block" id="category-${slugify(category)}">
          <div class="section-head section-head-compact">
            <div>
              <p class="eyebrow">${category}</p>
              <h2>${category}</h2>
            </div>
            <span class="section-chip">${items.length} ${dictionary.categoryCount}</span>
          </div>
          <div class="menu-card-grid">
            ${items
              .map(
                (item) => `
                  <article class="menu-card-item">
                    <div class="menu-card-copy">
                      <strong>${getLocalizedValue(item.name)}</strong>
                      <p class="menu-meta">${getLocalizedValue(item.description) || category}</p>
                    </div>
                    <span class="menu-price">${item.price} ${dictionary.priceCurrency}</span>
                  </article>`
              )
              .join('')}
          </div>
        </section>`
    )
    .join('');
}

function renderFeaturedDish() {
  const dictionary = translations[currentLanguage];
  const item = menuCache.flatMap((category) => Array.isArray(category.items) ? category.items.map((entry) => ({ ...entry, category: category.name })) : [])[0];

  if (!item) {
    featuredDishName.textContent = dictionary.menuEmpty;
    featuredDishText.textContent = dictionary.featuredPrefix;
    featuredDishCategory.textContent = '—';
    featuredDishPrice.textContent = '—';
    return;
  }

  featuredDishName.textContent = getLocalizedValue(item.name);
  featuredDishText.textContent = dictionary.featuredPrefix;
  featuredDishCategory.textContent = getLocalizedValue(item.category);
  featuredDishPrice.textContent = `${item.price} ${dictionary.priceCurrency}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function translatePage() {
  const dictionary = translations[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.title = dictionary.pageTitle;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  if (languageToggle) {
    languageToggle.textContent = dictionary.languageToggleLabel;
    languageToggle.setAttribute('aria-label', dictionary.languageToggleAria);
  }

  const groupedMenu = groupMenu(menuCache);
  activeCategory = activeCategory || Object.keys(groupedMenu)[0] || '';
  renderFeaturedDish();
  renderCategories(groupedMenu);
  renderCatalog(groupedMenu);
}

async function fetchMenu() {
  const response = await fetch('/api/menu');
  menuCache = await response.json();
  translatePage();
}

languageToggle?.addEventListener('click', () => {
  currentLanguage = currentLanguage === 'uk' ? 'en' : 'uk';
  localStorage.setItem('language', currentLanguage);
  activeCategory = '';
  translatePage();
});

categoryNav.addEventListener('click', (event) => {
  const link = event.target.closest('[data-category]');
  if (!link) return;
  activeCategory = link.dataset.category;
  renderCategories(groupMenu(menuCache));
});

translatePage();

fetchMenu().catch(() => {
  menuCatalog.innerHTML = `<article class="surface"><p class="menu-page-description">${translations[currentLanguage].menuEmpty}</p></article>`;
});
