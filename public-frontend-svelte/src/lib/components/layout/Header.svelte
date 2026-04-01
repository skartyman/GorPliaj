<script lang="ts">
  import { onMount } from 'svelte';

  const navItems = [
    { href: '/', label: 'Главная' },
    { href: '/events', label: 'Афиша' },
    { href: '/booking', label: 'Бронь' },
    { href: '/menu', label: 'Меню' },
    { href: '/#news', label: 'Новости' },
    { href: '/#about', label: 'Про нас' },
    { href: '/#contacts', label: 'Контакты' }
  ];

  const socialLinks = [
    { href: 'https://instagram.com', label: 'Instagram' },
    { href: 'https://t.me', label: 'Telegram' }
  ];

  let drawerOpen = false;
  let headerElement: HTMLElement | null = null;
  let headerResizeObserver: ResizeObserver | null = null;

  function openDrawer() {
    drawerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerOpen = false;
    document.body.style.overflow = '';
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  }

  onMount(() => {
    const syncHeaderHeightVar = () => {
      const nextHeight = headerElement?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--site-header-height', `${nextHeight}px`);
    };

    syncHeaderHeightVar();
    headerResizeObserver = new ResizeObserver(syncHeaderHeightVar);
    if (headerElement) {
      headerResizeObserver.observe(headerElement);
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      headerResizeObserver?.disconnect();
      document.body.style.overflow = '';
    };
  });
</script>

<header class="site-header premium-header" bind:this={headerElement}>
  <a href="/" class="header-logo" aria-label="ГорПляж">
    <img src="/icons/Logo.png" alt="Логотип ГорПляж" loading="eager" decoding="async" />
    <span>ГорПляж</span>
  </a>

  <button class="burger-btn" on:click={openDrawer} aria-label="Открыть меню" aria-expanded={drawerOpen}>☰</button>
</header>

<button
  class={`drawer-overlay ${drawerOpen ? 'is-open' : ''}`}
  on:click={closeDrawer}
  aria-label="Закрыть меню"
  aria-hidden={!drawerOpen}
></button>

<aside class={`site-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
  <div class="drawer-inner">
    <div class="drawer-top">
      <a href="/" class="drawer-brand" on:click={closeDrawer}>
        <img src="/icons/Logo.png" alt="Логотип ГорПляж" loading="lazy" decoding="async" />
        <span>ГорПляж</span>
      </a>
      <button class="drawer-close" on:click={closeDrawer} aria-label="Закрыть меню">✕</button>
    </div>

    <nav class="drawer-nav" aria-label="Мобильная навигация">
      {#each navItems as item}
        <a href={item.href} on:click={closeDrawer}>{item.label}</a>
      {/each}
    </nav>

    <div class="drawer-bottom" id="contacts">
      <a href="tel:+380000000000">+38 (000) 000-00-00</a>
      <a href="mailto:hello@gorpliaj.com">hello@gorpliaj.com</a>
      <div class="drawer-socials">
        {#each socialLinks as social}
          <a href={social.href} target="_blank" rel="noreferrer" on:click={closeDrawer}>{social.label}</a>
        {/each}
      </div>
    </div>
  </div>
</aside>
