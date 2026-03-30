<script lang="ts">
  import { browser } from '$app/environment';
  import Shell from '$lib/components/layout/Shell.svelte';
  import { applyLocale, detectLocale, t } from '$lib/stores/i18n';
  import '../styles.css';

  if (browser) {
    applyLocale(detectLocale());
  }
</script>

<svelte:head>
  <title>{$t('homeMetaTitle')}</title>
  <meta name="description" content={$t('homeMetaDescription')} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={$t('homeMetaTitle')} />
  <meta property="og:description" content={$t('homeMetaDescription')} />
  <meta property="og:image" content="/icons/pwa-icon-512.svg" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<Shell>
  <slot />
</Shell>
