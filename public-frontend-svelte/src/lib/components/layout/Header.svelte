<script lang="ts">
  import { applyLocale, locale, t, type Locale } from '$lib/stores/i18n';

  const nextLocale: Record<Locale, Locale> = { uk: 'en', en: 'uk' };

  function toggleLang() {
    applyLocale(nextLocale[$locale]);
  }
</script>

<header class="site-header">
  <a href="/" class="brand">
    <strong>ГорПляж</strong>
    <small>{$t('brandSubtitle')}</small>
  </a>

  <button class="lang-btn" on:click={toggleLang}>
    {$locale === 'uk' ? 'EN' : 'UK'}
  </button>
</header>
