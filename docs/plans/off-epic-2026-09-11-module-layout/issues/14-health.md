# 14: health takes layers, and the guard loses its last exemption

**What to build:** the smallest module reads in the converted shape, `/v1/health` answers exactly as it does today, and the api-is-never-wire guard ships with **no by-module exclusion for a module the build classifies as under the rule**. `health` is five files — three at the root and `HealthResponse` in `api/` — and that response is wire: `HealthController.health()` returns it. So it is the same classification error tickets 01 and 06 fixed, at the smallest possible scale, and it was left out of the sweep by size rather than by classification.

**Why it is owed.** `ModuleGuardMetaTest` lists `health` under the rule; the spec's Out of Scope excluded it as "five files"; and ticket 07's guard therefore carries it in `OUTSIDE_THE_RULE` beside `common`, `identity` and `ws` — which are excluded by **role**, not size. **Two guards classify the same module differently**, and the odd one out is a size exemption sitting in a list that is otherwise about what a module *is*. That is the shape `ModuleGuardMetaTest.noGuardAnywhereNamesAClassAsAnExemption` exists to refuse, one level up: an exception that is individually harmless and collectively how a rule erodes. Converting five files is cheaper than carrying the divergence.

**The move.** `controller/`: `HealthController`. `service/`: `HealthService`. `repository/`: `HealthRepository`. `dto/`: `HealthResponse`. `api/` and its `package-info` are gone. The module publishes no refusal, so — like `discovery` and `profile` — it has **no front door at all**, and its outside-in rule becomes the stronger statement that nothing outside may name any part of it.

**Blocked by:** 07 (the guard whose exclusion list this ticket empties).

**Status:** resolved

- [x] Every main-tree class sits in a target folder and the module root holds none; moves by `git mv`
- [x] `api/` and its `package-info` are gone; the guard loses its contract rule on the ticket 01 pattern and its outside-in rule becomes the whole-module form, sabotage-checked with a real usage
- [x] `ApiIsNeverWireTest` drops `health` from `OUTSIDE_THE_RULE`, and its companion test asserts the set is exactly the three classified out by **role** — `common`, `identity`, `ws`
- [x] The guard still passes with that exclusion gone, which is the proof the conversion actually closed the divergence rather than moving it
- [x] `ModuleGuardMetaTest` is green and `health` stays under the rule, where it already was
- [x] The spec's Out of Scope records that `health` came back in, with the reason and the date
- [x] `/v1/health` answers `{"status":"ok"}` on the running stack, and the health ITs pass unedited
- [x] The spec's verification loop, in full — including staging before the last compile, and `git diff --name-only` empty before the commit
- [x] The last commit sets this ticket `resolved` and flips its ledger glyph; the PR is opened, never merged unasked

## Comments

**Minted 2026-09-11, after the series had shipped**, from the founder's question about why `media`, `identity` and the other classified-out modules were untouched. The answer for those four is role — they are a shared kernel, shared infrastructure and a transport, and a layout rule written for capability modules is a category error against them. `health` surfaced as the one that did not fit either answer: under the rule by classification, out of the sweep by size, and excluded by name in the guard the series itself added.
