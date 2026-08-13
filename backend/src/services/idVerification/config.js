// Single source of truth for ID-card verification scoring.
// Change weights/thresholds here only — nothing else in the pipeline
// should hardcode these numbers.

const FIELD_WEIGHTS = {
  rollNumber: 0.30,
  phone: 0.25,
  name: 0.20,
  institution: 0.20,
  department: 0.05
};

// A mismatch on any of these fails verification outright, regardless of
// overall score.
const CRITICAL_FIELDS = ['rollNumber', 'phone', 'institution'];

// Minimum weighted score (0-1) required to be VERIFIED once no critical
// field has failed.
const VERIFIED_SCORE_THRESHOLD = 0.75;

// Minimum average OCR confidence (0-1) required before we trust extracted
// text enough to make a pass/fail decision at all. Below this, and when
// critical fields can't be found, the result is NEEDS_REVIEW rather than
// FAILED — poor image quality isn't the same as a fraudulent card.
const MIN_OCR_CONFIDENCE = 0.35;

// Name matching tolerance: fraction of characters that may differ (edit
// distance / max length) while still counting as a match. Kept low on
// purpose per spec — we do not want to "helpfully" autocorrect OCR errors
// into false identity matches.
const NAME_FUZZY_MATCH_MAX_DISTANCE_RATIO = 0.2;

module.exports = {
  FIELD_WEIGHTS,
  CRITICAL_FIELDS,
  VERIFIED_SCORE_THRESHOLD,
  MIN_OCR_CONFIDENCE,
  NAME_FUZZY_MATCH_MAX_DISTANCE_RATIO
};
