# 05 — Story gate

**What to build:** nothing new — the story closed on evidence, at the layers that ship. The three rungs walked, the tracker updated before the merge, anything raised mid-story routed to its one home.

1. **Device AC (dev build, two pool accounts, tags stated in the write-up — t1 = original owner, t2 = offeree):** t1 offers → **t2's trip screen shows the banner** (the discovery claim gets its own on-glass assertion — it is the reversal's justification) → t2 accepts through the confirm → crown moves on both rosters → **both** My Trips keep the trip → t1's own row now shows Leave → **t1 leaves**. The S1.5 dead end (`OWNER_CANNOT_LEAVE`) proven open end-to-end. (Spec AC 12.)
2. **Web preview container (true build path):** `drive-preview.js` — as t1, drive the offer with the confirm intercepted, cancel first (roster unchanged) then confirm (badge appears); as t2, drive accept the same double way. A confirm that ignores "no" is worse than none. (Spec AC 13.)
3. **Deployed-dev probe, post-merge:** one offer → accept loop between pool accounts on deployed dev. The SQL check **names the `railway` database** (S1.1's rule — a null result from an unnamed database is not an answer) and reads three discriminating facts: offer row `accepted`, `ownership_transfer` row present, membership roles swapped. State what failure would look like before running it. (Spec AC 14.)
4. **Tracker discipline:** BUILD_STATUS row → ✅ with the spec link, **in the last commit on the feature branch, before the merge** · regression checklist reviewed — any bug that escaped to a human during this story adds its line · epic-map sweep: anything raised mid-story that outlives it gets its backlog line (candidates from the spec: none open — the claim flow and `kind` column are already recorded at S5.5).
5. **Full suites green** on the local stack before proposing the squash-merge: backend ITs, mobile Jest, clean `tsc`. The merge itself is propose-first, as every promotion is.

**Blocked by:** 01, 02, 03, 04 — the whole story.

**Status:** in-progress — all three rungs run; only AC 14's two database queries remain (see Comments 9)

- [x] Device walk complete as scripted, tags stated, screenshots + backend-log evidence captured (spec AC 12)
- [x] Preview container driven both roles, cancel + confirm each, via CDP (spec AC 13)
- [~] Deployed-dev probe (spec AC 14): **API half closed** — smoke 22/22 against `api-dev.largata.com`, roles swapped and offer resolved read back. **DB half open** — the two `railway`-database queries need running by hand (no Railway CLI here); SQL in Comments 9
- [x] BUILD_STATUS + regression checklist + epic-map sweep done in the last feature-branch commit
- [x] Full backend + mobile suites green; squash-merge to dev proposed, not executed

## Comments

**2026-07-28 — two rungs closed locally; the deployed-dev probe waits on the merge.**

**Evidence.** Backend **254 ITs + 28 unit, 0 failures**. Mobile **514 tests**, clean `tsc`.

1. **API rung — `scripts/smoke-ownership-transfer.js`, committed, 22/22 against the local stack** with real verified pool accounts (t1 = original owner, t2 = offeree/new owner, t3 = bystander). Every step is discriminating and fails loudly: the pre-transfer `OWNER_CANNOT_LEAVE` control, the bystander seeing the offer (governance state is workspace-walled, not private), `OFFER_ALREADY_PENDING`, the stale accept refused with `NOT_OFFER_TARGET` while nothing moves, the crown moving, authority moving *with* the role (the ex-owner can no longer offer, the new owner can), both parties keeping the trip in My Trips, and finally t1 leaving — the dead end open. Database confirmed the three facts no endpoint exposes: one `ownership_transfer` row (t1 → t2), the offer history reaching every terminal status through real flows (`ACCEPTED`, `REVOKED` ×3, `VOIDED`), and `itinerary.owner_id` naming t2.

2. **Web preview container — `scripts/drive-ownership-transfer.js`, committed, 12/12.** Built through the true path (`npm ci` + export inside the image, Caddy serving), driven with `window.confirm` intercepted via CDP and run **twice per act**: cancel leaves server state untouched, confirm acts. Both dialogs' text was captured, proving the shared wording module reached the browser rather than a platform default. The offeree's trip-screen banner renders on web. **Committed rather than scratched** — S0.5 wrote a preview driver and threw it away, S0.6 rewrote it, S1.4 left one untracked; this is that pattern stopped.

3. **Device (dev build, two pool accounts, deep-linked).** t1's Members screen shows `Make owner` + `Remove` on t2's row and nothing on their own → the native dialog names the consequence → the roster flips to an "Ownership offered" badge with `Withdraw` → **t2's trip screen shows the discovery banner**, which navigates to Members → accept dialog names the authority taken on → the crown moves: t2 becomes owner with the invite field, t1 becomes a member → **t1 now sees `Leave trip`, a control they could not have had before this story**, and leaving drops the trip from their My Trips. Screenshots in the session scratchpad.

4. **My Trips membership-scoping was visible on the device twice over**: t2's list showed trips they had only ever *joined* (empty before this story), and t1's list kept a trip whose ownership they had handed away.

5. **AC 14 (deployed-dev probe) is outstanding and correctly so** — deployed `dev` runs `e725a49`, which is docs only. The probe is a post-merge check by definition; the merge is a promotion and needs the owner's approval. `smoke-ownership-transfer.js` runs against it unchanged: `LARGATA_API_BASE_URL=https://api-dev.largata.com node scripts/smoke-ownership-transfer.js`.

6. **A rig trap worth recording, hit twice this run** (added to CLAUDE.md): `adb reverse` was listed-but-inert *and* `adb kill-server`/`start-server` did not revive it — the documented `10.0.2.2` fallback was the fix for both Metro and the backend. Also: `mobile/.env` already points the app at `10.0.2.2:8080`, so only Metro needed the pref push. And the emulator held a **stale S1.5 session on an `@largata.test` account**, which presented as "Could not load members" — a rendering that reads as breakage but was the guard 404-masking a non-member correctly; the backend log was the discriminating signal, not the screen.

**2026-07-28 — post-merge: the deployed-dev probe (AC 14).**

Squash-merged as `2d1cf49`; Railway deployed it.

7. **Confirming the deploy needed a discriminating check, and the first two candidates were not.** An unauthenticated `POST` to the new offer route answers **401 on both builds** — default-deny rejects before routing (regression-checklist line 1), so it says nothing about whether the route exists. A 404 on a bad trip id is equally useless: the old build 404s for no-such-route, the new one 404s from the guard's mask. The signal that *is* discriminating is the **presence of the `ownershipOffered` field on a roster row** — a field the old build cannot emit and the new build always emits. It read absent first (old build still serving), then present. Stated before trusting it, per the rule this repo has been burned by three times.

8. **`smoke-ownership-transfer.js` ran unchanged against `https://api-dev.largata.com`: 22/22.** The same arc as local, now over the real network with real Firebase tokens: offer → the bystander seeing it → `OFFER_ALREADY_PENDING` → the stale accept refused with `NOT_OFFER_TARGET` while nothing moves → the crown moving → authority moving with it → both parties keeping the trip in My Trips → **t1 leaving**, the S1.5 dead end open on a deployed rung → the departure void. Final roster read back afterwards: one row, `t2 [owner]`, `ownershipOffered: false`.

9. **One half of AC 14 is outstanding and needs the owner's hand: the two database facts.** The spec asks for a query naming the **`railway`** database, and no Railway CLI is available in this environment. The API confirms roles-swapped and offer-resolved; `ownership_transfer` and `itinerary.owner_id` have no endpoint by design (the table's whole point is that it has no reader yet), so they cannot be probed over HTTP. To close it, run against **database `railway`** on the deployed-dev Postgres:

```sql
-- expect exactly ONE row, t1 -> t2
SELECT t.from_traveler_id, t.to_traveler_id, t.transferred_at
  FROM ownership_transfer t JOIN workspace w ON t.workspace_id = w.id
 WHERE w.itinerary_id = '019fa6da-8748-795c-8c23-1c2257e567aa';

-- expect ACCEPTED (t2), REVOKED x3, VOIDED (t3)
SELECT o.status, o.target_traveler_id FROM ownership_offer o
  JOIN workspace w ON o.workspace_id = w.id WHERE w.itinerary_id = '019fa6da-8748-795c-8c23-1c2257e567aa';

-- expect t2 = 019fa308-bed4-7919-9102-7af0838deabe
SELECT owner_id FROM itinerary WHERE id = '019fa6da-8748-795c-8c23-1c2257e567aa';
```

Both were verified in full on the local stack (Comment 1), so this is a rung confirmation rather than an unproven claim — but it is not closed until someone runs it.
