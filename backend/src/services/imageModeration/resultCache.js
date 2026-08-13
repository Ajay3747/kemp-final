// Short-lived in-memory cache of moderation verdicts, keyed by the sha256 of
// the image bytes. Lets the frontend's live precheck (POST /moderate-image)
// and the real create-listing submission of the *same* file skip a second
// AI call, without ever trusting the frontend's verdict on its own —
// createProduct still re-runs the full check path, it just hits this cache
// instead of the network when the bytes are unchanged.

const crypto = require('crypto');
const { RESULT_CACHE_TTL_MS } = require('./config');

const cache = new Map(); // hash -> { result, expiresAt }

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function get(buffer) {
  const key = hashBuffer(buffer);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function set(buffer, result) {
  const key = hashBuffer(buffer);
  cache.set(key, { result, expiresAt: Date.now() + RESULT_CACHE_TTL_MS });
}

module.exports = { hashBuffer, get, set };
