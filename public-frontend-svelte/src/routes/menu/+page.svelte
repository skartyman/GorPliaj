<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import { menuApi, type MenuCategory, type MenuItem } from '$lib/api/menu';
  import { cartStore } from '$lib/stores/cart';
  import { locale, t } from '$lib/stores/i18n';

  export let data: { menuPromise: Promise<MenuCategory[]> };

  const LIKES_STORAGE_KEY = 'gorpliaj-menu-likes';
  const sections: Array<'kitchen' | 'bar'> = ['kitchen', 'bar'];

  let menu: MenuCategory[] = [];
  let activeSection: 'kitchen' | 'bar' = 'kitchen';
  let activeCategory = '';
  let loading = true;
  let errorMessage = '';
  let cartOpen = false;
  let likes: Record<string, boolean> = {};
  let sectionNavElement: HTMLDivElement | null = null;
  let categoryNavElement: HTMLDivElement | null = null;
  let categoryButtons = new Map<string, HTMLButtonElement>();
  let sectionNodes = new Map<string, HTMLElement>();
  let categoryObserver: IntersectionObserver | null = null;
  let sectionNavHeight = 44;
  let categoryNavHeight = 44;
  let navStackHeight = 88;
  let headerHeight = 0;
  let observerEntries = new Map<string, IntersectionObserverEntry>();
  let lastScrolledCategory = '';
  let isProgrammaticScroll = false;
  let programmaticScrollTargetY: number | null = null;
  let programmaticScrollResetTimer: ReturnType<typeof setTimeout> | null = null;
  let activeCategoryChangedAt = 0;

  $: grouped = groupMenuBySection(menu, $locale);
  $: availableSections = sections.filter((section) => grouped[section].length > 0);
  $: if (availableSections.length && !availableSections.includes(activeSection)) {
    activeSection = availableSections[0];
  }
  $: categories = grouped[activeSection] || [];
  $: if (categories.length && !categories.some((entry) => entry.categoryKey === activeCategory)) {
    activeCategory = categories[0].categoryKey;
  }
  $: cartEntries = getCartEntries(menu, $cartStore, $locale);
  $: cartTotalItems = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  $: cartTotalPrice = cartEntries.reduce((sum, entry) => sum + entry.quantity * entry.price, 0);
  $: cartQuantities = $cartStore;
  $: stickyTop = headerHeight;
  $: contentAnchorOffset = headerHeight + navStackHeight;
  $: sectionScrollMarginTop = `${contentAnchorOffset + 16}px`;
  $: navSpacerHeight = navStackHeight + 10;
  $: if (browser && activeCategory && activeCategory !== lastScrolledCategory) {
    scrollActiveChipIntoView('smooth');
    lastScrolledCategory = activeCategory;
  }

  onMount(() => {
    if (browser) {
      cartStore.hydrate();
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
      const recalcStickyHeights = () => {
        const headerElement = document.querySelector('.site-header') as HTMLElement | null;
        headerHeight = Math.round(headerElement?.getBoundingClientRect().height || 0);
        sectionNavHeight = sectionNavElement?.offsetHeight || 44;
        categoryNavHeight = categoryNavElement?.offsetHeight || 44;
        navStackHeight = sectionNavHeight + categoryNavHeight;
        setupCategoryObserver();
      };

      recalcStickyHeights();
      setupCategoryObserver();
      window.addEventListener('resize', recalcStickyHeights);

      return () => {
        window.removeEventListener('resize', recalcStickyHeights);
      };
    }
  });

  onDestroy(() => {
    categoryObserver?.disconnect();
    if (programmaticScrollResetTimer) {
      clearTimeout(programmaticScrollResetTimer);
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

  function updateQuantity(itemId: number, delta: number) {
    cartStore.updateQuantity(itemId, delta);
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

  function getCategoryByAnchor() {
    const anchorY = headerHeight + sectionNavHeight + categoryNavHeight + 8;
    const candidates = categories
      .map((category) => {
        const element = sectionNodes.get(category.categoryKey);
        const entry = observerEntries.get(category.categoryKey);
        if (!element || !entry) return null;
        return {
          key: category.categoryKey,
          top: entry.boundingClientRect.top,
          intersecting: entry.isIntersecting
        };
      })
      .filter(Boolean) as Array<{ key: string; top: number; intersecting: boolean }>;

    if (!candidates.length) return null;

    const intersecting = candidates.filter((candidate) => candidate.intersecting);
    if (intersecting.length) {
      return intersecting.sort((a, b) => Math.abs(a.top - anchorY) - Math.abs(b.top - anchorY))[0].key;
    }

    const passed = candidates.filter((candidate) => candidate.top <= anchorY + 1).sort((a, b) => b.top - a.top);
    if (passed.length) return passed[0].key;
    return candidates.sort((a, b) => a.top - b.top)[0].key;
  }

  function setupCategoryObserver() {
    if (!browser) return;

    categoryObserver?.disconnect();
    observerEntries.clear();
    if (!sectionNodes.size) return;

    categoryObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.getAttribute('data-category-key');
          if (!key) return;
          observerEntries.set(key, entry);
        });

        const currentKey = getCategoryByAnchor();
        if (!currentKey) return;

        if (isProgrammaticScroll) {
          if (programmaticScrollTargetY !== null && Math.abs(window.scrollY - programmaticScrollTargetY) < 8) {
            isProgrammaticScroll = false;
            programmaticScrollTargetY = null;
          } else {
            return;
          }
        }

        const now = Date.now();
        if (currentKey !== activeCategory && now - activeCategoryChangedAt > 120) {
          activeCategory = currentKey;
          activeCategoryChangedAt = now;
        }
      },
      {
        root: null,
        rootMargin: `-${contentAnchorOffset + 8}px 0px -55% 0px`,
        threshold: [0, 0.15, 0.35, 0.6, 0.85, 1]
      }
    );

    sectionNodes.forEach((element) => {
      categoryObserver?.observe(element);
    });
  }

  function scrollToCategory(categoryKey: string) {
    activeCategory = categoryKey;
    const target = sectionNodes.get(categoryKey);
    if (!target) return;
    isProgrammaticScroll = true;
    if (programmaticScrollResetTimer) {
      clearTimeout(programmaticScrollResetTimer);
    }

    const top = target.getBoundingClientRect().top + window.scrollY - contentAnchorOffset - 16;
    programmaticScrollTargetY = Math.max(0, top);
    window.scrollTo({ top: programmaticScrollTargetY, behavior: 'smooth' });
    scrollActiveChipIntoView('smooth');

    programmaticScrollResetTimer = setTimeout(() => {
      isProgrammaticScroll = false;
      programmaticScrollTargetY = null;
    }, 700);
  }

  function scrollActiveChipIntoView(behavior: ScrollBehavior = 'auto') {
    if (!categoryNavElement || !activeCategory) return;
    const activeChip = categoryButtons.get(activeCategory);
    if (!activeChip) return;

    const containerRect = categoryNavElement.getBoundingClientRect();
    const chipRect = activeChip.getBoundingClientRect();
    const nextLeft = categoryNavElement.scrollLeft + (chipRect.left - containerRect.left) - (containerRect.width - chipRect.width) / 2;
    categoryNavElement.scrollTo({ left: Math.max(0, nextLeft), behavior });
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

  function bindCategoryButton(node: HTMLButtonElement, categoryKey: string) {
    categoryButtons.set(categoryKey, node);
    return {
      destroy() {
        categoryButtons.delete(categoryKey);
      }
    };
  }

  function bindCategorySection(node: HTMLElement, categoryKey: string) {
    sectionNodes.set(categoryKey, node);
    setupCategoryObserver();
    return {
      destroy() {
        sectionNodes.delete(categoryKey);
        categoryObserver?.unobserve(node);
      }
    };
  }
</script>

<svelte:head>
  <title>{$t('menuMetaTitle')}</title>
  <meta name="description" content={$t('menuMetaDescription')} />
</svelte:head>

<section class="page-block menu-page">
  {#if loading}
    <div class="state">{$t('menuLoading')}</div>
  {:else if errorMessage}
    <div class="state state-error">{$t('menuError')}</div>
  {:else if !menu.length}
    <div class="state">{$t('menuEmpty')}</div>
  {:else}
    <div class="menu-fixed-navs" style:top={`${stickyTop}px`}>
      <div class="menu-section-nav" bind:this={sectionNavElement}>
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

      <div class="menu-category-nav menu-category-sticky" bind:this={categoryNavElement}>
          {#each categories as category}
            <button
              type="button"
              class={`menu-chip menu-chip-category ${activeCategory === category.categoryKey ? 'is-active' : ''}`}
              data-category-chip={category.categoryKey}
              use:bindCategoryButton={category.categoryKey}
              on:click={() => scrollToCategory(category.categoryKey)}
            >
              {category.categoryLabel}
            </button>
          {/each}
      </div>
    </div>
    <div class="menu-fixed-navs-spacer" style:height={`${navSpacerHeight}px`} aria-hidden="true"></div>

    <h1>{$t('menuTitle')}</h1>
    <p class="muted">{$t('menuSubtitle')}</p>

    <div class="menu-section-content">
      {#each categories as category}
        <section
          class="menu-category-block"
          data-category-key={category.categoryKey}
          style:scroll-margin-top={sectionScrollMarginTop}
          use:bindCategorySection={category.categoryKey}
        >
          <h2 class="menu-category-title">{category.categoryLabel}</h2>
          <div class="menu-grid">
            {#each category.items as item}
              {@const quantity = Number(cartQuantities[String(item.id)]?.quantity || 0)}
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
                    <button type="button" on:click={() => updateQuantity(item.id, -1)} disabled={quantity === 0}>−</button>
                    <span>{quantity}</span>
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
        <button class="btn" type="button" on:click={() => cartStore.clear()}>{$t('menuCartClear')}</button>
      </div>
    </section>
  </div>
{/if}
