import posthog from 'posthog-js';

const apiKey = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';

function doNotTrackEnabled() {
  if (typeof navigator === 'undefined') return false;
  const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  return dnt === '1' || dnt === 'yes' || dnt === 'true';
}

let initialised = false;

export function initAnalytics() {
  if (initialised || !apiKey || doNotTrackEnabled()) return;
  try {
    posthog.init(apiKey, {
      api_host: host,
      capture_pageview: true,
      persistence: 'localStorage',
      cross_subdomain_cookie: false,
      loaded: () => {
        initialised = true;
      }
    });
  } catch (err) {
    console.error('[analytics] init failed:', err);
  }
}

export function captureAnalytics(event, properties = {}) {
  if (!apiKey || doNotTrackEnabled() || !initialised) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    console.error('[analytics] capture failed:', err);
  }
}

export function identifyAnalytics(distinctId, properties = {}) {
  if (!apiKey || doNotTrackEnabled() || !initialised) return;
  try {
    posthog.identify(distinctId, properties);
  } catch (err) {
    console.error('[analytics] identify failed:', err);
  }
}

export function resetAnalytics() {
  if (!apiKey || !initialised) return;
  try {
    posthog.reset();
  } catch (err) {
    console.error('[analytics] reset failed:', err);
  }
}

export function getDistinctId() {
  if (!apiKey || !initialised) return null;
  try {
    return posthog.get_distinct_id();
  } catch (err) {
    return null;
  }
}

export function captureException(error, properties = {}) {
  if (!apiKey || !initialised) return;
  try {
    posthog.captureException(error, properties);
  } catch (err) {
    console.error('[analytics] captureException failed:', err);
  }
}
