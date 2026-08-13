// Product.warrantyDuration is a free-text string sellers type themselves
// (e.g. "6 months", "1 year", "2 yrs") — there is no structured unit field.
// This is a best-effort parser with a fallback: unparseable text never
// crashes anything, it just yields an "Unknown" warranty status instead of
// a guessed expiry date.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const UNIT_DAYS = { day: 1, week: 7, month: 30, year: 365 };

// A warranty within this many days of expiring (but not yet expired) is
// "Expiring Soon" — also the reminder job's notification window.
const EXPIRING_SOON_WINDOW_DAYS = 14;

const LIFETIME_PATTERN = /\b(lifetime|life[\s-]?time|lifelong|forever|no\s*expiry)\b/i;

function normalizeUnit(unitRaw) {
  const u = unitRaw.toLowerCase().replace(/\.$/, '');
  if (/^d(ay)?s?$/.test(u)) return 'day';
  if (/^w(k|eek)?s?$/.test(u)) return 'week';
  if (/^m(o|on|onth)?s?$/.test(u)) return 'month';
  if (/^y(r|ear)?s?$/.test(u)) return 'year';
  return null;
}

// Returns { ok: false } when the text can't be confidently parsed, or
// { ok: true, isLifetime: true, days: null } / { ok: true, isLifetime: false, days }.
function parseWarrantyDuration(text) {
  if (!text || typeof text !== 'string') return { ok: false };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false };
  if (LIFETIME_PATTERN.test(trimmed)) return { ok: true, isLifetime: true, days: null };

  const match = trimmed.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return { ok: false };

  const value = parseFloat(match[1]);
  const unit = normalizeUnit(match[2]);
  if (!unit || !Number.isFinite(value) || value <= 0) return { ok: false };

  return { ok: true, isLifetime: false, days: value * UNIT_DAYS[unit] };
}

// purchaseDate: Date. durationText: Product.warrantyDuration. now: Date (injectable for tests).
// Returns { status: 'Active'|'Expiring Soon'|'Expired'|'Unknown', expiryDate: Date|null, isLifetime: bool }.
function computeWarrantyInfo(purchaseDate, durationText, now = new Date()) {
  const parsed = parseWarrantyDuration(durationText);
  if (!parsed.ok) {
    return { status: 'Unknown', expiryDate: null, isLifetime: false };
  }
  if (parsed.isLifetime) {
    return { status: 'Active', expiryDate: null, isLifetime: true };
  }

  const expiryDate = new Date(purchaseDate.getTime() + parsed.days * MS_PER_DAY);
  const daysRemaining = (expiryDate.getTime() - now.getTime()) / MS_PER_DAY;

  let status;
  if (daysRemaining < 0) status = 'Expired';
  else if (daysRemaining <= EXPIRING_SOON_WINDOW_DAYS) status = 'Expiring Soon';
  else status = 'Active';

  return { status, expiryDate, isLifetime: false };
}

module.exports = { parseWarrantyDuration, computeWarrantyInfo, EXPIRING_SOON_WINDOW_DAYS };
