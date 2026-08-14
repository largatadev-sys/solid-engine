// S4.0 made onboarding blocking for everyone, which taxes every pool account six screens on every
// fresh-DB rebuild — and the Traveler row IS in that database, so it happens on every redeploy.
// Fixtures therefore complete their own profile over the REAL API the moment they are provisioned.
//
// Deliberately does NOT set displayName. The pool's accounts have none, so S1.2's fallback renders
// them as `largata.dev+t1` — which is the whole point (founder ruling, 2026-07-27: a test identity
// must identify itself). The handle follows the same rule: `pool_t1` says what it is on sight.

const POOL_HANDLE_PREFIX = 'pool_';

// Values, not labels — these must stay in step with src/onboarding/preferenceOptions.ts, whose
// vocabulary follows the Figma export (Budget / Luxury / Adventure / Food & Culture / ...).
const FIXTURE_ANSWERS = {
  goals: ['discover', 'plan_with_friends'],
  interests: ['adventure', 'food_culture', 'solo_travel'],
  country: 'PH',
  preferredCurrency: 'PHP',
  homeCity: 'Puerto Princesa',
};

function handleForTag(tag) {
  return (POOL_HANDLE_PREFIX + tag).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

// `api` is the caller's own request helper: (path, method, token, body) -> { status, body }.
// Idempotent: re-claiming your own handle is allowed, and completion keeps its first timestamp.
async function precompleteProfile(api, token, tag, claimHandle) {
  const handle = claimHandle ?? handleForTag(tag);

  const patched = await api('/v1/me', 'PATCH', token, { handle, ...FIXTURE_ANSWERS });
  if (patched.status !== 200) {
    throw new Error(`profile pre-completion failed for ${tag}: ${patched.status} ${JSON.stringify(patched.body)}`);
  }

  const completed = await api('/v1/me/onboarding-completion', 'POST', token, {});
  if (completed.status !== 200) {
    throw new Error(`onboarding completion failed for ${tag}: ${completed.status} ${JSON.stringify(completed.body)}`);
  }

  return { handle, onboardingCompleted: completed.body?.onboardingCompleted === true };
}

module.exports = { precompleteProfile, handleForTag, POOL_HANDLE_PREFIX, FIXTURE_ANSWERS };
