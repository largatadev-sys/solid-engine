# 08: Close-out — the gate

**What to build:** the proof that the story is whole, and the one commit the workflow requires last. Three things no ticket can do alone. The assertion-line diff over the entire branch against `dev`, on TW-1's gate precedent: the extraction's whole claim is that nothing at the wire moved, and this is where that claim is made once for the branch rather than per ticket, with every changed assertion explained by name. The device rung: the LAN walk on a real phone — the mail icon's tap target, the header at its new size beside the other three roots, and the pushed Requests list's safe area, since regression-checklist line 11 names a docked surface whose CTA sat under the home indicator and a pushed list is the shape that hides it — **executed only on the founder's plain yes, every time**, because it runs against the local stack. And the BUILD_STATUS row flipped to ✅ with its spec link, in the last commit on the feature branch, because updating it after means committing to `dev`, which this workflow does not allow. Then the PR: the proposal, never merged unasked.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07 — every ticket.

**Status:** blocked — the device rung is owed, and it needs the founder's yes

- [x] The assertion-line diff over `dev...HEAD` reports every changed assertion, and each is explained on this ticket by the ticket that changed it; guard files and the meta-test are excluded from the comparison, as at TW-1, because a guard is the branch's own apparatus
- [ ] **OWED — the founder's call.** The LAN stack is stood up and the walk done on a real phone: the icon is tappable at the size a finger needs, the count is legible, the Trips title reads as the other three roots do, Requests' bottom-most control clears the home indicator, back returns to Trips with the tab bar restored — each stated with what was seen, not "looks fine"
- [ ] **OWED with the walk.** The secure-context caveat is read before any conclusion from the phone rung: nothing this story adds depends on a secure context, and the walk says so rather than assuming it
- [x] The off-epic ledger carries no entry — this is a planned story — and the story's row in BUILD_STATUS carries its spec link. **It reads 🔄, not ✅**, because the walk above is owed; the row names why
- [x] `git diff --name-only` is empty before that commit; the staged paths are compared both ways against what this branch edited
- [x] The PR is opened against `dev` with the story id in its title and no attribution line, and is **not merged** — the founder says when: [#80](https://github.com/largatadev-sys/solid-engine/pull/80)
- [ ] **N/A this session.** The LAN stack is torn down after the walk, and the docker images it built are named in the close-out — nothing was stood up, so nothing is left behind

## The assertion-line diff, explained

`node backend/scripts/assertion-diff.js` against `a3570e85`:

```
test files changed on this branch: 6
pre-existing files compared:       3
new files (nothing to compare):    2
PRE-EXISTING ASSERTIONS CHANGED:   4
```

**Every one is an addition or a deletion. Zero pre-existing assertions were modified**, which is the extraction's whole claim — and specifically, **not one of the fifteen ITs that reach `GET /v1/trips` was edited at all**. They do not appear in this list.

| File | Change | Which ticket, and why |
|---|---|---|
| `InvitationStorageIT` | 14 → 21 assertion lines | **Ticket 04.** Two tests added: `seen_at` is nullable and starts null, and marking seen writes the instant and is idempotent. Nothing existing touched. |
| `InboxContextIT` | 59 → 68 | **Ticket 04.** Two tests added for the seen lifecycle — arrives unseen, clears on the route; and a second glance does not rewrite what the first recorded. Amended at `449d98e0` when CI showed JSONPath answers `[null]` for a present-but-null field, so the null checks read `seen_at` through the class's own jdbc helper instead. |
| `PublishFreezesMembershipIT` | 55 → 57 | **Ticket 04.** Two tests added: marking seen is **NOT** refused on a published trip, and answers the same when there is nothing to mark. They sit in this class deliberately — beside the three refusals they contradict, which is where a reader looking for the freeze's shape will find them. |
| `ItineraryPublicationIT` | **DELETED** | **Ticket 07.** Fifteen quarantined tests, gone. The case-by-case diff against the successor's eight is on ticket 07: fourteen covered, one correctly obsolete. |

Two files are new and have nothing to compare: `TripListFacetsIT` (ticket 01) and `InboxTopicEventsIT` (ticket 05).

## What is actually verified, and what is not

**Verified on CI** (run `34810077661` for the suites, plus the runs after it):

- Every test this story added or touched passes: `InboxTopicEventsIT` 7/7 · `InvitationStorageIT` 9/9 · `InboxContextIT` 13/13 · `InvitationContractIT` 19/19 · `AnyMemberInvitesContractIT` 7/7 · `TripListFacetsIT` 2/2 · backend unit 499/499 · mobile typecheck + 6,906 jest tests.
- The `mytrips` boundary guard was **sabotage-checked with a real usage**, both halves: a planted repository and a planted call to `TripCategory.parse` each failed by name before the guard went green. The conditional-count pin and the accept-failure pin were each sabotage-checked too, and **the sabotage was grepped before it was believed** — the S4.30 lesson.

**NOT verified, and stated rather than hidden:**

- **The device rung is entirely undone** — the two ACs above. It needs the founder's yes.
- **No local rung was exercised at all.** Docker Desktop was not running this session, so the full-stack instance, the preview container and every local IT run were unavailable. CLAUDE.md's *"verify at the layer that ships"* is unmet on every rung below CI.
- **Playwright has never run.** It is PR-gated and the PR opened at close-out, so **the two returned quarantined walks, the count-lifecycle walk and the live-fall walk have all been written but not executed.** `npx playwright test --list` confirms 871 tests in 56 files parse and that the invitation-inbox file carries 14 tests and **zero skips** — but parsing is not passing, and ticket 06's three-attempt count is owed.
- **The branch's CI cannot be green end-to-end**, because the backend lane is red on a fault this story did not cause: `minio/minio` is gone from Docker Hub and the test base still pins it. Proven not-ours by a `workflow_dispatch` control run on unmodified `dev` (`34810645229`) failing identically — same classes, same order, **zero assertion failures**. Quarantine row and epic-map line filed, with the fix (point both at Garage, ADR-021) and an immediate trigger.

## Comments

*None yet.*
