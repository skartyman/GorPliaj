const categoryNav = document.getElementById('categoryNav');
const sectionNav = document.getElementById('sectionNav');
const menuCatalog = document.getElementById('menuCatalog');
const languageToggle = document.getElementById('languageToggle');
const featuredDishName = document.getElementById('featuredDishName');
const featuredDishText = document.getElementById('featuredDishText');
const featuredDishCategory = document.getElementById('featuredDishCategory');
const featuredDishPrice = document.getElementById('featuredDishPrice');
const featuredDishImage = document.getElementById('featuredDishImage');
const featuredDishImageFallback = document.getElementById('featuredDishImageFallback');
const cartFab = document.getElementById('cartFab');
const cartFabCount = document.getElementById('cartFabCount');
const cartFabSummary = document.getElementById('cartFabSummary');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartCloseButton = document.getElementById('cartCloseButton');
const cartItems = document.getElementById('cartItems');
const cartTotalValue = document.getElementById('cartTotalValue');
const cartHint = document.getElementById('cartHint');
const cartCopyButton = document.getElementById('cartCopyButton');
const cartClearButton = document.getElementById('cartClearButton');

const CART_STORAGE_KEY = 'gorpliaj-menu-cart';
const LIKES_STORAGE_KEY = 'gorpliaj-menu-likes';

let currentLanguage = localStorage.getItem('language') || 'uk';
let menuCache = [];
let activeCategory = '';
let activeSection = '';
let renderedCategories = [];
let cartState = loadJsonState(CART_STORAGE_KEY);
let likedState = loadJsonState(LIKES_STORAGE_KEY);
let categorySectionObserver = null;
let isCategoryScrollSyncPaused = false;
let categoryObserverAnimationFrame = null;
let pendingObservedCategory = '';

function loadJsonState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function persistJsonState(storageKey, value) {
  localStorage.setItem(storageKey, JSON.stringify(value));
}

function getLocalizedValue(value) {
  if (value && typeof value === 'object') {
    return value[currentLanguage] || value.uk || value.en || Object.values(value)[0] || '';
  }

  return String(value || '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeSelectorValue(value) {
  const stringValue = String(value ?? '');
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(stringValue);
  }

  return stringValue.replace(/["\\]/g, '\\$&');
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '—';
  }

  const locale = currentLanguage === 'uk' ? 'uk-UA' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(number);
}

function getDishImage(item) {
  const imageUrl = typeof item?.imageUrl === 'string' ? item.imageUrl.trim() : '';
  return imageUrl || '';
}

function getImageMarkup(item, title) {
  const imageUrl = getDishImage(item);
  if (!imageUrl) {
    return `
      <div class="menu-card-image-fallback" aria-hidden="true">
        <span>GP</span>
      </div>`;
  }

  return `<img class="menu-card-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`;
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
    priceCurrency: '₴',
    dishImageFallback: 'Фото страви відсутнє',
    dishImageLabel: 'Фото страви',
    likesLabel: 'вподобань',
    likeButton: 'Подобається',
    unlikeButton: 'Прибрати вподобайку',
    cartButtonLabel: 'Моє замовлення',
    cartEyebrow: 'Кошик',
    cartTitle: 'Моє замовлення',
    cartTotalLabel: 'Разом',
    cartHint: 'Додайте страви через плюсик — список залишиться у вашому браузері.',
    cartCopy: 'Скопіювати замовлення',
    cartClear: 'Очистити',
    cartEmpty: 'Ще нічого не додано. Натисніть плюсик біля страви, щоб зібрати замовлення.',
    cartFabSummary: '{count} позицій · {total} ₴',
    cartRowQuantity: 'Кількість',
    cartCopied: 'Замовлення скопійовано у буфер обміну.',
    cartCopyFailed: 'Не вдалося скопіювати автоматично. Виділіть текст вручну.',
    itemAdded: 'Додано до замовлення',
    orderLine: '{name} × {quantity} — {total} ₴',
    sectionKitchen: 'Кухня',
    sectionBar: 'Бар'
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
    priceCurrency: '₴',
    dishImageFallback: 'Dish photo is not available',
    dishImageLabel: 'Dish photo',
    likesLabel: 'likes',
    likeButton: 'Like dish',
    unlikeButton: 'Remove like',
    cartButtonLabel: 'My order',
    cartEyebrow: 'Cart',
    cartTitle: 'My order',
    cartTotalLabel: 'Total',
    cartHint: 'Add dishes with the plus button — the list stays in your browser.',
    cartCopy: 'Copy order',
    cartClear: 'Clear',
    cartEmpty: 'No dishes added yet. Tap the plus button next to a dish to build the order.',
    cartFabSummary: '{count} items · {total} ₴',
    cartRowQuantity: 'Quantity',
    cartCopied: 'The order was copied to the clipboard.',
    cartCopyFailed: 'Automatic copy failed. Please select and copy the text manually.',
    itemAdded: 'Added to order',
    orderLine: '{name} × {quantity} — {total} ₴',
    sectionKitchen: 'Kitchen',
    sectionBar: 'Bar'
  }
};

function t(key, replacements = {}) {
  const dictionary = translations[currentLanguage] || translations.uk;
  const template = dictionary[key] || '';
  return Object.entries(replacements).reduce(
    (result, [name, value]) => result.replace(`{${name}}`, value),
    template
  );
}

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

const sectionOrder = ['kitchen', 'bar'];

function resolveCategorySection(categoryName) {
  const normalized = String(categoryName || '').toLowerCase();
  const barHints = [
    'bar',
    'бар',
    'напо',
    'коктей',
    'вино',
    'пиво',
    'алко',
    'drinks',
    'drink',
    'cocktail',
    'wine',
    'beer',
    'coffee',
    'tea',
    'кава',
    'чай'
  ];

  return barHints.some((hint) => normalized.includes(hint)) ? 'bar' : 'kitchen';
}

function groupMenuBySection(groupedMenu) {
  const sections = {
    kitchen: {},
    bar: {}
  };

  Object.entries(groupedMenu).forEach(([categoryName, items]) => {
    const sectionKey = resolveCategorySection(categoryName);
    sections[sectionKey][categoryName] = items;
  });

  return sections;
}

function getSectionTitle(sectionKey) {
  return sectionKey === 'bar' ? t('sectionBar') : t('sectionKitchen');
}

function renderSectionNav(groupedBySection) {
  if (!sectionNav) {
    return;
  }

  const availableSections = sectionOrder.filter((sectionKey) => Object.keys(groupedBySection[sectionKey] || {}).length);
  sectionNav.innerHTML = availableSections
    .map((sectionKey) => `
      <button
        type="button"
        class="menu-section-link${sectionKey === activeSection ? ' active' : ''}"
        data-section="${sectionKey}"
      >
        ${escapeHtml(getSectionTitle(sectionKey))}
      </button>
    `)
    .join('');
}

function renderCategories(groupedMenu) {
  const categories = Object.keys(groupedMenu);
  const shouldRerender =
    categories.length !== renderedCategories.length
    || categories.some((category, index) => renderedCategories[index] !== category);

  if (shouldRerender) {
    categoryNav.innerHTML = categories
      .map(
        (category) => `
          <a class="menu-category-link${category === activeCategory ? ' active' : ''}" href="#category-${slugify(category)}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</a>`
      )
      .join('');
    renderedCategories = categories;
  } else {
    syncActiveCategoryLink({ autoScroll: false });
  }
}

function ensureActiveCategoryVisible(activeLink) {
  if (!categoryNav || !activeLink) {
    return;
  }

  const navRect = categoryNav.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const safePadding = 20;
  const isOutsideViewport = linkRect.left < (navRect.left + safePadding)
    || linkRect.right > (navRect.right - safePadding);

  if (isOutsideViewport) {
    activeLink.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
  }
}

function syncActiveCategoryLink({ autoScroll = false } = {}) {
  if (!categoryNav) {
    return;
  }

  const nextActiveLink = activeCategory
    ? categoryNav.querySelector(`[data-category="${escapeSelectorValue(activeCategory)}"]`)
    : null;
  const currentActiveLink = categoryNav.querySelector('.menu-category-link.active');

  if (currentActiveLink && currentActiveLink !== nextActiveLink) {
    currentActiveLink.classList.remove('active');
  }

  if (nextActiveLink && !nextActiveLink.classList.contains('active')) {
    nextActiveLink.classList.add('active');
  }

  if (autoScroll && nextActiveLink) {
    ensureActiveCategoryVisible(nextActiveLink);
  }
}

function setActiveCategory(category, { shouldRender = true, autoScroll = false } = {}) {
  if (!category || activeCategory === category) {
    return;
  }

  activeCategory = category;
  if (shouldRender) {
    renderCategories(getActiveSectionMenu());
    return;
  }

  syncActiveCategoryLink({ autoScroll });
}

function setupCategoryObserver() {
  if (!categoryNav || !menuCatalog || typeof IntersectionObserver !== 'function') {
    return;
  }

  if (categorySectionObserver) {
    categorySectionObserver.disconnect();
  }

  const sections = Array.from(menuCatalog.querySelectorAll('.menu-category-block[data-category-name]'));
  if (!sections.length) {
    return;
  }

  const observerOptions = {
    root: null,
    threshold: [0.25, 0.5, 0.75],
    rootMargin: '-110px 0px -45% 0px'
  };

  categorySectionObserver = new IntersectionObserver((entries) => {
    if (isCategoryScrollSyncPaused) {
      return;
    }

    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

    if (!visible.length) {
      return;
    }

    const categoryName = visible[0].target.getAttribute('data-category-name');
    if (!categoryName) {
      return;
    }

    pendingObservedCategory = categoryName;
    if (categoryObserverAnimationFrame !== null) {
      return;
    }

    categoryObserverAnimationFrame = window.requestAnimationFrame(() => {
      categoryObserverAnimationFrame = null;
      if (!pendingObservedCategory) {
        return;
      }

      setActiveCategory(pendingObservedCategory, { shouldRender: false, autoScroll: true });
      pendingObservedCategory = '';
    });
  }, observerOptions);

  sections.forEach((section) => categorySectionObserver.observe(section));
}

function getCartQuantity(itemId) {
  return Number(cartState[String(itemId)]?.quantity || 0);
}

function getLikedState(itemId) {
  return Boolean(likedState[String(itemId)]);
}

function getActiveSectionMenu() {
  return groupMenuBySection(groupMenu(menuCache))[activeSection] || {};
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
        <section class="menu-category-block" id="category-${slugify(category)}" data-category-name="${escapeHtml(category)}">
          <div class="section-head section-head-compact">
            <div class="menu-category-title-box">
              <h2>${escapeHtml(category)}</h2>
            </div>
          </div>
          <div class="menu-card-grid">
            ${items
              .map((item) => {
                const title = getLocalizedValue(item.name);
                const description = getLocalizedValue(item.description) || category;
                const quantity = getCartQuantity(item.id);
                const liked = getLikedState(item.id);
                return `
                  <article class="menu-card-item" data-item-id="${item.id}">
                    <div class="menu-card-media-wrap">
                      ${getImageMarkup(item, title)}
                      <div class="menu-card-media-controls">
                        <button
                          class="menu-like-btn${liked ? ' is-active' : ''}"
                          type="button"
                          data-like-button
                          data-item-id="${item.id}"
                          aria-pressed="${liked ? 'true' : 'false'}"
                          aria-label="${escapeHtml(liked ? dictionary.unlikeButton : dictionary.likeButton)}"
                        >
                          <span aria-hidden="true">♥</span>
                          <span class="sr-only">${escapeHtml(liked ? dictionary.unlikeButton : dictionary.likeButton)}</span>
                        </button>
                        <div class="menu-qty-control menu-qty-control-overlay" aria-label="${escapeHtml(dictionary.cartRowQuantity)}">
                          <button type="button" class="menu-qty-btn" data-qty-action="decrease" data-item-id="${item.id}" ${quantity ? '' : 'disabled'}>−</button>
                          <span class="menu-qty-value" data-item-quantity="${item.id}">${quantity}</span>
                          <button type="button" class="menu-qty-btn is-primary" data-qty-action="increase" data-item-id="${item.id}">+</button>
                        </div>
                      </div>
                    </div>
                    <div class="menu-card-copy">
                      <div class="menu-card-head">
                        <strong class="menu-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
                        <span class="menu-price">${formatPrice(item.price)} ${dictionary.priceCurrency}</span>
                      </div>
                      <p class="menu-meta" title="${escapeHtml(description)}">${escapeHtml(description)}</p>
                      <span class="menu-card-action-note">${quantity ? escapeHtml(`${dictionary.itemAdded}: ${quantity}`) : '&nbsp;'}</span>
                    </div>
                  </article>`;
              })
              .join('')}
          </div>
        </section>`
    )
    .join('');

  setupCategoryObserver();
}

function getFlatMenuItems() {
  return menuCache.flatMap((category) => (
    Array.isArray(category.items)
      ? category.items.map((entry) => ({ ...entry, category: category.name }))
      : []
  ));
}

function getFeaturedItem() {
  const items = getFlatMenuItems();
  return [...items].sort((left, right) => {
    const likesDifference = Number(right.likesCount || 0) - Number(left.likesCount || 0);
    if (likesDifference !== 0) {
      return likesDifference;
    }

    return Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
  })[0];
}

function renderFeaturedDish() {
  const dictionary = translations[currentLanguage];
  const item = getFeaturedItem();

  if (!item) {
    featuredDishName.textContent = dictionary.menuEmpty;
    featuredDishText.textContent = dictionary.featuredPrefix;
    featuredDishCategory.textContent = '—';
    featuredDishPrice.textContent = '—';
    if (featuredDishImage) {
      featuredDishImage.hidden = true;
      featuredDishImage.removeAttribute('src');
      featuredDishImage.alt = '';
    }
    if (featuredDishImageFallback) {
      featuredDishImageFallback.hidden = false;
      featuredDishImageFallback.textContent = 'GP';
      featuredDishImageFallback.setAttribute('aria-label', dictionary.dishImageFallback);
    }
    return;
  }

  featuredDishName.textContent = getLocalizedValue(item.name);
  featuredDishText.textContent = dictionary.featuredPrefix;
  featuredDishCategory.textContent = getLocalizedValue(item.category);
  featuredDishPrice.textContent = `${formatPrice(item.price)} ${dictionary.priceCurrency}`;

  const imageUrl = getDishImage(item);
  if (featuredDishImage && featuredDishImageFallback) {
    if (imageUrl) {
      featuredDishImage.src = imageUrl;
      featuredDishImage.alt = `${dictionary.dishImageLabel}: ${getLocalizedValue(item.name)}`;
      featuredDishImage.hidden = false;
      featuredDishImageFallback.hidden = true;
    } else {
      featuredDishImage.hidden = true;
      featuredDishImage.removeAttribute('src');
      featuredDishImage.alt = '';
      featuredDishImageFallback.hidden = false;
      featuredDishImageFallback.textContent = 'GP';
      featuredDishImageFallback.setAttribute('aria-label', dictionary.dishImageFallback);
    }
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function findItemById(itemId) {
  return getFlatMenuItems().find((item) => Number(item.id) === Number(itemId)) || null;
}

function updateCartItem(itemId, nextQuantity) {
  const key = String(itemId);
  const quantity = Math.max(0, Number(nextQuantity || 0));

  if (!quantity) {
    delete cartState[key];
  } else {
    const item = findItemById(itemId);
    if (!item) {
      return;
    }

    cartState[key] = {
      itemId: Number(item.id),
      quantity,
      name: getLocalizedValue(item.name),
      price: Number(item.price || 0),
      category: getLocalizedValue(item.category)
    };
  }

  persistJsonState(CART_STORAGE_KEY, cartState);
  renderCartState();
  renderCatalog(getActiveSectionMenu());
}

function getCartEntries() {
  return Object.values(cartState)
    .map((entry) => {
      const liveItem = findItemById(entry.itemId);
      return {
        itemId: entry.itemId,
        quantity: Number(entry.quantity || 0),
        name: liveItem ? getLocalizedValue(liveItem.name) : entry.name,
        category: liveItem ? getLocalizedValue(liveItem.category) : entry.category,
        price: liveItem ? Number(liveItem.price || 0) : Number(entry.price || 0)
      };
    })
    .filter((entry) => entry.quantity > 0)
    .sort((left, right) => left.name.localeCompare(right.name, currentLanguage === 'uk' ? 'uk' : 'en'));
}

function renderCartState() {
  const entries = getCartEntries();
  const totalItems = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalPrice = entries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);

  cartFab.hidden = totalItems === 0;
  cartFabCount.textContent = totalItems;
  cartFabSummary.textContent = t('cartFabSummary', {
    count: totalItems,
    total: formatPrice(totalPrice)
  });
  cartTotalValue.textContent = `${formatPrice(totalPrice)} ${translations[currentLanguage].priceCurrency}`;

  if (!entries.length) {
    cartItems.innerHTML = `<p class="menu-cart-empty">${escapeHtml(translations[currentLanguage].cartEmpty)}</p>`;
    cartHint.textContent = translations[currentLanguage].cartHint;
    return;
  }

  cartItems.innerHTML = entries
    .map((entry) => `
      <article class="menu-cart-row">
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <p class="muted small">${escapeHtml(entry.category || '')}</p>
        </div>
        <div class="menu-cart-row-meta">
          <div class="menu-qty-control compact" aria-label="${escapeHtml(translations[currentLanguage].cartRowQuantity)}">
            <button type="button" class="menu-qty-btn" data-cart-qty-action="decrease" data-item-id="${entry.itemId}">−</button>
            <span class="menu-qty-value">${entry.quantity}</span>
            <button type="button" class="menu-qty-btn is-primary" data-cart-qty-action="increase" data-item-id="${entry.itemId}">+</button>
          </div>
          <strong>${formatPrice(entry.quantity * entry.price)} ${translations[currentLanguage].priceCurrency}</strong>
        </div>
      </article>`)
    .join('');
  cartHint.textContent = t('cartFabSummary', {
    count: totalItems,
    total: formatPrice(totalPrice)
  });
}

function openCart() {
  if (!cartDrawer) {
    return;
  }

  cartDrawer.hidden = false;
  document.body.classList.add('cart-open');
}

function closeCart() {
  if (!cartDrawer) {
    return;
  }

  cartDrawer.hidden = true;
  document.body.classList.remove('cart-open');
}

async function toggleLike(itemId) {
  const key = String(itemId);
  const nextLiked = !likedState[key];
  likedState[key] = nextLiked;
  persistJsonState(LIKES_STORAGE_KEY, likedState);

  const targetItem = findItemById(itemId);
  if (targetItem) {
    const currentLikes = Number(targetItem.likesCount || 0);
    targetItem.likesCount = nextLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
  }

  renderFeaturedDish();
  renderCatalog(getActiveSectionMenu());

  try {
    const response = await fetch(`/api/menu/items/${itemId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ liked: nextLiked })
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const payload = await response.json().catch(() => ({}));
    if (payload?.item) {
      const liveItem = findItemById(itemId);
      if (liveItem) {
        liveItem.likesCount = Number(payload.item.likesCount || 0);
      }
    }
  } catch (error) {
    likedState[key] = !nextLiked;
    persistJsonState(LIKES_STORAGE_KEY, likedState);
    if (targetItem) {
      const currentLikes = Number(targetItem.likesCount || 0);
      targetItem.likesCount = nextLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    }
  }

  renderFeaturedDish();
  renderCatalog(getActiveSectionMenu());
}

async function copyCartToClipboard() {
  const entries = getCartEntries();
  const totalPrice = entries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
  const lines = [translations[currentLanguage].cartTitle];

  entries.forEach((entry) => {
    lines.push(t('orderLine', {
      name: entry.name,
      quantity: entry.quantity,
      total: formatPrice(entry.quantity * entry.price)
    }));
  });

  lines.push(`${translations[currentLanguage].cartTotalLabel}: ${formatPrice(totalPrice)} ${translations[currentLanguage].priceCurrency}`);

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    cartHint.textContent = translations[currentLanguage].cartCopied;
  } catch (error) {
    cartHint.textContent = translations[currentLanguage].cartCopyFailed;
  }
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

  if (cartCloseButton) {
    cartCloseButton.setAttribute('aria-label', currentLanguage === 'uk' ? 'Закрити кошик' : 'Close cart');
  }

  const groupedMenu = groupMenu(menuCache);
  const menuBySection = groupMenuBySection(groupedMenu);
  const availableSections = sectionOrder.filter((sectionKey) => Object.keys(menuBySection[sectionKey] || {}).length);
  activeSection = activeSection && availableSections.includes(activeSection)
    ? activeSection
    : (availableSections[0] || 'kitchen');

  const activeSectionMenu = menuBySection[activeSection] || {};
  activeCategory = activeCategory && Object.prototype.hasOwnProperty.call(activeSectionMenu, activeCategory)
    ? activeCategory
    : (Object.keys(activeSectionMenu)[0] || '');

  renderFeaturedDish();
  renderSectionNav(menuBySection);
  renderCategories(activeSectionMenu);
  renderCatalog(activeSectionMenu);
  renderCartState();
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
  activeSection = '';
  renderedCategories = [];
  translatePage();
});

sectionNav?.addEventListener('click', (event) => {
  const sectionButton = event.target.closest('[data-section]');
  if (!sectionButton) {
    return;
  }

  const nextSection = sectionButton.dataset.section;
  if (!nextSection || nextSection === activeSection) {
    return;
  }

  const groupedMenu = groupMenu(menuCache);
  const menuBySection = groupMenuBySection(groupedMenu);
  const nextSectionMenu = menuBySection[nextSection] || {};

  activeSection = nextSection;
  activeCategory = Object.keys(nextSectionMenu)[0] || '';

  renderSectionNav(menuBySection);
  renderCategories(nextSectionMenu);
  renderCatalog(nextSectionMenu);
});

categoryNav?.addEventListener('click', (event) => {
  const link = event.target.closest('[data-category]');
  if (!link) return;
  event.preventDefault();

  const nextCategory = link.dataset.category;
  const targetId = link.getAttribute('href');
  const targetSection = targetId ? document.querySelector(targetId) : null;

  setActiveCategory(nextCategory, { shouldRender: false });

  if (!targetSection) {
    return;
  }

  isCategoryScrollSyncPaused = true;
  targetSection.scrollIntoView({ behavior: 'auto', block: 'start' });
  setTimeout(() => {
    isCategoryScrollSyncPaused = false;
  }, 420);
});

menuCatalog?.addEventListener('click', (event) => {
  const likeButton = event.target.closest('[data-like-button]');
  if (likeButton) {
    toggleLike(Number(likeButton.dataset.itemId));
    return;
  }

  const qtyButton = event.target.closest('[data-qty-action]');
  if (qtyButton) {
    const itemId = Number(qtyButton.dataset.itemId);
    const action = qtyButton.dataset.qtyAction;
    const currentQuantity = getCartQuantity(itemId);
    updateCartItem(itemId, action === 'increase' ? currentQuantity + 1 : currentQuantity - 1);
  }
});

cartItems?.addEventListener('click', (event) => {
  const qtyButton = event.target.closest('[data-cart-qty-action]');
  if (!qtyButton) {
    return;
  }

  const itemId = Number(qtyButton.dataset.itemId);
  const action = qtyButton.dataset.cartQtyAction;
  const currentQuantity = getCartQuantity(itemId);
  updateCartItem(itemId, action === 'increase' ? currentQuantity + 1 : currentQuantity - 1);
});

cartFab?.addEventListener('click', openCart);
cartBackdrop?.addEventListener('click', closeCart);
cartCloseButton?.addEventListener('click', closeCart);
cartCopyButton?.addEventListener('click', copyCartToClipboard);
cartClearButton?.addEventListener('click', () => {
  cartState = {};
  persistJsonState(CART_STORAGE_KEY, cartState);
  renderCartState();
  renderCatalog(getActiveSectionMenu());
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeCart();
  }
});

translatePage();

fetchMenu().catch(() => {
  menuCatalog.innerHTML = `<article class="surface"><p class="menu-page-description">${translations[currentLanguage].menuEmpty}</p></article>`;
  renderCartState();
});
