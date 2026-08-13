// Single source of truth for listing-image moderation. Change thresholds,
// unwanted categories, or the active provider here only — nothing else in
// the pipeline should hardcode these values.

const PROVIDER = (process.env.IMAGE_MODERATION_PROVIDER || 'sightengine').trim().toLowerCase();

// Lets callers (the controller) pick an accurate HTTP status without
// string-matching the user-facing `reason` text.
const REASON_CODES = Object.freeze({
  INVALID_FILE: 'INVALID_FILE', // bad/oversized/wrong-format upload -> 400
  CONTENT_REJECTED: 'CONTENT_REJECTED', // human or unwanted content found -> 422
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE' // provider down/timeout/unconfigured -> 503
});

// Minimum confidence (0-1) from the local person-detection model
// (localPersonDetector.js, TensorFlow.js + COCO-SSD) before a "person"
// detection is treated as real rather than noise. Overridable via env so it
// can be tuned without a code change.
const PERSON_CONFIDENCE_THRESHOLD = Number(process.env.PERSON_CONFIDENCE_THRESHOLD) || 0.5;

// How long the (large, ~7MB) COCO-SSD model weights are allowed to take to
// download+initialize on first use.
const MODEL_LOAD_TIMEOUT_MS = 30000;

// Max width/height fed into the detection model. Downscaling large photos
// speeds up inference without materially hurting person-presence detection.
const MAX_DETECTION_DIMENSION = 640;

// Minimum provider confidence (0-1) per category before content is rejected.
// Keys map to the normalized `detectedObjects` labels used throughout the
// service. Add/remove categories here to change what gets blocked.
const UNWANTED_CATEGORY_THRESHOLDS = {
  nudity: 0.5,
  weapon: 0.5,
  drugs: 0.5,
  gore: 0.5,
  offensive: 0.5
};

const SAFE_REASONS = {
  human: 'Human/person photos are not allowed in listings. Please upload a clear photo of the product only.',
  unwanted: 'This image contains content that is not allowed for marketplace listings. Please upload a clear photo of the item.',
  invalidFile: 'The uploaded file is not a valid image.',
  unsupportedFormat: 'Only JPG, JPEG, PNG and WEBP images are allowed.',
  tooLarge: 'Image is too large. Please upload an image under 8 MB.',
  empty: 'No image was uploaded.',
  serviceUnavailable: "We couldn't verify this image. Please try again."
};

// File-level checks, run before any AI call.
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Network/timeout behavior for the provider call.
const REQUEST_TIMEOUT_MS = 12000;

// How long a moderation verdict for the exact same image bytes is reused,
// so a browse-time precheck and the actual create-listing submission don't
// pay for two AI calls on an unchanged file.
const RESULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const isDevMode = () => (process.env.NODE_ENV || 'development') !== 'production';

module.exports = {
  PROVIDER,
  REASON_CODES,
  PERSON_CONFIDENCE_THRESHOLD,
  MODEL_LOAD_TIMEOUT_MS,
  MAX_DETECTION_DIMENSION,
  UNWANTED_CATEGORY_THRESHOLDS,
  SAFE_REASONS,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  REQUEST_TIMEOUT_MS,
  RESULT_CACHE_TTL_MS,
  isDevMode
};
