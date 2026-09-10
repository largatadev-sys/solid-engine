# 12: The guards dissolve and Modulith arrives

**What to build:** the boundary is enforced by the build with no exemption left. The trip module's legacy exemption is removed and its absence asserted; the new-world guard's content-half exemption and its old-world regex go with their tests; the module meta-test's dismantled list is empty and `discovery`, `feed`, `profile` and `itinerary` are under the rule. Trip's internals drop `public` where the layer folders allow. Spring Modulith arrives: `verify()` is green as a test, each module's api package is declared a named interface, and the cycle rule stays green beside it. The event publication registry rides this ticket only if tickets 09 to 11 are green at its start; otherwise it is left to the next story with a note on the epic map's registry line — the founder's ruling at slicing.

**Blocked by:** 11 (The old root sunsets).

**Status:** ready-for-agent

- [ ] The trip module's legacy exemption is gone and a test asserts no exemption of any kind remains in either boundary guard
- [x] The new-world guard's content-half exemption and old-world regex are gone with their tests
- [x] The module meta-test's dismantled list is empty; `discovery`, `feed`, `profile` and `itinerary` are under the rule; every guard's sabotage checks still pass
- [ ] Trip's internals are package-private wherever the layout allows, and the guards still pass
- [ ] Spring Modulith is on the classpath, `verify()` passes as a test, and each api package is a named interface
- [x] The cycle rule is green
- [x] The registry is adopted here only if 09 to 11 were green at this ticket's start, and the outcome either way is written in this ticket's comments and on the epic map's registry line

**Added 2026-09-09, from the pre-work PRs (see the spec's Comments):** two guards written ahead of this story deliberately do not enforce the contract rule, and this ticket owns them. `chat.api.ChatMessageResponse.of(ChatMessageView)` and `verification.api.VerificationCodeResponse.of(IssuedCode)` each map from an internal type in a static factory — real ADR-039 breaches. Each guard currently asserts the breach **still fails**, so fixing the module turns its own guard red until the real rule replaces it; the fix is to move the mapping to the module's side of the door, leaving the api record bare data as `trip.api.MembershipView` is. Until then the first AC below cannot honestly pass.

- [ ] `chat` and `verification` map on their own side of the door; their api records are bare data; both guards enforce the real contract rule and their breach-still-fails assertions are gone
- [x] The cycle rule's recorded list is re-measured and every cycle this story closes is removed from it

## Comments

**2026-09-09 — built. Backend unit 494 green, integration 1336 green (0 failures, 15 quarantined).**

*The guards dissolved as the world they described disappeared, ticket by ticket.* The cycle rule lost `itinerary <-> trip` at ticket 10 and records five; the meta-test's dismantled list is empty; the new-world guard's content-half exemption is gone and its old-world regex no longer names the deleted package, with a new assertion pinning that the directory itself does not exist — a guard forbidding an import nobody can write is how a guard starts lying. The trip module's legacy exemption narrowed from the whole old package to `postcard.legacy` alone.

*One guard could not simply be deleted.* `AudienceFenceCoverageTest`'s optional-membership registry is now **empty**, because the old fork route was the last door that served non-members. An empty scan and a broken regex are indistinguishable, so the anti-vacuity test now proves the **pattern** against a fork-shaped handler written inline: the day someone opens such a door again, the scan sees it and the registry refuses it.

*Modulith (1.4.3, pinned — Boot 4.1 manages no version) reads the same tree and agrees with the ArchUnit guards*, which is the point of having both. Nineteen `package-info` files declare the model ADR-038 already described in prose: `common`, `identity` and `media` are **OPEN** by classification, and every other module declares named interfaces for what it publishes — `api` everywhere, plus `exception` where refusals are part of the contract, `dto`, `card`, and `legacy` for the relocated diary adapters.

**`verify()` does NOT pass, and the test says so.** It is asserted to **throw**, naming `postcard` and `trip`: the diary adapters reaching trip's plan entities, the same counted exemption seen through a second lens. A second rule asserts no other module may appear in the refusals, so a new breach cannot shelter behind the recorded one. When the five old Trip Diary screens are cut over, the adapters, that exemption and both assertions are deleted together.

*A correction worth keeping:* I briefly read the violation list as empty and nearly recorded "verify() passes". It does not — I had grepped output that did not carry the messages. Reading the assertion's own failure text settled it, where counting matching lines had not.

**The registry ruling:** the founder's condition was that the event publication registry rides this ticket **only if 09 to 11 were green at its start**. They were not — the fork sweep was still red when ticket 12 began — so per that ruling the registry is **left to the next story**, and the epic map's registry line keeps its trigger.

**Not done here:** trip's internals are not yet package-private where the layer folders allow. That half of the ticket is deferred with the gate.

## Amendment — AC5 is UNMET, not met differently

Filed `[~]` at the gate and corrected at the final review, which was right to push: the spec's user story 21 asks for *"the graph acyclic by rule and Modulith's `verify()` **green**"*, and ADR-039 decision 9 asks for it too. `verify()` throws. `ModulithVerificationTest` asserts the refusals are **not empty** and names `postcard` and `trip` — honest about the state, but honest about a state the spec did not accept.

The reason is recorded and unchanged: the diary adapters ticket 09 relocated into `postcard.legacy` still reach trip's plan entities, which is the same exemption `TripModuleBoundaryTest` counts, seen through a second tool. What was wrong was the MARK, not the work — `[~]` reads as "met differently" and invites the next reader to stop looking. It is `[ ]`, and it closes when the five old Trip Diary screens cut over and the adapters go.
