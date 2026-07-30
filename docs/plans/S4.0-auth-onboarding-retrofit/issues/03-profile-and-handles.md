# 03 — Profile + handles

**Status:** ready-for-agent

**What to build:** the create-profile step — avatar (Google photo imported, initials otherwise; no upload affordance until S3.3), display name, required @handle with live availability feedback, optional bio — plus the client-side routing gate: any signed-in traveler without a handle is routed into onboarding, exactly once, existing accounts included. The me screen gains an Edit profile entry reusing the same step. A Google sign-up can complete this end-to-end without ticket 02 existing, which is why the two run in parallel.

**Blocked by:** 01 — palette + front-door restructure. *(Parallel with 02 — the Google path reaches this step without OTP.)*

- [ ] Additive migration: handle (nullable, unique case-insensitively) + profile columns; all existing rows stay legal (spec, backend scope)
- [ ] Handle rules enforced: format, reserved words, case-insensitive duplicates refused, availability endpoint truthful, prefilled collision-free suggestion (spec decision 4, AC 4)
- [ ] Handle change releases the old handle immediately — claimable by another account; ids remain the key everywhere (ADR-015; spec AC 4)
- [ ] The uniqueness constraint's semantics are pinned by a sabotage-verified test (spec AC 5)
- [ ] Google path prefills display name + photo; email path gets the initials avatar; no dead upload control anywhere (spec decisions 3, 8)
- [ ] **Negative control:** an un-onboarded traveler exercises the core /v1 surface successfully — no endpoint refuses on incompleteness (spec decision 11, AC 6)
- [ ] Routing gate: fresh account routed in order; completed account never re-prompted; an existing NULL-handle account routed exactly once (spec AC 7)
- [ ] The me screen's Edit profile entry reuses the profile step (spec decision 4; owner-approved at the ticket quiz)
