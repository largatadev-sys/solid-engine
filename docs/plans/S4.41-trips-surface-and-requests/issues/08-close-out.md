# 08: Close-out — the gate

**What to build:** the proof that the story is whole, and the one commit the workflow requires last. Three things no ticket can do alone. The assertion-line diff over the entire branch against `dev`, on TW-1's gate precedent: the extraction's whole claim is that nothing at the wire moved, and this is where that claim is made once for the branch rather than per ticket, with every changed assertion explained by name. The device rung: the LAN walk on a real phone — the mail icon's tap target, the header at its new size beside the other three roots, and the pushed Requests list's safe area, since regression-checklist line 11 names a docked surface whose CTA sat under the home indicator and a pushed list is the shape that hides it — **executed only on the founder's plain yes, every time**, because it runs against the local stack. And the BUILD_STATUS row flipped to ✅ with its spec link, in the last commit on the feature branch, because updating it after means committing to `dev`, which this workflow does not allow. Then the PR: the proposal, never merged unasked.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07 — every ticket.

**Status:** done — the device rung walked by the founder 2026-09-15; the stack stays up until told otherwise

- [x] The assertion-line diff over `dev...HEAD` reports every changed assertion, and each is explained on this ticket by the ticket that changed it; guard files and the meta-test are excluded from the comparison, as at TW-1, because a guard is the branch's own apparatus
- [x] The LAN stack was stood up (2026-09-15, on the founder's yes) and **the founder walked it on a real phone as `t1`** with five trips across every lifecycle tab, one unseen invitation on the icon and both card kinds on Requests — reported *"all good on the UI"*. Stood up per the recipe with every trap checked before the hand-over: the LAN IP grepped from the exported JS (`localhost:8080` present 0 times), CORS preflighted on the secured `/v1/me` with a negative control (unlisted origin → 403), `LARGATA_WEB_BASE_URL` read back from the container, and a real join-link's `shareUrl` confirmed to name the LAN. The one observation raised — the first row's swipe hint peeking on every browser refresh — is the S4.38 once-per-session hint doing what a module-level flag does under reload; native never refreshes, so it is intended, and recorded rather than changed
- [x] The secure-context caveat was read before the walk: nothing this story adds — a query, a route, a pushed screen, a badge — depends on a secure context, so the plain-HTTP LAN IP proves the same code the HTTPS deploy runs
- [x] The story's row in BUILD_STATUS reads ✅ with its spec link. The off-epic ledger carries **one** entry after all — the object-store test image, which surfaced on this branch but is not this story's work; the Garage port that followed is recorded on the same entry
- [x] `git diff --name-only` is empty before that commit; the staged paths are compared both ways against what this branch edited
- [x] The PR is opened against `dev` with the story id in its title and no attribution line, and is **not merged** — the founder says when: [#80](https://github.com/largatadev-sys/solid-engine/pull/80)
- [ ] The LAN stack is **still up** for the founder's use; teardown is `docker compose down` plus `docker rm -f largata-preview-lan` and `docker rmi largata-preview:lan`, on the founder's word. Containers: `app-backend-1`, `app-postgres-1`, `app-storage-1`, `largata-preview-lan`. Image: `largata-preview:lan`

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

**Verified on CI** — three consecutive full runs green, every job: `34858894810`, `34861211886`, `34862760069`. Backend 502 unit + 1,342 ITs, Playwright 864–866, mobile 6,910 jest.

- Every test this story added or touched passes: `InboxTopicEventsIT` 7/7 · `InvitationStorageIT` 9/9 · `InboxContextIT` 13/13 · `InvitationContractIT` 19/19 · `AnyMemberInvitesContractIT` 7/7 · `TripListFacetsIT` 3/3 · `MyTripResponseKeepsTheTripWireShapeTest` 3/3.
- The query-count check was sabotage-checked twice: once through CI when Docker was down (`b9cb9a8d`, reverted `0df7b426`), and again locally after the counter moved to a `ThreadLocal` `StatementInspector` at the second review — **expected 7, but was 36** both times, the twenty-nine queries a page of thirty used to cost.
- The `mytrips` boundary guard was **sabotage-checked with a real usage**, both halves: a planted repository and a planted call to `TripCategory.parse` each failed by name before the guard went green. The conditional-count pin and the accept-failure pin were each sabotage-checked too, and **the sabotage was grepped before it was believed** — the S4.30 lesson.

**What it took to get there, kept because each round found something real:**

- **The device rung** was undone for the whole build session — Docker Desktop was not running, so no local rung existed and CI was the only evidence. It was stood up the next day on the founder's yes and walked on a real phone; the ACs above record what was checked before the hand-over.
- **Playwright** took four rounds to go green: two stale S4.35 walks still asserting the inbox header this story removed (`ae6b4a9f`, `0ce378ce` — re-pointed, not weakened), then the accept race that had been the 2026-08-28 quarantine all along — first mis-fixed as a no-op (`812bcc9e`), then fixed for real at the second review (`af4ed367`) once the library source showed the hook's `onSettled` is awaited exactly like its `onSuccess`. Ticket 06 carries the mechanism and the three-attempt count.
- **The backend lane** was red on arrival and stayed red across the build, on a fault proven not-ours by a control run on unmodified `dev` (`34810645229`): Docker Hub had dropped `minio/minio` and the test base pinned it. A quay.io swap (`7d5eba64`) went green once and then stalled two minutes on the next pull; the Garage port (`e9fdb27a`) that followed runs the same emulator compose does and started in 2.0s on CI. The stack and its tests emulate one store now, which S3.3 should have carried into the test tree.

## The second code review, 2026-09-15 — what was taken and what was declined

Run against the founder's Java/Spring checklist on top of the repo's standards. **No blocker.** Taken:

- **`blocker`-grade in effect though filed under (c):** the accept-race fix in `812bcc9e` was a **no-op** — query-core awaits the hook's `onSettled` before dispatching success just as it awaits `onSuccess`. Verified against `mutation.js` and `mutationObserver.js` in `node_modules`, not taken on the reviewer's word. Corrected: the hook no longer awaits the invalidation, the caller navigates first, and the pin asserts the library's real ordering. Ticket 06 carries the correction.
- **53 mojibake lines in `tabRouting.test.ts`** — my earlier "repair" double-encoded a file that was already UTF-8, producing valid-but-garbage UTF-8 that passed every scan. Rebuilt from `dev` plus the three S4.41 tests; the diff against `dev` is now 21 lines, not 129.
- **`should:` §12 shared static state** — Hibernate `Statistics` is SessionFactory-global and a scheduler can fire between `clear()` and the read. Replaced with a `ThreadLocal` `StatementInspector`; sabotage re-run locally, still 7 vs 36.
- **`should:` byte-for-byte has no test** — `MyTripResponseKeepsTheTripWireShapeTest` pins the two records' component names, order, and types (the four `Void` fields as a closed list).
- **`nit:` `Role.wireName()`** — added; both hand-spelled call sites use it.
- **Email-addressed invitations get no live count-fall** — accepted at the grilling in spirit, never written down. Now on the spec beside the second-page gap.
- **Off-epic ledger** for the quay.io swap — both reviews asked; added.

Declined, with the reason:

- **`should:` §5 `markInboxSeen` as a `@Modifying` bulk update.** The reviewer's own stated downgrade applies: it mirrors `voidPendingInvitations`' shape, and a traveler's pending inbox is tens of rows at most. A JPQL update would also bypass `Invitation.markSeen`'s idempotence guard, moving the rule from the entity to a `WHERE`. Not worth the seam.
- **`question:` `TripListEntry` mixes enums and wire strings.** True, and deliberate: `Visibility` and `WorkspaceState` live in `trip.*.entity` packages ADR-038 keeps out of `api`. Moving them is a `trip` refactor, not this story's.
- **`question:` `pendingFor` is unbounded.** Pre-existing; the diff only extracted it. An inbox is bounded by how many trips can invite one traveler — an epic-map line if it ever isn't.

## Comments

*None yet.*
