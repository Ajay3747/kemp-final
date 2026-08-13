// DEV-ONLY provider for the *unwanted-content* categories only (nudity,
// weapon, drugs, gore, offensive) — filename-keyword based, so that part of
// the flow can be exercised without a paid API key while one isn't
// configured. It has no getCredentials() export, so even explicitly setting
// IMAGE_MODERATION_PROVIDER=mock cannot activate it in production — the
// orchestrator fails closed instead (see imageModerationService.js).
//
// Human/person detection does NOT go through this file at all — that's
// always handled by the real, local, offline model in
// localPersonDetector.js regardless of provider configuration. This mock
// used to also fake human detection from the filename; that was removed
// because it's exactly the kind of unreliable placeholder a real detector
// should replace, not sit alongside.

const CATEGORY_KEYWORDS = {
  nudity: ['nude', 'nsfw', 'explicit'],
  weapon: ['weapon', 'gun', 'knife', 'pistol'],
  drugs: ['drug', 'narcotic'],
  gore: ['gore', 'violence', 'blood'],
  offensive: ['offensive', 'hate']
};

async function analyze({ originalname }) {
  const name = String(originalname || '').toLowerCase();

  const categories = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    categories[category] = keywords.some((kw) => name.includes(kw)) ? 1 : 0;
  }

  return { ok: true, categories };
}

module.exports = { analyze };
