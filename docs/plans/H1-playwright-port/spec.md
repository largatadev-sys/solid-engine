# H1 — Playwright port: the verification harness becomes one Playwright suite

**Status:** ready-for-agent
**Grilled:** 2026-08-14 (founder), fired from the epic-map port line the day after its own sharpened trigger was hit at S4.3's gate.
**ADR:** ADR-026 (minted with this spec).
**Candidate-capability note:** none — this story ships no traveler-facing act; the harness is tooling, not a capability surface.

## Problem Statement

Verifying a story on the web rung costs 15–25 minutes of browser time for ~40% of the assertions, while the API rung finishes in ~30 seconds — a gate run is ~97% waiting on walks that cannot run in parallel (they share one Chrome profile), sleep on hand-guessed timers (~70 seconds of pure waiting in the discovery walk alone), and block on one legitimate 68-second product poll instead of overlapping it. The founder abandoned a gate run for time the same day the sixth walk landed.

Beneath the speed problem sits a maintenance one, already on the record: the CDP harness was never a decision — eleven `drive-*` scripts hand-roll the same WebSocket plumbing (2,145 lines across four of them alone), and most of S4.21's closing debugging was the harness lying, not the app breaking. Three walks rotted against the product and were retired; their coverage — nearly every lifecycle and publish *act* — is currently watched by nothing.

## Solution

One Playwright suite replaces the entire hand-rolled harness. `@playwright/test` in TypeScript, two projects — `api` (request-context, no browser; the folded-in API smokes) and `web` (phone viewport, touch enabled) — run in parallel workers with auto-waiting locators, per-spec isolated browser contexts, and an exit code that means what it says. The retired walks' dark flows are rebuilt from the flow inventory. The diagnostic CLI survives with its command-line contract intact, re-engined on the Playwright library. The CDP/`ws` layer deletes entirely.

The gate keeps its three rungs — the Playwright suite, the backend ITs, and the emulator walk — and gets its browser time back: wall-clock collapses toward the longest single spec.

## User Stories

1. As the verifying agent, I want the whole suite behind one command with an authoritative exit code, so that I never have to grep for a live process to learn how a run is going (the instrument that killed the run it was watching).
2. As the verifying agent, I want web specs to wait on conditions instead of sleeping on timers, so that a walk costs what the app costs, not what the worst case was guessed to be.
3. As the verifying agent, I want specs in parallel workers with isolated browser contexts, so that suite wall-clock approaches the longest spec instead of the sum of all of them.
4. As the verifying agent, I want every spec to run in a phone viewport with real touch events, so that touch-only defects (the erratic-carousel class that survived a green 40/40 walk) are caught before the founder holds the device.
5. As the founder, I want the gate's browser time cut from 15–25 minutes to a few overlapped minutes, so that gate runs stop being abandoned for time.
6. As the founder, I want a run summary naming passed/failed per project, so that I can read a gate's outcome at a glance without scrolling a transcript.
7. As the verifying agent, I want traces and screenshots retained on failure, so that a red spec is diagnosable after the fact without re-running the suite.
8. As the verifying agent, I want one `baseURL` switch between the Metro dev server and the preview container, so that I iterate at Metro speed and gate against the build path that ships.
9. As the verifying agent, I want the API smokes as request-context specs inside the same suite, so that one runner, one report and one vocabulary cover both rungs.
10. As the founder, I want the lifecycle ladder's dark flows (Finalize, Start Trip, Step back) covered again, so that a regression in the acts nothing currently watches cannot land blind.
11. As the founder, I want the publish act's dark flows (the gate, the audience question, Copy Link, the public projection read by a stranger) covered again, for the same reason.
12. As the verifying agent, I want each spec file to sign in as its own mapped pool identity, so that a screenshot or log line identifies its module on sight (the self-identifying-identities rule extended to the harness).
13. As the verifying agent, I want every spec to seed its own trip through the API, so that specs are deterministic on a database that accumulates every earlier run's fixtures, and parallel specs never contend for the same Editing Session.
14. As the verifying agent, I want the diagnostic CLI to keep its exact flags and evidence bundle (page text, console/page errors, Google iframe presence, bearer-vs-anonymous API requests, OTP-from-backend-log), so that every debugging recipe that cites it by command line survives the port.
15. As a future story's author, I want adding coverage to mean adding one spec file that follows the pilot's shape, so that coverage grows without any new plumbing.
16. As the owner, I want the CDP/`ws` layer deleted rather than deprecated, so that the inertia that built eleven hand-rolled drivers cannot recur.
17. As the owner, I want ADR-026 on the record, so that the engine choice this time is a decision with rationale, not a phrase copied from story to story.
18. As the verifying agent, I want per-project filter commands for the iterate loop, so that a backend-only change re-proves the API project in seconds without opening a browser.
19. As the verifying agent, I want the suite green against the same stack `docker compose up` provides, so that the gate needs no new infrastructure.
20. As the founder, I want the emulator walk rung intact on this workstation, so that device evidence per story continues while the web rung changes engines underneath it.
21. As the verifying agent, I want known RN-web harness traps carried into the helpers (visible-match selection, label-start anchoring, case-insensitive text, dialog wording capture), so that the port does not re-learn what the walks already paid for.
22. As the owner, I want the suite to refuse silently-vacuous runs — a spec that cannot seed its fixture skips loudly rather than passing on zero assertions — so that "the walk failed" and "the walk never ran" stay distinguishable.

## Implementation Decisions

1. **Engine: `@playwright/test`, TypeScript, Chromium.** The full runner, not Playwright-as-library — parallel workers, auto-waiting locators, fixtures, JSON/line reporters and the trace viewer are exactly the machinery the CDP layer hand-rolled badly. (Playwright-as-library would rebuild the runner by hand — the original inertia one layer up.) ADR-026 records the decision.
2. **Two projects.** `api` — request-context specs, no browser: the folded-in API smokes, proving the server through the same `/v1` door the app uses. `web` — phone viewport with `hasTouch`, tap-first: the product is mobile web; a desktop-viewport walk tests a frame no traveler holds. The gate report reads per-project.
3. **Scope is the entire harness — a founder reversal, on the record.** All eleven `drive-*` CDP walks (ported or rebuilt), the API `smoke-*` scripts (reversing the epic-map line's "smoke-*.js stays as it is" — founder, 2026-08-14, chosen with the recorded decision in front of them), and the diagnostic CLI. The CDP/`ws` machinery deletes entirely; **no new CDP script may be written after this story lands**.
4. **Port order: pilot → dark flows → remaining web → API project.** The pilot is the discovery walk — 34/34 green at inventory time — because a green baseline is the only way to tell "the harness works" from "the test is right". Then the retired walks' dark flows from the flow inventory (the lifecycle ladder and the publish act — rebuilding green-first would reproduce today's blind spot), then the remaining walks, then the API project.
5. **Identity allocation is per module, static, in one map.** Each spec file signs in as its mapped pool tag(s); exclusive tags only for specs that mutate traveler-level state (profile, ownership transfer); specs whose writes are confined to their own seeded trips may share tags, because the Editing Session — the one single-holder lock — is per-trip and self-seeding isolates it; `t10` held spare. The pool is not expanded in this story.
6. **Every spec seeds its own trip through the API.** No spec depends on pre-existing data, and no spec asserts global uniqueness against the accumulating local database — shape, caps and membership are asserted instead (the S4.3 lesson). A spec that cannot seed skips loudly.
7. **Two-lane target.** `baseURL` defaults to the preview container (the true build path — the gate lane); an environment switch points the same specs at Metro for the iterate lane. Nothing about the engine changes the staged-verification ruling.
8. **Reporting: exit code authoritative.** Line reporter for humans, JSON for the gate record, traces retained on failure, screenshots on failure, artifacts gitignored. Progress and the final summary come from the runner — never from probing processes.
9. **Command surface.** The orchestrator script dies; `npm run smoke` aliases the Playwright run; per-project filters (`smoke:api`, `smoke:web`) serve the iterate loop. The seeders, the pool tool and their shared helpers stay plain Node — they are fixtures, not tests — and the suite's helpers reuse the existing pool/API client rather than duplicating it.
10. **The diagnostic CLI is re-engined, contract intact.** Same name, same flags (`--shot`, `--shot-steps`, `--upload`, `--fresh`, `--width`, step/expectation vocabulary), same evidence bundle: page text, console errors, page errors, Google iframe / One Tap presence, every API request flagged bearer-vs-anonymous, and the newest-OTP-from-backend-log helper. `--fresh` narrows in meaning to the tool's own profile, since suite specs no longer share one.
11. **Harness lessons port as requirements, not as code.** Visible-match selection (mounted-underneath screens), anchoring on a label's start (card vs bookmark), case-insensitive text matching (`textTransform` paints what `innerText` reports), dialog auto-accept with the wording printed as evidence, skipping `aria-hidden` subtrees, and the two retired-walk defects that must not be recreated: a shared browser profile, and a spec counted as failed while executing zero assertions.
12. **The 68-second product poll stays real.** It is a legitimate product cycle; parallelism makes it overlap other specs instead of blocking them.
13. **Vocabulary: the web rung speaks Playwright.** Its tests are **specs** (projects, fixtures, workers); the term **walk** retires from the web rung and survives only on the device rung, where it names a genuinely different activity. Prescriptive docs (CLAUDE.md's verification sections, the glossary) update in this story; historical records are not rewritten.
14. **The gate keeps three rungs** (founder, Q20): the Playwright suite, the backend ITs, and the emulator walk. The founder's physical-device sideload pass remains theirs, on top. The emulator prerequisite on this workstation was satisfied at the grilling (AVD created from the already-downloaded Play Store image, boot-proven, Play services present).
15. **Doc amendments land with the story:** the epic-map port line discharges into H1 (with the API-rung reversal noted), the flow inventory gains a pointer to the specs that rebuilt each flow, BUILD_STATUS gains the H1 row, and CLAUDE.md's recipes swap the retired commands for the new ones.

## Testing Decisions

- This story *is* the test harness, so its verification is parity and honesty, not new product assertions: a good spec asserts **external behavior** — what a traveler sees on the screen or what `/v1` answers — never component internals or DOM structure beyond stable accessible roles and labels.
- **Pilot parity:** the ported discovery spec must green against the same stack where the CDP walk measured 34/34, before the CDP original is deleted — the baseline that separates harness defects from product defects.
- **Dark-flow proof:** each rebuilt inventory flow is demonstrated red-capable — sabotage one assertion (wrong copy, wrong state) and watch it fail — because a check with no failure mode is this repo's most-repeated trap. The runner's exit code must go non-zero on any failed spec; that is asserted once, deliberately, by running a knowingly-red spec.
- **Vacuous-run refusal:** a spec whose seeding fails must report skipped, not passed and not failed-with-zero-assertions — tested by pointing one spec at a dead backend.
- **Wall-clock is measured and recorded** at close (suite total, per-project), against the 15–25 minute baseline — the number the story exists to move.
- **Prior art:** the API specs' assertions port from the existing `smoke-*` scripts (their coverage is the contract); the web specs' assertions come from the living walks and the flow inventory's "what must be true" tables.

## Out of Scope

- **CI execution of the suite** — the gate topology stays local by design; running the stack in CI is its own backlog-worthy decision.
- **Maestro / device-rung automation** — parked with its own trigger; the emulator walk stays manual-plus-adb as today.
- **Any product code change.** Changing the harness and the app in one step destroys the ability to tell which one broke — the property the harness exists for. If porting exposes a product bug, it becomes an epic-map line or its own story.
- **Porting the seeders, the pool tool, or their helpers** — they are fixtures and remain plain Node.
- **Pool expansion** — ten identities fit the per-module map; new accounts (each needing a one-time human verification click) only when a module genuinely cannot fit.
- **Unauthenticated/public-web coverage** — nothing here changes audience or visibility semantics.

## Further Notes

- The flow inventory (`docs/design/web-walk-flow-inventory.md`) is the requirements source for the rebuilt coverage; its closing notes carry the two harness defects that must not be recreated and the instruction to rebuild dark flows before green ones.
- The wall-clock diagnosis, the trigger history and the founder calls are recorded on the epic-map port line; the retirement decision and its inventory are on the stale-walks line beside it.
- Browser binaries are a per-machine install (`npx playwright install chromium`) — a one-time setup step per workstation, worth a line in the scripts README.
- The emulator on this workstation: AVD `largata` (Pixel 7 profile, Play Store image, Android 17/API 37, WHPX-accelerated) was created and boot-proven at the grilling; the founder's dev Google account sign-in is the remaining one-time manual step for regression-checklist line #4.
