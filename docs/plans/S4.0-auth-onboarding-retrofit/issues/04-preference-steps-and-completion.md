# 04 — Preference steps + completion

**Status:** ready-for-agent

**What to build:** the rest of the flow — goals (five options, "Earn from my itineraries" included as analytics signal only), interests (pick at least 3), travel setup (country/currency from device locale with the PH/PHP fallback, home city free text), and the completion screen whose summary claims only true things and lands an invitee where their pending invitation card waits. The step indicator runs profile 1 → goals 2 → interests 3 → setup 4, completion uncounted. Seed scripts gain profile pre-completion so pool-account device walks aren't taxed on every fresh-DB rebuild.

**Blocked by:** 03 — profile + handles.

- [ ] Goals/interests/travel-setup screens per the wireframes; selections stored; interests enforce the pick-at-least-3 rule (spec decisions 5–7)
- [ ] "Earn from my itineraries" selection emits its analytics event — the signal that justifies its presence (spec decision 5, AC 10)
- [ ] Locale defaults: device locale → country/currency; unreadable locale → Philippines/PHP (spec decision 7, AC 9)
- [ ] Step indicator: profile 1 → goals 2 → interests 3 → setup 4; completion uncounted (spec decision 1)
- [ ] Completion summary contains no untrue claim — no "Discovery mode active" (spec decision 6, AC 10)
- [ ] Invitee: pending invitation survives the full flow; the completion CTA lands where the card is visible; accept succeeds after onboarding (spec decision 1, AC 8)
- [ ] Onboarding-completed analytics event fires after the final step (spec, backend scope)
- [ ] Pool/seed scripts pre-complete profiles via the API; all three scripts green against a fresh local stack (spec AC 15)
