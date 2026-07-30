# 04 — Preference steps + completion

**Status:** done

**What to build:** the rest of the flow — goals (five options, "Earn from my itineraries" included as analytics signal only), interests (pick at least 3), travel setup (country/currency from device locale with the PH/PHP fallback, home city free text), and the completion screen whose summary claims only true things and lands an invitee where their pending invitation card waits. The step indicator runs profile 1 → goals 2 → interests 3 → setup 4, completion uncounted. Seed scripts gain profile pre-completion so pool-account device walks aren't taxed on every fresh-DB rebuild.

**Blocked by:** 03 — profile + handles.

- [x] Goals/interests/travel-setup screens per the wireframes; selections stored; interests enforce the pick-at-least-3 rule (spec decisions 5–7)
- [x] "Earn from my itineraries" selection emits its analytics event — the signal that justifies its presence (spec decision 5, AC 10)
- [x] Locale defaults: device locale → country/currency; unreadable locale → Philippines/PHP (spec decision 7, AC 9)
- [x] Step indicator: profile 1 → goals 2 → interests 3 → setup 4; completion uncounted (spec decision 1)
- [x] Completion summary contains no untrue claim — no "Discovery mode active" (spec decision 6, AC 10)
- [x] Invitee: pending invitation survives the full flow; the completion CTA lands where the card is visible; accept succeeds after onboarding (spec decision 1, AC 8)
- [x] Onboarding-completed analytics event fires after the final step (spec, backend scope)
- [x] Pool/seed scripts pre-complete profiles via the API; all three scripts green against a fresh local stack (spec AC 15)

## Comments

**2026-07-30 — implemented, alongside 02 and 03.**

1. **The completion screen is a receipt, not a promise, and the copy check has teeth.** It restates only what the traveler entered. `completionSummary.test.ts` holds a ban list (`discovery mode`, `personalis…`, `recommend`, `tailor`, `we will`, `your feed`, `matched`, `curated`) *plus a test that the ban list fires on the wording that was cut* — a check whose failure mode is demonstrated rather than assumed.
2. **The code review caught the screen making a claim that is not true, on the very AC the ticket exists for.** The blurb read *"You can change any of it from your profile"* and the goals subtitle *"You can change this later"* — but the only edit surface is the profile step (handle, name, bio). Goals, interests, country, currency and home city have **no edit route anywhere in the app**. Both lines are cut and both phrasings are now in the ban list. **The gap itself stands**: four of the five summary lines are not editable after onboarding. Backlog, not silently absorbed.
3. **Interests are analytics-measured too.** The spec's backend scope names "goal/**interest** selections"; the first cut emitted goals only. `onboarding_interests_selected` now rides beside `onboarding_goals_selected`, with `earn_intent_signalled` still separate so the decision-5 signal is countable on its own.
4. **The country list grew from 70 to 160+ because the fallback was quietly doing two jobs.** Decision 7 scopes PH/PHP to *"an unreadable locale"* — but an off-list *readable* one (RU, GH, KZ, EE, CR…) also fell back, and that traveler then had no way to pick their own country at all. Two different situations, one indistinguishable outcome. The list is ordered by construction (home market first, then alphabetical) so the literal cannot rot out of order, and a test names regions that must not fall back.
5. **`preferred_currency` means exactly one thing and the migration says so.** The default for E5 expense logging. There is no FX anywhere in the roadmap and the column must not start implying one.
6. **The four step screens share a prefill-and-submit shape that is copied, not extracted** (`prefilled` guard + `try/catch → setMessage`). Flagged by the code review as duplication; left alone deliberately this late in the story rather than refactoring four screens that had just been walked on a device. First story to touch them again should extract `useOnboardingStep`.
