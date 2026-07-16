# 05 — Mobile: design-token layer (`mobile/src/theme/`)

**What to build:** The token layer the epic map gates S0.3's screens on: semantic color roles (`background`, `surface`, `textPrimary`, `textSecondary`, `accent`, `danger`, …), a type scale, a spacing scale. Values: the **worklog palette, adapted** — lifted from S0.1's health screen hardcodes, which are then deleted; the health screen is retrofitted to consume tokens. The palette is an **explicit interim**: the brand/visual-direction decision remains open in the epic-map backlog, due before E4 — a values-only change when it lands, because roles are what screens couple to.

**Blocked by:** — (independent of the backend chain; can run first)

**Status:** done

- [x] `mobile/src/theme/` exports color roles, type scale, spacing scale as the single styling source
- [x] Zero hardcoded color literals in any screen, including the retrofitted S0.1 health screen (grep-clean, enforced by test)
- [x] Token file carries the interim marker: a comment pointing at the epic-map backlog entry and the before-E4 deadline
- [x] Existing Jest suite still green after the health-screen retrofit

## Comments

**2026-07-16 — implemented.**

**The grep rule is a test, not a promise** — appended to `layering.test.ts`, beside S0.1's no-raw-fetch rule and for the same reason: a hardcoded colour is invisible in review until the brand decision lands (due before E4) and turns a values-only change into a hunt. It caught two screens I had forgotten (`me.tsx`, `sign-in.tsx`) on its first run, which is precisely the point. It also asserts `tokens.ts` still *contains* hex — otherwise the rule would pass vacuously the day someone moves the palette somewhere it is not looking.

**Code review caught the token layer being decorative in the retrofitted screens, and it was right.** The first pass preserved S0.1's exact pixels by writing arithmetic on tokens — `spacing.lg - 2`, `radii.sm + 6`, `gap: spacing.xs + 2` — plus bare `fontSize: 10` / `fontSize: 15` where the scale had no entry. That is not using the scale; it is using 22 while pretending, and it is precisely how a theme becomes ornamental. Fixed by snapping to the scale (the throwaway screens' exact pixels were never load-bearing) and by adding the two entries that were genuinely missing: `typography.action` (15 — a button label is not prose) and `typography.fine`/`fineMono` (10 — ids, traceIds). **The rule now has teeth**: `layering.test.ts` bans arithmetic on `spacing.*`/`radii.*` and bare `fontSize:` outright.

**What is deliberately *not* policed: raw layout numbers.** `maxWidth: 420` and `minHeight: 96` survive, now named (`CARD_MAX_WIDTH`) with a comment. No rule can distinguish "how wide before this looks silly on a tablet" — a property of one screen's composition — from a token, and a rule that tried would either ban legitimate layout or force fake tokens for one-off values. Tokens are the vocabulary screens share; these are sentences one screen says.

**Roles are named for the job, never the appearance** (`danger`, not `red`) — a role named `red` that turns amber is a lie in every file that reads it. `danger` and `accent` currently resolve to the same hue and are separate roles anyway: they are separate ideas, and the brand decision may well pull them apart.

**`health.tsx` moved off `/`** — My Trips is the signed-in home now. The screen is kept rather than deleted: "can the app reach the backend, and what does it say when it cannot" is worth one tap when a device build misbehaves.
