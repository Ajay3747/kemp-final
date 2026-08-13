// Unit tests for the ID-card verification pipeline.
// All data below is synthetic — no real student information is used.
//
// OCR itself (tesseract.js) is intentionally NOT exercised here: it's slow,
// needs network access for language data on a cold cache, and its output is
// inherently non-deterministic across environments. Instead these tests feed
// synthetic "OCR text" straight into the pure decision function
// (evaluateIdentityMatch), which is exactly what runOcr's output looks like
// by the time it reaches the matching/scoring stage. That keeps the tests
// fast, deterministic, and CI-safe while still covering the real matching
// and scoring logic end-to-end.

const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateIdentityMatch, STATES } = require('../verifyIdentity');
const { validateIdCardImage } = require('../imageValidation');
const {
  normalizeName,
  normalizeRollNumber,
  normalizePhoneNumber,
  normalizeDepartment
} = require('../normalize');

// ── Synthetic fixtures ──────────────────────────────────────────────────────

const VALID_FORM_DATA = {
  name: 'Priya Ramesh V',
  rollNumber: '21ECE118',
  phone: '9876543210',
  department: 'Computer Science and Engineering'
};

const MATCHING_CARD_TEXT = [
  'KONGU ENGINEERING COLLEGE',
  'STUDENT IDENTITY CARD',
  'Name: PRIYA RAMESH V',
  'Roll No: 21ECE118',
  'Department: CSE',
  'Phone: 9876543210',
  'Valid Upto: 2027'
].join('\n');

const HIGH_CONFIDENCE = 0.9;

// ── evaluateIdentityMatch: the five spec scenarios ─────────────────────────

test('Test 1: correct signup details + correct ID card => VERIFIED', () => {
  const result = evaluateIdentityMatch(VALID_FORM_DATA, MATCHING_CARD_TEXT, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.VERIFIED);
  assert.ok(result.score >= 0.75);
});

test('Test 2: incorrect roll number => FAILED', () => {
  const formData = { ...VALID_FORM_DATA, rollNumber: '21ECE999' };
  const result = evaluateIdentityMatch(formData, MATCHING_CARD_TEXT, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.FAILED);
  assert.match(result.reasons[0], /roll number/i);
});

test('Test 3: incorrect phone number => FAILED', () => {
  const formData = { ...VALID_FORM_DATA, phone: '9999999999' };
  const result = evaluateIdentityMatch(formData, MATCHING_CARD_TEXT, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.FAILED);
  assert.match(result.reasons[0], /phone/i);
});

test('Test 4: incorrect institution => FAILED', () => {
  const wrongInstitutionText = MATCHING_CARD_TEXT.replace(
    'KONGU ENGINEERING COLLEGE',
    'ABC ENGINEERING COLLEGE'
  );
  const result = evaluateIdentityMatch(VALID_FORM_DATA, wrongInstitutionText, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.FAILED);
  assert.match(result.reasons[0], /institution/i);
});

test('Test 5: small OCR name variation but critical fields match => VERIFIED', () => {
  // "PRIYA RAMESH V" read as "PRIYA RAMESH" (trailing initial dropped by OCR) —
  // small edit distance, everything else on the card is exact.
  const slightlyOffNameText = MATCHING_CARD_TEXT.replace('PRIYA RAMESH V', 'PRIYA RAMESH');
  const result = evaluateIdentityMatch(VALID_FORM_DATA, slightlyOffNameText, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.VERIFIED);
});

test('Test 10: OCR cannot extract enough information => NEEDS_REVIEW', () => {
  const result = evaluateIdentityMatch(VALID_FORM_DATA, '   \n  ', 0.1);
  assert.equal(result.state, STATES.NEEDS_REVIEW);
});

test('does not silently "correct" a wildly different name into a match', () => {
  const totallyDifferentNameText = MATCHING_CARD_TEXT.replace('PRIYA RAMESH V', 'RAJESH BABU K');
  const result = evaluateIdentityMatch(VALID_FORM_DATA, totallyDifferentNameText, HIGH_CONFIDENCE);
  // Roll/phone/institution still match (critical fields), so this must not
  // be a hard FAILED, but a wrong name should also not sail through as
  // VERIFIED — it should be flagged for a human to look at.
  assert.equal(result.state, STATES.NEEDS_REVIEW);
});

// ── Real-world layout: many cards (including some real Kongu student ID
// cards) print no labels at all under the photo — just bare stacked lines
// of Name, Course, Roll Number, in that order. This must still verify.

const UNLABELED_FORM_DATA = {
  name: 'Karthik Selvam R',
  rollNumber: '25BSR099',
  phone: '9000011122',
  department: 'B.Sc Software Systems'
};

const UNLABELED_CARD_TEXT = [
  'KONGU',
  'ENGINEERING COLLEGE',
  '(AUTONOMOUS)',
  'PERUNDURAI, ERODE - 638 060',
  'STUDENT IDENTITY CARD 2025 - 2028',
  'KARTHIK SELVAM R',
  'B.Sc - SOFTWARE SYSTEM',
  '25BSR099',
  'PRINCIPAL',
  'Phone : 9000011122'
].join('\n');

test('unlabeled card layout (name/course/roll stacked with no labels) still extracts and verifies', () => {
  const result = evaluateIdentityMatch(UNLABELED_FORM_DATA, UNLABELED_CARD_TEXT, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.VERIFIED);
});

test('unlabeled roll number still catches a real mismatch', () => {
  const formData = { ...UNLABELED_FORM_DATA, rollNumber: '25BSR000' };
  const result = evaluateIdentityMatch(formData, UNLABELED_CARD_TEXT, HIGH_CONFIDENCE);
  assert.equal(result.state, STATES.FAILED);
  assert.match(result.reasons[0], /roll number/i);
});

test('unlabeled name extraction does not mistake the institution letterhead for a name', () => {
  const { extractFields } = require('../extractFields');
  const extracted = extractFields(UNLABELED_CARD_TEXT);
  assert.equal(extracted.name, 'KARTHIK SELVAM R');
  assert.equal(extracted.rollNumber, '25BSR099');
});

// ── Image validation: Tests 6-9 ─────────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function buildPngBuffer(width, height) {
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type: RGB
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const chunkLength = Buffer.alloc(4);
  chunkLength.writeUInt32BE(13, 0);
  const chunkType = Buffer.from('IHDR', 'ascii');
  const crcPlaceholder = Buffer.alloc(4); // image-size does not verify CRC

  return Buffer.concat([PNG_SIGNATURE, chunkLength, chunkType, ihdrData, crcPlaceholder]);
}

test('Test 6: missing front image => validation error', () => {
  const result = validateIdCardImage(null, 'Front ID card');
  assert.equal(result.valid, false);
  assert.equal(result.errors[0], 'Front ID card image is required.');
});

test('Test 7: missing back image => validation error', () => {
  const result = validateIdCardImage(undefined, 'Back ID card');
  assert.equal(result.valid, false);
  assert.equal(result.errors[0], 'Back ID card image is required.');
});

test('Test 8: image over 5MB => validation error', () => {
  const oversized = {
    originalname: 'front.png',
    size: 6 * 1024 * 1024,
    buffer: buildPngBuffer(400, 250)
  };
  const result = validateIdCardImage(oversized, 'Front ID card');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /less than 5 MB/.test(e)));
});

test('Test 9: unsupported file type (PDF) => validation error', () => {
  const fakePdf = {
    originalname: 'front.pdf',
    size: 1024,
    buffer: Buffer.from('%PDF-1.4 fake pdf content')
  };
  const result = validateIdCardImage(fakePdf, 'Front ID card');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /Only JPG, JPEG and PNG/.test(e)));
});

test('valid PNG within size and dimension limits passes validation', () => {
  const validPng = {
    originalname: 'front.png',
    size: 50 * 1024,
    buffer: buildPngBuffer(600, 380)
  };
  const result = validateIdCardImage(validPng, 'Front ID card');
  assert.equal(result.valid, true);
  assert.deepEqual({ width: result.dimensions.width, height: result.dimensions.height }, { width: 600, height: 380 });
});

test('image below minimum dimensions is rejected', () => {
  const tinyPng = {
    originalname: 'front.png',
    size: 2 * 1024,
    buffer: buildPngBuffer(40, 30)
  };
  const result = validateIdCardImage(tinyPng, 'Front ID card');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /too small/.test(e)));
});

test('extension spoofing is caught by magic-byte sniffing, not trusted from the filename', () => {
  // A file named like a JPEG but whose actual bytes are a PDF signature.
  const spoofed = {
    originalname: 'front.jpg',
    size: 1024,
    buffer: Buffer.from('%PDF-1.4 not actually a jpeg')
  };
  const result = validateIdCardImage(spoofed, 'Front ID card');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /Only JPG, JPEG and PNG/.test(e)));
});

// ── Normalization sanity checks (spec examples) ────────────────────────────

test('normalizeName treats case/spacing variants as equal', () => {
  assert.equal(normalizeName('Ajay K S'), normalizeName('AJAY K S'));
  assert.equal(normalizeName('Ajay K S'), normalizeName('Ajay   K   S'));
});

test('normalizePhoneNumber compares on digits only, ignoring formatting', () => {
  assert.equal(normalizePhoneNumber('+91 98765 43210'), normalizePhoneNumber('9876543210'));
});

test('normalizeRollNumber ignores separators', () => {
  assert.equal(normalizeRollNumber('21-CSE-045'), normalizeRollNumber('21CSE045'));
});

test('normalizeDepartment is case-insensitive', () => {
  assert.equal(
    normalizeDepartment('Computer Science and Engineering'),
    normalizeDepartment('computer science and engineering')
  );
});
