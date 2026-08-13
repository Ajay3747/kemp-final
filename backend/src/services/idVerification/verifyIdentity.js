const { runOcr } = require('./ocrService');
const { extractFields } = require('./extractFields');
const {
  matchName,
  matchRollNumber,
  matchPhoneNumber,
  matchDepartment,
  matchInstitution
} = require('./matchFields');
const {
  FIELD_WEIGHTS,
  VERIFIED_SCORE_THRESHOLD,
  MIN_OCR_CONFIDENCE
} = require('./config');

const STATES = Object.freeze({
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  NEEDS_REVIEW: 'NEEDS_REVIEW'
});

const SAFE_REASONS = {
  rollNumber: 'Roll number does not match the uploaded ID card.',
  phone: 'Phone number does not match the uploaded ID card.',
  institution: 'This ID card does not appear to be from the required institution.',
  name: 'The name on the ID card does not appear to match the details provided.',
  lowConfidence: "We couldn't confidently read your ID card. Please upload clearer front and back images.",
  ocrUnavailable: "We couldn't process your ID card images right now. Please try again."
};

/**
 * Pure decision function — given the signup form data and already-extracted
 * OCR text (+ its confidence), decides VERIFIED / FAILED / NEEDS_REVIEW.
 * Kept separate from OCR/image I/O so it can be unit tested with synthetic
 * text, per the "no mock OCR in production, but deterministic tests" split.
 *
 * @param {{ name: string, rollNumber: string, phone: string, department: string }} formData
 * @param {string} combinedOcrText
 * @param {number} ocrConfidence 0..1
 */
function evaluateIdentityMatch(formData, combinedOcrText, ocrConfidence) {
  const extracted = extractFields(combinedOcrText);

  const fieldMatches = {
    rollNumber: matchRollNumber(formData.rollNumber, extracted.rollNumber),
    phone: matchPhoneNumber(formData.phone, extracted.phone),
    name: matchName(formData.name, extracted.name),
    department: matchDepartment(formData.department, extracted.department),
    institution: matchInstitution(extracted.institutionText)
  };

  const extractionFound = {
    rollNumber: Boolean(extracted.rollNumber),
    phone: Boolean(extracted.phone),
    institution: fieldMatches.institution === 1,
    name: Boolean(extracted.name)
  };

  const reasons = [];

  // 1. Hard critical mismatches — found on the card, but different from the
  //    signup form. This always fails, regardless of everything else.
  const criticalMismatch = ['rollNumber', 'phone'].find(
    (field) => extractionFound[field] && fieldMatches[field] === 0
  );

  if (criticalMismatch) {
    reasons.push(SAFE_REASONS[criticalMismatch]);
    return buildResult(STATES.FAILED, fieldMatches, reasons, ocrConfidence);
  }

  if (extractionFound.institution === false && ocrConfidence >= MIN_OCR_CONFIDENCE) {
    // Institution name/letterhead should be legible on a reasonably clear
    // scan — if it's absent despite decent OCR quality, treat as a
    // genuine institution mismatch rather than a scan-quality issue.
    reasons.push(SAFE_REASONS.institution);
    return buildResult(STATES.FAILED, fieldMatches, reasons, ocrConfidence);
  }

  // 2. Name is not a critical field (a small OCR variation is expected and
  //    tolerated), but if it was clearly readable on the card and shares
  //    virtually nothing with the name on the signup form, that's not a
  //    "small variation" anymore — flag it for a human rather than letting
  //    heavily-weighted critical fields alone wave through a different
  //    person's identity.
  if (extractionFound.name && fieldMatches.name === 0) {
    reasons.push(SAFE_REASONS.name);
    return buildResult(STATES.NEEDS_REVIEW, fieldMatches, reasons, ocrConfidence);
  }

  // 3. Needs review — OCR couldn't confidently extract what it needed to
  //    make a decision at all.
  const missingCritical = ['rollNumber', 'phone', 'institution'].filter(
    (field) => !extractionFound[field]
  );

  if (ocrConfidence < MIN_OCR_CONFIDENCE || missingCritical.length > 0) {
    reasons.push(SAFE_REASONS.lowConfidence);
    return buildResult(STATES.NEEDS_REVIEW, fieldMatches, reasons, ocrConfidence);
  }

  // 4. All critical fields present and matching, name is at least a
  //    plausible variation — score the rest.
  const score = Object.keys(FIELD_WEIGHTS).reduce(
    (total, field) => total + FIELD_WEIGHTS[field] * (fieldMatches[field] || 0),
    0
  );

  if (score >= VERIFIED_SCORE_THRESHOLD) {
    return buildResult(STATES.VERIFIED, fieldMatches, reasons, ocrConfidence, score);
  }

  reasons.push(SAFE_REASONS.lowConfidence);
  return buildResult(STATES.NEEDS_REVIEW, fieldMatches, reasons, ocrConfidence, score);
}

function buildResult(state, fieldMatches, reasons, ocrConfidence, scoreOverride) {
  const score = typeof scoreOverride === 'number'
    ? scoreOverride
    : Object.keys(FIELD_WEIGHTS).reduce(
      (total, field) => total + FIELD_WEIGHTS[field] * (fieldMatches[field] || 0),
      0
    );

  return {
    state,
    score: Math.round(score * 100) / 100,
    fieldMatches,
    reasons,
    ocrConfidence: Math.round(ocrConfidence * 100) / 100
  };
}

/**
 * Full pipeline: run OCR on both card images, then evaluate the match.
 * Never throws — OCR failures degrade to NEEDS_REVIEW so a signup attempt
 * fails safely instead of crashing the request.
 *
 * @param {{ name: string, rollNumber: string, phone: string, department: string }} formData
 * @param {Buffer} frontBuffer
 * @param {Buffer} backBuffer
 */
async function verifyIdentity(formData, frontBuffer, backBuffer) {
  const ocrResult = await runOcr([frontBuffer, backBuffer]);

  if (!ocrResult.ok) {
    return buildResult(STATES.NEEDS_REVIEW, {}, [SAFE_REASONS.ocrUnavailable], 0, 0);
  }

  const [frontOcr, backOcr] = ocrResult.results;
  const combinedText = `${frontOcr.text}\n${backOcr.text}`;
  const avgConfidence = (frontOcr.confidence + backOcr.confidence) / 2;

  return evaluateIdentityMatch(formData, combinedText, avgConfidence);
}

module.exports = {
  STATES,
  verifyIdentity,
  evaluateIdentityMatch
};
