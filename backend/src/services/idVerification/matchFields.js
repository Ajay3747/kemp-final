const {
  normalizeName,
  normalizeRollNumber,
  normalizePhoneNumber,
  normalizeDepartment,
  normalizeInstitutionName
} = require('./normalize');
const institutionConfig = require('../../config/institutionConfig');
const { NAME_FUZZY_MATCH_MAX_DISTANCE_RATIO } = require('./config');

// Classic Levenshtein edit distance — small strings only (names), so the
// O(n*m) DP table is not a performance concern here.
const levenshteinDistance = (a, b) => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) table[i][0] = i;
  for (let j = 0; j < cols; j += 1) table[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      table[i][j] = Math.min(
        table[i - 1][j] + 1,
        table[i][j - 1] + 1,
        table[i - 1][j - 1] + cost
      );
    }
  }

  return table[rows - 1][cols - 1];
};

// Returns a 0..1 match strength — 1 for exact, partial credit for a
// high-confidence fuzzy match, 0 otherwise. Never invents a match when one
// side is empty.
const matchName = (formValue, ocrValue) => {
  const a = normalizeName(formValue);
  const b = normalizeName(ocrValue);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  const distanceRatio = distance / maxLen;

  if (distanceRatio <= NAME_FUZZY_MATCH_MAX_DISTANCE_RATIO) {
    return 1 - distanceRatio;
  }
  return 0;
};

const matchRollNumber = (formValue, ocrValue) => {
  const a = normalizeRollNumber(formValue);
  const b = normalizeRollNumber(ocrValue);
  if (!a || !b) return 0;
  return a === b ? 1 : 0;
};

const matchPhoneNumber = (formValue, ocrValue) => {
  const a = normalizePhoneNumber(formValue);
  const b = normalizePhoneNumber(ocrValue);
  if (!a || a.length !== 10 || !b || b.length !== 10) return 0;
  return a === b ? 1 : 0;
};

const matchDepartment = (formValue, ocrValue) => {
  const a = normalizeDepartment(formValue);
  const bRaw = normalizeDepartment(ocrValue);
  if (!a || !bRaw) return 0;

  const b = institutionConfig.departmentAbbreviations[bRaw] || bRaw;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.75;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshteinDistance(a, b);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.8 ? similarity : 0;
};

// Institution is matched against the configured institution (and its
// aliases), not against the signup form — there is no free-text
// "institution" field in this app's signup form, the institution is
// implied by the required @kongu.edu email domain.
const matchInstitution = (ocrValue) => {
  const value = normalizeInstitutionName(ocrValue);
  if (!value) return 0;
  const isMatch = institutionConfig.aliases.some(
    (alias) => value.includes(alias) || alias.includes(value)
  );
  return isMatch ? 1 : 0;
};

module.exports = {
  levenshteinDistance,
  matchName,
  matchRollNumber,
  matchPhoneNumber,
  matchDepartment,
  matchInstitution
};
