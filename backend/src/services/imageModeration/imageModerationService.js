// Orchestrates listing-image moderation:
//   file validation -> cache lookup -> LOCAL person detection (always, no
//   config needed) -> [only if no person found] unwanted-content category
//   provider -> threshold decision.
// This is the only module the rest of the app should import (controllers
// must not talk to the detector/providers directly).
//
// Contract: moderateListingImage() never throws and always resolves to
//   { allowed, humanDetected, unwantedContentDetected, detectedObjects, reason }
// so callers can handle every outcome (valid file, rejected content, or a
// moderation-service failure) the same way.

const { validateListingImage } = require('./imageValidation');
const resultCache = require('./resultCache');
// Imported as a namespace (not destructured) so tests can stub
// localPersonDetector.detectPersons via node:test's mock.method — a
// destructured reference would capture the real function before any mock
// is applied.
const localPersonDetector = require('./localPersonDetector');
const mockProvider = require('./providers/mockProvider');
const sightengineProvider = require('./providers/sightengineProvider');
const {
  PERSON_CONFIDENCE_THRESHOLD,
  UNWANTED_CATEGORY_THRESHOLDS,
  SAFE_REASONS,
  REASON_CODES,
  PROVIDER,
  isDevMode
} = require('./config');

const PROVIDERS = {
  sightengine: sightengineProvider,
  mock: mockProvider
};

function buildResult({ allowed, humanDetected = false, unwantedContentDetected = false, detectedObjects = [], reason = null, code = null }) {
  // `code` is an internal-only field (not in the user-facing contract) that
  // lets the controller pick an accurate HTTP status without string-matching
  // the human-readable `reason`.
  return { allowed, humanDetected, unwantedContentDetected, detectedObjects, reason, code };
}

// True only when the configured PROVIDER exposes real, non-placeholder
// credentials. mockProvider intentionally has no getCredentials(), so this
// is always false for it — mock mode can never be "configured" into prod.
function isRealProviderConfigured() {
  const provider = PROVIDERS[PROVIDER];
  return Boolean(provider && typeof provider.getCredentials === 'function' && provider.getCredentials());
}

function unwantedContentFromCategories(categories) {
  const detectedObjects = [];
  let unwantedContentDetected = false;

  for (const [category, threshold] of Object.entries(UNWANTED_CATEGORY_THRESHOLDS)) {
    const score = categories?.[category] ?? 0;
    if (score >= threshold) {
      unwantedContentDetected = true;
      detectedObjects.push(category);
    }
  }

  if (unwantedContentDetected) {
    return buildResult({ allowed: false, unwantedContentDetected, detectedObjects, reason: SAFE_REASONS.unwanted, code: REASON_CODES.CONTENT_REJECTED });
  }
  return buildResult({ allowed: true });
}

/**
 * Moderates a single listing image (a multer in-memory file object).
 * @param {{ originalname?: string, size?: number, mimetype?: string, buffer: Buffer }} file
 */
async function moderateListingImage(file) {
  const validation = validateListingImage(file);
  if (!validation.valid) {
    return buildResult({ allowed: false, reason: validation.reason, code: validation.code });
  }

  const cached = resultCache.get(file.buffer);
  if (cached) return cached;

  // ── 1. Human/person detection — always runs, always local, never gated by
  // provider configuration. This is the check that must be impossible to
  // silently skip, since it's the one the marketplace can never afford to
  // get wrong.
  const personResult = await localPersonDetector.detectPersons(file.buffer);

  if (!personResult.ok) {
    console.error(`[imageModerationService] person detection failed (${personResult.errorType || 'unknown'}): ${personResult.message || 'no details'}`);
    return buildResult({ allowed: false, reason: SAFE_REASONS.serviceUnavailable, code: REASON_CODES.SERVICE_UNAVAILABLE });
  }

  const humanDetected = personResult.detections.some((d) => d.confidence >= PERSON_CONFIDENCE_THRESHOLD);

  if (humanDetected) {
    const result = buildResult({
      allowed: false,
      humanDetected: true,
      detectedObjects: ['person'],
      reason: SAFE_REASONS.human,
      code: REASON_CODES.CONTENT_REJECTED
    });
    resultCache.set(file.buffer, result);
    return result;
  }

  // ── 2. Unwanted-content categories (nudity/weapon/drugs/gore/offensive) —
  // only reached once we know no person is present. Goes through the
  // configurable external provider (Sightengine when configured), or the
  // dev-only mock, exactly as before.
  const useRealProvider = isRealProviderConfigured();

  if (!useRealProvider) {
    if (!isDevMode()) {
      console.error(`[imageModerationService] Provider "${PROVIDER}" is not configured and NODE_ENV=production — rejecting image (fail-safe).`);
      return buildResult({ allowed: false, reason: SAFE_REASONS.serviceUnavailable, code: REASON_CODES.SERVICE_UNAVAILABLE });
    }
    console.warn('[imageModerationService] DEV BYPASS MODE active for unwanted-content categories (no real provider API key configured) — this does NOT affect human detection, which always runs locally. See providers/mockProvider.js.');
  }

  const provider = useRealProvider ? PROVIDERS[PROVIDER] : mockProvider;

  let raw;
  try {
    raw = await provider.analyze({
      buffer: file.buffer,
      mimeType: validation.detectedMime,
      originalname: file.originalname
    });
  } catch (error) {
    raw = { ok: false, errorType: 'unknown', message: error?.message };
  }

  if (!raw || raw.ok !== true) {
    console.error(`[imageModerationService] category provider call failed (${raw?.errorType || 'unknown'}): ${raw?.message || 'no details'}`);
    return buildResult({ allowed: false, reason: SAFE_REASONS.serviceUnavailable, code: REASON_CODES.SERVICE_UNAVAILABLE });
  }

  const result = unwantedContentFromCategories(raw.categories);
  resultCache.set(file.buffer, result);
  return result;
}

module.exports = { moderateListingImage };
