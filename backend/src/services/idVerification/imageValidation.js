const { imageSize } = require('image-size');

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_WIDTH = 150;
const MIN_HEIGHT = 90;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

// Magic-byte signatures — the actual content is sniffed rather than trusting
// the filename extension or the client-supplied Content-Type, since either
// can be spoofed (e.g. a renamed .exe with a .jpg extension).
const SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }
];

function detectMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  const match = SIGNATURES.find(
    (sig) => buffer.length >= sig.bytes.length && sig.bytes.every((byte, i) => buffer[i] === byte)
  );
  return match ? match.mime : null;
}

function getExtension(filename) {
  const match = /\.[^./\\]+$/.exec(String(filename || ''));
  return match ? match[0].toLowerCase() : '';
}

/**
 * Validates a multer in-memory file object as an acceptable ID card image.
 *
 * @param {{ originalname?: string, size?: number, buffer: Buffer } | null} file
 * @param {string} label e.g. "Front ID card" — used in error messages
 */
function validateIdCardImage(file, label) {
  const errors = [];

  if (!file || !file.buffer) {
    errors.push(`${label} image is required.`);
    return { valid: false, errors };
  }

  if (typeof file.size === 'number' && file.size > MAX_SIZE_BYTES) {
    errors.push(`${label} image must be less than 5 MB.`);
  }

  const extensionOk = ALLOWED_EXTENSIONS.includes(getExtension(file.originalname));
  const detectedMime = detectMimeFromBuffer(file.buffer);
  const mimeOk = ALLOWED_MIME_TYPES.includes(detectedMime);

  if (!extensionOk || !mimeOk) {
    errors.push('Only JPG, JPEG and PNG images are allowed.');
  }

  let dimensions = null;
  if (mimeOk) {
    try {
      dimensions = imageSize(file.buffer);
    } catch (error) {
      errors.push(`${label} image could not be read. Please upload a valid image.`);
    }

    if (dimensions && (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT)) {
      errors.push(`${label} image is too small to read clearly. Please upload a higher-resolution photo.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    detectedMime,
    dimensions
  };
}

module.exports = {
  validateIdCardImage,
  detectMimeFromBuffer,
  MAX_SIZE_BYTES,
  MIN_WIDTH,
  MIN_HEIGHT,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES
};
