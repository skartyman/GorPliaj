<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { menuApi, type MenuCategory, type MenuItem } from '$lib/api/menu';
  import { locale, t } from '$lib/stores/i18n';

  export let data: { menuPromise: Promise<MenuCategory[]> };

  const CART_STORAGE_KEY = 'gorpliaj-menu-cart';
  const LIKES_STORAGE_KEY = 'gorpliaj-menu-likes';
  const sections: Array<'kitchen' | 'bar'> = ['kitchen', 'bar'];

  let menu: MenuCategory[] = [];
  let activeSection: 'kitchen' | 'bar' = 'kitchen';
  let activeCategory = '';
  let loading = true;
  let errorMessage = '';
  let cartOpen = false;
  let cart: Record<string, { quantity: number }> = {};
  let likes: Record<string, boolean> = {};
  let navContainer: HTMLDivElement | null = null;
  let categoryNavElement: HTMLDivElement | null = null;
  let categoryAnchors: Record<string, HTMLElement | null> = {};
  let categoryObserver: IntersectionObserver | null = null;
  let navHeight = 96;

  $: grouped = groupMenuBySection(menu, $locale);
  $: availableSections = sections.filter((section) => grouped[section].length > 0);
  $: if (availableSections.length && !availableSections.includes(activeSection)) {
    activeSection = availableSections[0];
  }
  $: categories = grouped[activeSection] || [];
  $: if (categories.length && !categories.some((entry) => entry.categoryKey === activeCategory)) {
    activeCategory = categories[0].categoryKey;
  }
  $: if (browser) {
    categoryAnchors = {};
    setupCategoryObserver();
  }
  $: cartEntries = getCartEntries(menu, cart, $locale);
  $: cartTotalItems = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  $: cartTotalPrice = cartEntries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);

  onMount(() => {
    if (browser) {
      cart = loadState(CART_STORAGE_KEY);
      likes = loadState(LIKES_STORAGE_KEY);
    }

    data.menuPromise
      .then((payload) => {
        menu = payload;
        loading = false;
      })
      .catch((error) => {
        errorMessage = error instanceof Error ? error.message : 'Failed to load menu.';
        loading = false;
      });

    if (browser) {
      const recalcNavHeight = () => {
        navHeight = navContainer?.offsetHeight || 96;
      };

      recalcNavHeight();
      window.addEventListener('resize', recalcNavHeight);

      return () => {
        window.removeEventListener('resize', recalcNavHeight);
        categoryObserver?.disconnect();
      };
    }
  });

  function loadState(key: string) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  }

  function persistState(key: string, value: Record<string, unknown>) {
    if (!browser) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function localizedText(value: string | Record<string, string> | undefined, currentLocale: 'uk' | 'en') {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[currentLocale] || value.uk || value.en || '';
  }

  function resolveCategorySection(categoryName: string, sectionKey?: string): 'kitchen' | 'bar' {
    const explicit = String(sectionKey || '').toLowerCase();
    if (explicit === 'bar' || explicit === 'kitchen') return explicit;

    const normalized = categoryName.toLowerCase();
    const barHints = ['bar', 'бар', 'напо', 'коктей', 'вино', 'пиво', 'alco', 'drink', 'coffee', 'tea', 'кава', 'чай'];
    return barHints.some((hint) => normalized.includes(hint)) ? 'bar' : 'kitchen';
  }

  function groupMenuBySection(menuData: MenuCategory[], currentLocale: 'uk' | 'en') {
    const base = { kitchen: [] as Array<{ categoryLabel: string; categoryKey: string; items: MenuItem[] }>, bar: [] as Array<{ categoryLabel: string; categoryKey: string; items: MenuItem[] }> };

    for (const category of menuData) {
      const categoryLabel = localizedText(category.name, currentLocale);
      const items = Array.isArray(category.items) ? category.items : [];
      if (!categoryLabel || !items.length) continue;

      const section = resolveCategorySection(categoryLabel, category.section);
      base[section].push({ categoryLabel, categoryKey: categoryLabel, items });
    }

    return base;
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat($locale === 'uk' ? 'uk-UA' : 'en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function getQuantity(itemId: number) {
    return Number(cart[String(itemId)]?.quantity || 0);
  }

  function updateQuantity(itemId: number, delta: number) {
    const key = String(itemId);
    const nextQty = Math.max(0, getQuantity(itemId) + delta);
    if (!nextQty) {
      delete cart[key];
    } else {
      cart[key] = { quantity: nextQty };
    }

    cart = { ...cart };
    persistState(CART_STORAGE_KEY, cart);
  }

  function getCartEntries(menuData: MenuCategory[], state: Record<string, { quantity: number }>, currentLocale: 'uk' | 'en') {
    const itemMap = new Map<number, { name: string; category: string; price: number }>();

    for (const category of menuData) {
      const categoryLabel = localizedText(category.name, currentLocale);
      for (const item of category.items || []) {
        itemMap.set(item.id, {
          name: localizedText(item.name, currentLocale),
          category: categoryLabel,
          price: Number(item.price || 0)
        });
      }
    }

    return Object.entries(state)
      .map(([itemId, payload]) => {
        const item = itemMap.get(Number(itemId));
        if (!item || !payload?.quantity) return null;
        return { itemId: Number(itemId), ...item, quantity: payload.quantity };
      })
      .filter(Boolean) as Array<{ itemId: number; name: string; category: string; price: number; quantity: number }>;
  }

  async function toggleLike(itemId: number) {
    const key = String(itemId);
    const nextLiked = !likes[key];
    likes[key] = nextLiked;
    likes = { ...likes };
    persistState(LIKES_STORAGE_KEY, likes);

    menu = menu.map((category) => ({
      ...category,
      items: category.items.map((item) => (item.id === itemId
        ? { ...item, likesCount: Math.max(0, Number(item.likesCount || 0) + (nextLiked ? 1 : -1)) }
        : item))
    }));

    try {
      const response = await menuApi.setLike(itemId, nextLiked);
      menu = menu.map((category) => ({
        ...category,
        items: category.items.map((item) => (item.id === itemId
          ? { ...item, likesCount: Number(response.item.likesCount || 0) }
          : item))
      }));
    } catch {
      likes[key] = !nextLiked;
      likes = { ...likes };
      persistState(LIKES_STORAGE_KEY, likes);
    }
  }

  async function copyOrder() {
    const lines = [String($t('menuCartTitle'))];

    for (const entry of cartEntries) {
      lines.push(`${entry.name} × ${entry.quantity} — ${formatPrice(entry.quantity * entry.price)} ₴`);
    }

    lines.push(`${$t('menuCartTotal')}: ${formatPrice(cartTotalPrice)} ₴`);

    await navigator.clipboard.writeText(lines.join('\n'));
  }

  function setupCategoryObserver() {
    if (!browser) return;

    categoryObserver?.disconnect();
    categoryObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (!visible.length) return;
        const currentKey = visible[0].target.getAttribute('data-category-key');
        if (currentKey) {
          activeCategory = currentKey;
          scrollActiveChipIntoView();
        }
      },
      {
        root: null,
        rootMargin: `-${navHeight + 8}px 0px -65% 0px`,
        threshold: [0.15, 0.4, 0.7]
      }
    );

    requestAnimationFrame(() => {
      Object.values(categoryAnchors).forEach((element) => {
        if (element) {
          categoryObserver?.observe(element);
        }
      });
    });
  }

  function scrollToCategory(categoryKey: string) {
    activeCategory = categoryKey;
    const target = categoryAnchors[categoryKey];
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 14;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    scrollActiveChipIntoView();
  }

  function scrollActiveChipIntoView() {
    if (!categoryNavElement || !activeCategory) return;
    const activeChip = categoryNavElement.querySelector<HTMLButtonElement>(`button[data-category-chip="${CSS.escape(activeCategory)}"]`);
    activeChip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function selectSection(section: 'kitchen' | 'bar') {
    activeSection = section;
    const first = grouped[section][0]?.categoryKey;
    if (first) {
      activeCategory = first;
      requestAnimationFrame(() => {
        setupCategoryObserver();
        scrollToCategory(first);
      });
    }
  }
</script>

<svelte:head>
  <title>{$t('menuMetaTitle')}</title>
  <meta name="description" content={$t('menuMetaDescription')} />
</svelte:head>

<section class="page-block menu-page">
  <h1>{$t('menuTitle')}</h1>
  <p class="muted">{$t('menuSubtitle')}</p>

  {#if loading}
    <div class="state">{$t('menuLoading')}</div>
  {:else if errorMessage}
    <div class="state state-error">{$t('menuError')}</div>
  {:else if !menu.length}
    <div class="state">{$t('menuEmpty')}</div>
  {:else}
    <div class="menu-sticky-nav" bind:this={navContainer}>
      <div class="menu-section-nav">
        {#each sections as section}
          <button
            type="button"
            class={`menu-chip menu-chip-section ${activeSection === section ? 'is-active' : ''}`}
            on:click={() => selectSection(section)}
            disabled={!grouped[section].length}
          >
            {section === 'kitchen' ? $t('menuSectionKitchen') : $t('menuSectionBar')}
          </button>
        {/each}
      </div>

      <div class="menu-category-nav" bind:this={categoryNavElement}>
        {#each categories as category}
          <button
            type="button"
            class={`menu-chip menu-chip-category ${activeCategory === category.categoryKey ? 'is-active' : ''}`}
            data-category-chip={category.categoryKey}
            on:click={() => scrollToCategory(category.categoryKey)}
          >
            {category.categoryLabel}
          </button>
        {/each}
      </div>
    </div>

    <div class="menu-section-content">
      {#each categories as category}
        <section
          class="menu-category-block"
          data-category-key={category.categoryKey}
          bind:this={categoryAnchors[category.categoryKey]}
        >
          <h2 class="menu-category-title">{category.categoryLabel}</h2>
          <div class="menu-grid">
            {#each category.items as item}
              <article class="menu-card">
                <div class="menu-card-main">
                  <div class="menu-card-body">
                    <strong class="menu-title">{localizedText(item.name, $locale)}</strong>
                    <p class="muted menu-description">{localizedText(item.description, $locale)}</p>
                  </div>

                  <span class="menu-price">{formatPrice(Number(item.price || 0))} ₴</span>

                  <div class="menu-image-wrap">
                    {#if item.imageUrl}
                      <img src={item.imageUrl} alt={localizedText(item.name, $locale)} class="menu-image" loading="lazy" />
                    {:else}
                      <div class="menu-image-fallback">GP</div>
                    {/if}
                  </div>
                </div>

                <div class="menu-card-footer">
                  <button
                    type="button"
                    class={`menu-like ${likes[String(item.id)] ? 'is-active' : ''}`}
                    on:click={() => toggleLike(item.id)}
                    aria-label={$t('menuLike')}
                  >♥ {item.likesCount || 0}</button>
                  <div class="menu-qty">
                    <button type="button" on:click={() => updateQuantity(item.id, -1)} disabled={getQuantity(item.id) === 0}>−</button>
                    <span>{getQuantity(item.id)}</span>
                    <button type="button" on:click={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</section>

{#if cartTotalItems > 0}
  <button type="button" class="menu-cart-fab" on:click={() => (cartOpen = true)}>
    <strong>{$t('menuCartTitle')}</strong>
    <span>{cartTotalItems} · {formatPrice(cartTotalPrice)} ₴</span>
  </button>
{/if}

{#if cartOpen}
  <div class="menu-cart-overlay" role="dialog" aria-modal="true">
    <button class="menu-cart-backdrop" on:click={() => (cartOpen = false)} aria-label="Close"></button>
    <section class="menu-cart-panel">
      <h2>{$t('menuCartTitle')}</h2>
      {#each cartEntries as entry}
        <div class="menu-cart-row">
          <div>
            <strong>{entry.name}</strong>
            <p class="muted">{entry.category}</p>
          </div>
          <div class="menu-qty">
            <button type="button" on:click={() => updateQuantity(entry.itemId, -1)}>−</button>
            <span>{entry.quantity}</span>
            <button type="button" on:click={() => updateQuantity(entry.itemId, 1)}>+</button>
          </div>
        </div>
      {/each}
      <p><strong>{$t('menuCartTotal')}: {formatPrice(cartTotalPrice)} ₴</strong></p>
      <div class="hero-cta">
        <button class="btn btn-secondary" type="button" on:click={copyOrder}>{$t('menuCartCopy')}</button>
        <button class="btn" type="button" on:click={() => { cart = {}; persistState(CART_STORAGE_KEY, cart); }}>{$t('menuCartClear')}</button>
      </div>
    </section>
  </div>
{/if}
