<script lang="ts">
  import { page } from '$app/stores';
  import { t } from '$lib/stores/i18n';
  import { classNames } from '$lib/utils/classNames';

  const links = [
    { href: '/', key: 'navHome' },
    { href: '/events', key: 'navEvents' },
    { href: '/booking', key: 'navBooking' },
    { href: '/map', key: 'navMap' },
    { href: '/about', key: 'navAbout' }
  ];
</script>

<nav class="bottom-nav" aria-label="Primary">
  {#each links as link}
    <a href={link.href} class={classNames('bottom-link', $page.url.pathname === link.href && 'is-active')}>
      {$t(link.key)}
    </a>
  {/each}
</nav>
