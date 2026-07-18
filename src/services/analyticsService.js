const env = require('../config/env');

let client = null;

function getClient() {
  if (client !== null) return client;
  const key = env.POSTHOG_PROJECT_API_KEY;
  if (!key) {
    client = false;
    return null;
  }
  try {
    const PostHog = require('posthog-node');
    client = new PostHog(key, {
      host: env.POSTHOG_HOST || 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000
    });
  } catch (err) {
    console.error('[analytics] Failed to initialise PostHog client:', err.message);
    client = false;
    return null;
  }
  return client;
}

function capture(event, properties = {}, distinctId = 'server') {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties });
  } catch (err) {
    console.error('[analytics] capture failed:', err.message);
  }
}

function identify(distinctId, properties = {}) {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.identify({ distinctId, properties });
  } catch (err) {
    console.error('[analytics] identify failed:', err.message);
  }
}

function shutdown() {
  const ph = getClient();
  if (ph && typeof ph.shutdown === 'function') {
    try {
      ph.shutdown();
    } catch (err) {
      console.error('[analytics] shutdown failed:', err.message);
    }
  }
}

module.exports = {
  capture,
  identify,
  shutdown,
  isEnabled: () => Boolean(env.POSTHOG_PROJECT_API_KEY)
};
