# 12: The guards dissolve and Modulith arrives

**What to build:** the boundary is enforced by the build with no exemption left. The trip module's legacy exemption is removed and its absence asserted; the new-world guard's content-half exemption and its old-world regex go with their tests; the module meta-test's dismantled list is empty and `discovery`, `feed`, `profile` and `itinerary` are under the rule. Trip's internals drop `public` where the layer folders allow. Spring Modulith arrives: `verify()` is green as a test, each module's api package is declared a named interface, and the cycle rule stays green beside it. The event publication registry rides this ticket only if tickets 09 to 11 are green at its start; otherwise it is left to the next story with a note on the epic map's registry line — the founder's ruling at slicing.

**Blocked by:** 11 (The old root sunsets).

**Status:** ready-for-agent

- [ ] The trip module's legacy exemption is gone and a test asserts no exemption of any kind remains in either boundary guard
- [ ] The new-world guard's content-half exemption and old-world regex are gone with their tests
- [ ] The module meta-test's dismantled list is empty; `discovery`, `feed`, `profile` and `itinerary` are under the rule; every guard's sabotage checks still pass
- [ ] Trip's internals are package-private wherever the layout allows, and the guards still pass
- [ ] Spring Modulith is on the classpath, `verify()` passes as a test, and each api package is a named interface
- [ ] The cycle rule is green
- [ ] The registry is adopted here only if 09 to 11 were green at this ticket's start, and the outcome either way is written in this ticket's comments and on the epic map's registry line

**Added 2026-09-09, from the pre-work PRs (see the spec's Comments):** two guards written ahead of this story deliberately do not enforce the contract rule, and this ticket owns them. `chat.api.ChatMessageResponse.of(ChatMessageView)` and `verification.api.VerificationCodeResponse.of(IssuedCode)` each map from an internal type in a static factory — real ADR-039 breaches. Each guard currently asserts the breach **still fails**, so fixing the module turns its own guard red until the real rule replaces it; the fix is to move the mapping to the module's side of the door, leaving the api record bare data as `trip.api.MembershipView` is. Until then the first AC below cannot honestly pass.

- [ ] `chat` and `verification` map on their own side of the door; their api records are bare data; both guards enforce the real contract rule and their breach-still-fails assertions are gone
- [ ] The cycle rule's recorded list is re-measured and every cycle this story closes is removed from it
