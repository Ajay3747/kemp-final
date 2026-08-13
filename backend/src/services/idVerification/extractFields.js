// Field extraction from OCR text. ID card layouts vary a lot between
// institutions and even between print batches of the same institution, so we
// deliberately do NOT rely on fixed coordinates/regions — instead we scan
// every line for a recognizable label and take the value that follows it
// (same line, or the next non-empty line if the label sits alone on its own
// line).
//
// Many real cards (including Kongu's own student ID) print no labels at all
// under the photo — just bare stacked lines: name, course, roll number, in
// that order. When a labeled match isn't found, we fall back to shape- and
// position-based heuristics for exactly those three fields.

const institutionConfig = require('../../config/institutionConfig');

const ROLL_NUMBER_LABELS = [
  'roll number', 'roll no', 'register number', 'register no',
  'reg no', 'register #', 'regd no', 'regn no', 'registration number',
  'registration no', 'admission no', 'admission number'
];

const PHONE_LABELS = [
  'phone number', 'phone', 'mobile number', 'mobile no', 'mobile',
  'contact number', 'contact no', 'contact'
];

const NAME_LABELS = [
  'student name', 'name of the student', 'candidate name', 'name'
];

const DEPARTMENT_LABELS = [
  'department', 'dept', 'branch', 'course', 'programme', 'program'
];

const buildLabelPattern = (labels) => {
  // Longest labels first so "student name" is tried before the bare "name".
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^\\s*(?:${escaped.join('|')})\\s*[:\\-]?\\s*(.*)$`, 'i');
};

const ROLL_NUMBER_PATTERN = buildLabelPattern(ROLL_NUMBER_LABELS);
const PHONE_PATTERN = buildLabelPattern(PHONE_LABELS);
const NAME_PATTERN = buildLabelPattern(NAME_LABELS);
const DEPARTMENT_PATTERN = buildLabelPattern(DEPARTMENT_LABELS);

const isBareLabel = (line, labels) => {
  const normalized = line.trim().toLowerCase().replace(/[:\-]+$/, '').trim();
  return labels.includes(normalized);
};

const extractLabeledValue = (lines, pattern, labels) => {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(pattern);
    if (match) {
      const inlineValue = (match[1] || '').trim();
      if (inlineValue) return { value: inlineValue, index: i };

      // Label was alone on its line — look at the next non-empty line.
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j].trim();
        if (next) return { value: next, index: j };
      }
    } else if (isBareLabel(line, labels)) {
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j].trim();
        if (next) return { value: next, index: j };
      }
    }
  }
  return null;
};

// ── Unlabeled fallbacks ─────────────────────────────────────────────────────
// Many real cards print no "Roll No:" / "Name:" labels at all — just bare
// stacked lines under the photo. These heuristics only kick in when the
// labeled scan above found nothing.

// Matches roll/register-number shaped tokens like "25BSR002" or "21CSE045"
// wherever they appear — including inside a line that also has other text.
const ROLL_NUMBER_SHAPE_PATTERN = /\b[0-9]{2}[A-Za-z]{2,6}[0-9]{2,4}\b/;

const DEGREE_PREFIX_PATTERN = /^(?:B\.?\s?Sc|B\.?\s?E|B\.?\s?Tech|B\.?\s?Arch|B\.?\s?Com|M\.?\s?E|M\.?\s?Tech|M\.?\s?Sc|M\.?\s?Com|MBA|MCA|Ph\.?\s?D)\b/i;

// A plausible bare name line: letters/periods/spaces only, no digits, no
// stray punctuation — short enough to be a person's name rather than a
// sentence or address.
const NAME_LIKE_PATTERN = /^[A-Za-z][A-Za-z.\s]{1,39}$/;

// Non-name header/marketing text commonly printed on ID cards, which would
// otherwise pass the shape check above.
const NAME_BLOCKLIST_SUBSTRINGS = [
  'college', 'university', 'institute', 'polytechnic', 'autonomous',
  'identity card', 'student id', 'transform yourself', 'assuring the best',
  'principal', 'signature', 'estd', 'valid upto', 'emergency contact',
  ...institutionConfig.aliases
];

const isNameLikeLine = (line) => {
  if (!NAME_LIKE_PATTERN.test(line)) return false;
  const lower = line.toLowerCase();
  return !NAME_BLOCKLIST_SUBSTRINGS.some((blocked) => lower.includes(blocked));
};

const findUnlabeledRollNumber = (lines) => {
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(ROLL_NUMBER_SHAPE_PATTERN);
    if (match) return { value: match[0], index: i };
  }
  return null;
};

const findUnlabeledDepartment = (lines) => {
  for (let i = 0; i < lines.length; i += 1) {
    if (DEGREE_PREFIX_PATTERN.test(lines[i])) return { value: lines[i], index: i };
  }
  return null;
};

// A name usually sits 1-3 lines above the course/roll-number block on cards
// that stack [Name, Course, RollNo] under the photo with no labels at all.
const findUnlabeledName = (lines, anchorIndex) => {
  if (anchorIndex === null || anchorIndex === undefined) return null;
  for (let offset = 1; offset <= 3; offset += 1) {
    const index = anchorIndex - offset;
    if (index < 0) break;
    if (isNameLikeLine(lines[index])) return { value: lines[index], index };
  }
  return null;
};

/**
 * Extract identity fields from combined OCR text (front + back).
 * Only extracts what's needed for verification — no unrelated PII is
 * pulled out of the card.
 *
 * @param {string} rawText Combined OCR text from both sides of the ID card.
 * @returns {{ name: string|null, rollNumber: string|null, phone: string|null,
 *             department: string|null, institutionText: string }}
 */
function extractFields(rawText) {
  const text = String(rawText || '');
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rollNumberMatch = extractLabeledValue(lines, ROLL_NUMBER_PATTERN, ROLL_NUMBER_LABELS)
    || findUnlabeledRollNumber(lines);
  const departmentMatch = extractLabeledValue(lines, DEPARTMENT_PATTERN, DEPARTMENT_LABELS)
    || findUnlabeledDepartment(lines);
  const phoneMatch = extractLabeledValue(lines, PHONE_PATTERN, PHONE_LABELS);

  let nameMatch = extractLabeledValue(lines, NAME_PATTERN, NAME_LABELS);
  if (!nameMatch) {
    // Prefer anchoring on the department line (name sits directly above it
    // in a [Name, Course, RollNo] stack); fall back to the roll-number line.
    const anchorIndex = departmentMatch ? departmentMatch.index : (rollNumberMatch ? rollNumberMatch.index : null);
    nameMatch = findUnlabeledName(lines, anchorIndex);
  }

  return {
    name: nameMatch ? nameMatch.value : null,
    rollNumber: rollNumberMatch ? rollNumberMatch.value : null,
    phone: phoneMatch ? phoneMatch.value : null,
    department: departmentMatch ? departmentMatch.value : null,
    // Institution isn't behind a label on most cards (it's the letterhead) —
    // matching is done against the full text blob instead.
    institutionText: text
  };
}

module.exports = {
  extractFields,
  ROLL_NUMBER_LABELS,
  PHONE_LABELS,
  NAME_LABELS,
  DEPARTMENT_LABELS
};
