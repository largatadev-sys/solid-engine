# 02 — The stub-metrics module: the story's one new seam

**What to build:** A single clearly-named pure module holding every fake number the profile renders, plus one exported on/off constant. Generators, per the founder's firm ruling ([spec](../spec.md) decision 4): followers and following as random integers 1–100; likes per postcard as a random integer 1–100; rating as random 1.0–5.0 with exactly one decimal; price as random ₱10,000–₱20,000 in hundreds only, for the "/ person" pill. Plain `Math.random()`, re-rolled every render — no seeding, no persistence, no wire traffic. With the switch **off**, each derivation returns its honest fallback: zeros for followers/following, no likes row, muted star with no number, no price pill. This module is the single seam to delete when the real features ship.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Range/shape tests over many draws: integers in 1–100; rating in 1.0–5.0 with one decimal; price in 10,000–20,000 divisible by 100
- [x] No test asserts a specific value (reroll-per-render is the ruling)
- [x] Switch off returns the honest-fallback shapes for all four derivations, proven by test
- [x] Everything lives in the one module — no `Math.random()` for these numbers anywhere else

## Comments
