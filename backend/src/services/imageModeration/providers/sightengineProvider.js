// Real provider for the *unwanted-content* categories only — Sightengine's
// REST "check.json" endpoint (https://sightengine.com), called directly via
// global fetch (Node 18+, no SDK dependency): nudity-2.1, weapon,
// recreational_drug, gore-2.0, offensive-2.0.
//
// Human/person detection does NOT use this provider (or any external API) —
// it's always handled locally by localPersonDetector.js (TensorFlow.js +
// COCO-SSD), which needs no key and runs offline. This file used to also
// request the face-attributes model for that purpose; it no longer does.
//
// Swap this file (and the PROVIDER map in imageModerationService.js) to
// change providers later — nothing outside this file knows it's Sightengine.
//
// NOTE: field names below follow Sightengine's documented response shape.
// Verify against a live response once a real API key is available — this
// project currently runs in dev/mock mode (see mockProvider.js) because no
// key has been configured yet.

const { REQUEST_TIMEOUT_MS } = require('../config');

const SIGHTENGINE_URL = 'https://api.sightengine.com/1.0/check.json';
const MODELS = 'nudity-2.1,weapon,recreational_drug,gore-2.0,offensive-2.0';

function isPlaceholder(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized.includes('your_api_user') || normalized.includes('your_api_secret') || normalized.includes('change_this');
}

function getCredentials() {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (isPlaceholder(apiUser) || isPlaceholder(apiSecret)) return null;
  return { apiUser, apiSecret };
}

async function analyze({ buffer, mimeType, originalname }) {
  const credentials = getCredentials();
  if (!credentials) {
    return { ok: false, errorType: 'unconfigured', message: 'Sightengine credentials are not configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append('media', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), originalname || 'upload.jpg');
    form.append('models', MODELS);
    form.append('api_user', credentials.apiUser);
    form.append('api_secret', credentials.apiSecret);

    const response = await fetch(SIGHTENGINE_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal
    });

    if (!response.ok) {
      return { ok: false, errorType: 'http_error', message: `Sightengine responded with HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.status !== 'success') {
      return { ok: false, errorType: 'provider_error', message: data?.error?.message || 'Sightengine returned an error status' };
    }

    const categories = {
      nudity: Math.max(
        data?.nudity?.sexual_activity || 0,
        data?.nudity?.sexual_display || 0,
        data?.nudity?.erotica || 0
      ),
      weapon: Math.max(
        data?.weapon?.classes?.firearm || 0,
        data?.weapon?.classes?.firearm_gesture || 0,
        data?.weapon?.classes?.firearm_toy || 0,
        data?.weapon?.classes?.knife || 0
      ),
      drugs: data?.recreational_drug?.prob || 0,
      gore: data?.gore?.prob || 0,
      offensive: data?.offensive?.prob || 0
    };

    return { ok: true, categories };
  } catch (error) {
    const errorType = error?.name === 'AbortError' ? 'timeout' : 'network';
    return { ok: false, errorType, message: error?.message || 'Sightengine request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { analyze, getCredentials };
