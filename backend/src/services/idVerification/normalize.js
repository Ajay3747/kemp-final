// Text normalization helpers shared by field extraction and matching.
// Intentionally conservative: we collapse whitespace/punctuation/case
// differences that OCR commonly introduces, but we never "correct" the
// underlying characters (e.g. no O<->0 or I<->1 substitution) — that kind
// of aggressive correction risks turning a real mismatch into a false match.

const collapseWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeName = (value) => {
  return collapseWhitespace(value)
    .toUpperCase()
    .replace(/[.,'"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeRollNumber = (value) => {
  return collapseWhitespace(value)
    .toUpperCase()
    .replace(/[\s\-_/]+/g, '')
    .trim();
};

const normalizePhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  // Compare on the last 10 digits so a stored "+91XXXXXXXXXX" matches an
  // OCR-read "XXXXXXXXXX" without a country code.
  return digits.slice(-10);
};

const normalizeDepartment = (value) => {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeInstitutionName = (value) => {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  collapseWhitespace,
  normalizeName,
  normalizeRollNumber,
  normalizePhoneNumber,
  normalizeDepartment,
  normalizeInstitutionName
};
