<script lang="ts">
  import { locale, dictionary, type Locale } from '$lib/stores/i18n';

  const nextLocale: Record<Locale, Locale> = { uk: 'en', en: 'uk' };

  function toggleLang() {
    $locale = nextLocale[$locale];
  }
</script>

<header class="site-header">
  <a href="/" class="brand">
    <strong>ГорПляж</strong>
    <small>{dictionary[$locale].brandSubtitle}</small>
  </a>

  <button class="lang-btn" on:click={toggleLang}>
    {$locale === 'uk' ? 'EN' : 'UK'}
  </button>
</header>
