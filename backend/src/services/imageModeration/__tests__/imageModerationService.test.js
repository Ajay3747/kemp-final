// Unit tests for the listing-image moderation pipeline.
//
// The real person-detection model (localPersonDetector.js, TensorFlow.js +
// COCO-SSD) is deliberately NOT exercised here: it needs to download ~7MB of
// model weights on first use and runs actual neural-network inference,
// which is slow, needs network access on a cold cache, and isn't
// deterministic-by-design test material. Instead, localPersonDetector's
// detectPersons() is stubbed via node:test's built-in mock.method, so these
// tests cover the real orchestration logic (validation -> cache -> person
// check -> category check -> threshold decision) fast and deterministically.
//
// Real-model verification is a separate, manual step — see
// backend/scripts/test-person-detection.js, which runs the actual model
// against a real photo you provide.

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'development';
delete process.env.SIGHTENGINE_API_USER;
delete process.env.SIGHTENGINE_API_SECRET;
delete process.env.PERSON_CONFIDENCE_THRESHOLD; // keep the default (0.5) in effect

const { moderateListingImage } = require('../imageModerationService');
const localPersonDetector = require('../localPersonDetector');
const { validateListingImage } = require('../imageValidation');

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makePngBuffer(seed) {
  return Buffer.concat([PNG_HEADER, Buffer.from(seed.padEnd(64, '0'))]);
}

function makeFile(originalname, overrides = {}) {
  const buffer = overrides.buffer || makePngBuffer(originalname);
  return {
    originalname,
    size: buffer.length,
    mimetype: 'image/png',
    buffer,
    ...overrides
  };
}

function stubNoPerson(t) {
  return t.mock.method(localPersonDetector, 'detectPersons', async () => ({ ok: true, detections: [] }));
}

function stubPersonFound(t, confidence = 0.92) {
  return t.mock.method(localPersonDetector, 'detectPersons', async () => ({ ok: true, detections: [{ confidence }] }));
}

test('Test 1: normal product photo, no person => allowed', async (t) => {
  stubNoPerson(t);
  const result = await moderateListingImage(makeFile('textbook-photo.png'));
  assert.equal(result.allowed, true);
  assert.equal(result.humanDetected, false);
  assert.equal(result.unwantedContentDetected, false);
  assert.deepEqual(result.detectedObjects, []);
  assert.equal(result.reason, null);
});

test('Test 2: model detects a person => rejected with human-detection reason (filename is irrelevant)', async (t) => {
  const mock = stubPersonFound(t);
  const result = await moderateListingImage(makeFile('ordinary-name.png'));
  assert.equal(result.allowed, false);
  assert.equal(result.humanDetected, true);
  assert.match(result.reason, /human\/person photos are not allowed/i);
  assert.ok(result.detectedObjects.includes('person'));
  assert.equal(mock.mock.callCount(), 1);
});

test('Test 3: no person, filename signals a weapon => rejected with unwanted-content reason', async (t) => {
  stubNoPerson(t);
  const result = await moderateListingImage(makeFile('gun-for-sale.png'));
  assert.equal(result.allowed, false);
  assert.equal(result.unwantedContentDetected, true);
  assert.equal(result.humanDetected, false);
  assert.match(result.reason, /not allowed for marketplace listings/i);
  assert.ok(result.detectedObjects.includes('weapon'));
});

test('Test 4: person detected takes priority — unwanted-content category provider is never even called', async (t) => {
  stubPersonFound(t);
  // "gun-with-person" would trigger the weapon category if the mock category
  // provider were consulted — it must not be, since person detection
  // short-circuits before that step runs. Uses a distinct filename/buffer
  // from Test 3's "gun-for-sale.png" so the two don't collide in the
  // moderation result cache (which is keyed by image bytes).
  const result = await moderateListingImage(makeFile('gun-with-person.png'));
  assert.equal(result.allowed, false);
  assert.equal(result.humanDetected, true);
  assert.equal(result.unwantedContentDetected, false);
  assert.match(result.reason, /human\/person photos are not allowed/i);
});

test('Test 5: multiple people in frame => still rejected as human-detected', async (t) => {
  t.mock.method(localPersonDetector, 'detectPersons', async () => ({
    ok: true,
    detections: [{ confidence: 0.81 }, { confidence: 0.77 }, { confidence: 0.66 }]
  }));
  const result = await moderateListingImage(makeFile('group-photo.png'));
  assert.equal(result.allowed, false);
  assert.equal(result.humanDetected, true);
});

test('Test 6: person confidence exactly at the threshold counts as detected', async (t) => {
  stubPersonFound(t, 0.5); // PERSON_CONFIDENCE_THRESHOLD default is 0.5
  const result = await moderateListingImage(makeFile('borderline.png'));
  assert.equal(result.humanDetected, true);
});

test('Test 7: person confidence just below the threshold does not count', async (t) => {
  stubPersonFound(t, 0.49);
  const result = await moderateListingImage(makeFile('below-threshold.png'));
  assert.equal(result.humanDetected, false);
  assert.equal(result.allowed, true);
});

test('Test 8: person-detection model/service failure => fails closed (SERVICE_UNAVAILABLE), never silently allowed', async (t) => {
  t.mock.method(localPersonDetector, 'detectPersons', async () => ({ ok: false, errorType: 'timeout', message: 'model timed out' }));
  const result = await moderateListingImage(makeFile('any-photo.png'));
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'SERVICE_UNAVAILABLE');
  assert.match(result.reason, /couldn't verify this image/i);
});

test('Test 9: empty upload => rejected before person detection even runs', async (t) => {
  const mock = stubNoPerson(t);
  const result = await moderateListingImage(null);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /no image/i);
  assert.equal(mock.mock.callCount(), 0);
});

test('Test 10: unsupported format (bad magic bytes) => rejected by file validation, before detection', async (t) => {
  const mock = stubNoPerson(t);
  const badFile = makeFile('not-an-image.png', { buffer: Buffer.from('not a real image') });
  const result = await moderateListingImage(badFile);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /not a valid image/i);
  assert.equal(mock.mock.callCount(), 0);
});

test('Test 11: oversized file => rejected by file validation', async (t) => {
  stubNoPerson(t);
  const bigFile = makeFile('huge-photo.png', { size: 9 * 1024 * 1024 });
  const result = await moderateListingImage(bigFile);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /too large/i);
});

test('Test 12: same image bytes are only analyzed once (result cache hit — detector called exactly once)', async (t) => {
  const mock = stubPersonFound(t);
  const sharedBuffer = makePngBuffer('cache-test-image');

  const first = await moderateListingImage(makeFile('first-name.png', { buffer: sharedBuffer }));
  assert.equal(first.allowed, false);

  const second = await moderateListingImage(makeFile('second-name.png', { buffer: sharedBuffer }));
  assert.deepEqual(second, first);
  assert.equal(mock.mock.callCount(), 1);
});

// ── File validation edge cases (unaffected by detection changes) ──────────

test('Test 13: validateListingImage accepts a well-formed PNG', () => {
  const result = validateListingImage(makeFile('item.png'));
  assert.equal(result.valid, true);
  assert.equal(result.detectedMime, 'image/png');
});

test('Test 14: validateListingImage rejects a file with no buffer', () => {
  const result = validateListingImage({ originalname: 'item.png' });
  assert.equal(result.valid, false);
});
