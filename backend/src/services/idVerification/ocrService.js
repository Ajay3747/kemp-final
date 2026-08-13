const { createWorker } = require('tesseract.js');

/**
 * Runs OCR over one or more image buffers using a single shared worker
 * (creating a worker per image is unnecessarily slow — front+back share one).
 *
 * @param {Buffer[]} buffers
 * @returns {Promise<{ ok: true, results: { text: string, confidence: number }[] } | { ok: false, error: string }>}
 *   confidence is normalized to 0..1. ok:false means OCR itself could not run
 *   (e.g. no network for language data on first run) — callers must treat
 *   this as "needs review", never as a hard failure or a crash.
 */
async function runOcr(buffers) {
  let worker;
  try {
    worker = await createWorker('eng', 1, { logger: () => {} });
  } catch (error) {
    return { ok: false, error: 'OCR engine unavailable' };
  }

  try {
    const results = [];
    for (const buffer of buffers) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await worker.recognize(buffer);
      results.push({
        text: data?.text || '',
        confidence: typeof data?.confidence === 'number' ? data.confidence / 100 : 0
      });
    }
    return { ok: true, results };
  } catch (error) {
    return { ok: false, error: 'OCR processing failed' };
  } finally {
    try {
      await worker.terminate();
    } catch (_) {
      // ignore terminate errors — worker may already be dead
    }
  }
}

module.exports = { runOcr };
