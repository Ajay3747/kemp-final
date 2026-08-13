// Real, local, offline person/object detection for listing images.
//
// Runs entirely on this server via TensorFlow.js's pure-JS/CPU backend
// (no native bindings, no GPU, no external API/key required) using the
// COCO-SSD object-detection model. COCO-SSD is trained on real photographs
// to localize 80 everyday object classes, including "person" — it responds
// to the overall visual signature of a human (face, torso, limbs, clothing
// silhouette) at varying scale and occlusion, not just close-up facial
// features, so it catches full bodies, partial bodies, and multiple people
// in one frame, not only selfies. This is why it replaces the earlier
// filename-keyword placeholder: that was never real detection, this is.
//
// Deliberately NOT using @tensorflow/tfjs-node (native bindings, fragile to
// install/build across platforms) or a `canvas`-based pipeline — `sharp`
// (prebuilt binaries, no native compilation needed) decodes/resizes the
// image into a raw pixel buffer that's fed directly into a tf.tensor3d.

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const sharp = require('sharp');
const { REQUEST_TIMEOUT_MS, MODEL_LOAD_TIMEOUT_MS, MAX_DETECTION_DIMENSION } = require('./config');

// Loaded once per server process and reused — loading involves downloading
// ~7MB of model weights, which should not happen on every request.
let modelPromise = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.setBackend('cpu');
      await tf.ready();
      return cocoSsd.load({ base: 'lite_mobilenet_v2' });
    })().catch((error) => {
      modelPromise = null; // don't cache a failed load — allow the next call to retry
      throw error;
    });
  }
  return modelPromise;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Detects people in an image buffer using the local COCO-SSD model.
 * Never throws — resolves to:
 *   { ok: true, detections: [{ confidence }, ...] }   (one entry per person found)
 *   { ok: false, errorType, message }                  (model/decode failure)
 *
 * @param {Buffer} buffer raw image bytes (already validated as jpeg/png/webp)
 */
async function detectPersons(buffer) {
  let tensor;
  try {
    const model = await withTimeout(getModel(), MODEL_LOAD_TIMEOUT_MS, 'Person-detection model load');

    // `.rotate()` with no args applies the image's own EXIF orientation, so a
    // photo taken sideways on a phone isn't fed in rotated.
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_DETECTION_DIMENSION,
        height: MAX_DETECTION_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      .removeAlpha()
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    tensor = tf.tensor3d(data, [info.height, info.width, info.channels], 'int32');

    const predictions = await withTimeout(model.detect(tensor), REQUEST_TIMEOUT_MS, 'Person detection');

    const detections = predictions
      .filter((prediction) => prediction.class === 'person')
      .map((prediction) => ({ confidence: prediction.score }));

    return { ok: true, detections };
  } catch (error) {
    const errorType = error?.message?.includes('timed out') ? 'timeout' : 'unknown';
    return { ok: false, errorType, message: error?.message };
  } finally {
    // tfjs tensors are backed by manually-managed memory outside the JS heap
    // (even on the CPU backend) — must dispose explicitly or every upload
    // leaks memory for the life of the server process.
    if (tensor) tensor.dispose();
  }
}

// Kicks off the (slow, ~10s+) model download/load in the background without
// blocking anything — call once at server startup so the first real user
// upload doesn't pay the cold-start cost. Safe to call multiple times
// (getModel() is memoized) and never throws.
function warmUp() {
  getModel().catch((error) => {
    console.warn('[localPersonDetector] Model warm-up failed (will retry on first real request):', error?.message);
  });
}

module.exports = { detectPersons, warmUp };
