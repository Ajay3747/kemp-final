// File-level validation for listing images, run before any AI call so
// obviously-invalid uploads never reach (or pay for) the moderation API.
// Mirrors the magic-byte sniffing approach used in
// services/idVerification/imageValidation.js — content-type is sniffed from
// the actual bytes rather than trusted from the filename or client header,
// since either can be spoofed.

const { MAX_IMAGE_SIZE_BYTES, ALLOWED_MIME_TYPES, SAFE_REASONS, REASON_CODES } = require('./config');

const SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP: 'RIFF' .... 'WEBP' — the 4 size bytes at offset 4 vary per file.
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, extra: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } }
];

function detectMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  for (const sig of SIGNATURES) {
    const start = sig.offset || 0;
    if (buffer.length < start + sig.bytes.length) continue;
    const matches = sig.bytes.every((byte, i) => buffer[start + i] === byte);
    if (!matches) continue;

    if (sig.extra) {
      const extraStart = sig.extra.offset;
      if (buffer.length < extraStart + sig.extra.bytes.length) continue;
      const extraMatches = sig.extra.bytes.every((byte, i) => buffer[extraStart + i] === byte);
      if (!extraMatches) continue;
    }

    return sig.mime;
  }

  return null;
}

/**
 * Validates a multer in-memory file object as an acceptable listing image.
 * Returns { valid, reason, detectedMime } — never throws.
 *
 * @param {{ originalname?: string, size?: number, buffer: Buffer } | null} file
 */
function validateListingImage(file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    return { valid: false, reason: SAFE_REASONS.empty, code: REASON_CODES.INVALID_FILE, detectedMime: null };
  }

  if (typeof file.size === 'number' && file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, reason: SAFE_REASONS.tooLarge, code: REASON_CODES.INVALID_FILE, detectedMime: null };
  }

  const detectedMime = detectMimeFromBuffer(file.buffer);

  if (!detectedMime) {
    return { valid: false, reason: SAFE_REASONS.invalidFile, code: REASON_CODES.INVALID_FILE, detectedMime: null };
  }

  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return { valid: false, reason: SAFE_REASONS.unsupportedFormat, code: REASON_CODES.INVALID_FILE, detectedMime };
  }

  return { valid: true, reason: null, code: null, detectedMime };
}

module.exports = {
  validateListingImage,
  detectMimeFromBuffer
};
