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

  let drawerOpen = false;
  let closeStartX = 0;

  function openDrawer() {
    drawerOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerOpen = false;
    document.body.style.overflow = '';
  }

  function onPanelTouchStart(event: TouchEvent) {
    closeStartX = event.touches[0]?.clientX || 0;
  }

  function onPanelTouchEnd(event: TouchEvent) {
    const endX = event.changedTouches[0]?.clientX || closeStartX;
    if (endX - closeStartX > 64) {
      closeDrawer();
    }
  }

  function onEdgeTouchStart(event: TouchEvent) {
    const startX = event.touches[0]?.clientX || 0;
    if (window.innerWidth - startX <= 28) {
      openDrawer();
    }
  }

  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

<header class="site-header premium-header">
  <div class="header-spacer" aria-hidden="true"></div>
  <a href="/" class="header-logo" aria-label="ГорПляж">ГорПляж</a>
  <button class="burger-btn" on:click={openDrawer} aria-label="Открыть меню" aria-expanded={drawerOpen}>☰</button>
</header>

{#if !drawerOpen}
  <div class="drawer-edge" on:touchstart={onEdgeTouchStart} aria-hidden="true"></div>
{/if}

<button
  class={`drawer-overlay ${drawerOpen ? 'is-open' : ''}`}
  on:click={closeDrawer}
  aria-label="Закрыть меню"
  aria-hidden={!drawerOpen}
></button>

<aside
  class={`site-drawer ${drawerOpen ? 'is-open' : ''}`}
  on:touchstart={onPanelTouchStart}
  on:touchend={onPanelTouchEnd}
  aria-hidden={!drawerOpen}
>
  <nav class="drawer-nav" aria-label="Мобильная навигация">
    {#each navItems as item}
      <a href={item.href} on:click={closeDrawer}>{item.label}</a>
    {/each}
  </nav>
</aside>
