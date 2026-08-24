# S4.34 — Focus freshness: the four tabs stop needing a manual refresh

**Status:** ready-for-agent · **Epic:** E4 · **Depends on:** nothing · **Consumed by:** S4.35 (its reconnect contract marks queries stale and relies on focus to fetch them)
**Grilled:** 2026-08-24 (grill-with-docs, four rounds) — founder rulings recorded per question below.
**ADR:** none. No architectural decision is taken here; the shape was already recorded as an epic-map line (*"Trips-list freshness — focus revalidation, deliberately not sockets"*, 2026-08-15) and this story is that line pulled.
**Candidate-capability note:** **None.** Client-side read freshness: no traveler act, no footprint growth, nothing gateable.

**Immutable point-in-time intent** (issue-tracker rule): if intent changes during implementation, append to `## Comments`; never rewrite this body.

> **Context anchor.** ADR-001 (UI never touches the API; everything through the repository/query layer) · the epic-map line this discharges (2026-08-15, deferred by founder call the same day, trigger = founder pull — fired 2026-08-24) · S4.22's `nativeEvent.timestamp` gotcha (a synthetic event's timing fields are unreliable on react-native-web; read the clock yourself) · S4.13's *"which stack is this screen in?"* (expo-router keeps visited screens mounted, which is the whole reason this story exists) · the repo's standing doctrine that a check must have a failure mode.

## Problem Statement

Nothing in the app revalidates on navigation. The query client sets a global `staleTime: 30_000` (`src/query/queryClient.ts`) with no focus revalidation configured anywhere — `focusManager` is never wired — and expo-router keeps visited screens **mounted**, so switching tabs remounts nothing and refetches nothing. A traveler who edits a trip, moves to Home and comes back is looking at a cached list; the only ways to correct it are pull-to-refresh and waiting.

The exceptions prove the rule rather than covering it: `WorkspaceTravelersTab` (S4.28) and `pollQueries` (S2.1) each call `useFocusEffect(… refetch())` by hand, and Home runs a 60-second `setInterval` (`src/feed/freshPosts.ts`) that raises the "N new posts" pill. That poll is the only freshness mechanism on any of the four tabs — and because Home stays mounted, **it keeps polling while the traveler is on Discover, Trips or Profile**, costing a request a minute for a screen nobody is looking at.

The founder's report is a stance, not an incident: *"updates now come in when I refresh, and I want live updates on those screens."*

## Solution

Freshness becomes a property of **being looked at**. Two halves, because one is not enough:

- **App level** — `focusManager` driven by React Native's `AppState`, so background → foreground revalidates whatever is on screen. One wiring, catches cold starts and returns from other apps.
- **Screen level** — a shared `useRevalidateOnFocus` helper applied to each tab's list query, so a tab switch background-revalidates: the cached list stays on screen, no spinner, no scroll jump.

Home's poll is **rescoped to focus** rather than deleted — the "N new posts" pill is the best freshness affordance in the app and survives untouched; it simply stops running for a screen nobody is reading. And **retap-to-refresh generalizes**: the double-tap-the-active-tab convention that exists only on Home today reaches all four tabs.

No socket, no backend change, no wire change. Trip-scoped push is **S4.35**, and depends on this story existing.

## User Stories

1. As a traveler, I want a screen I return to to be correct without pulling it down, so that moving between tabs doesn't leave me reading stale data.
2. As a traveler, I want the list to update underneath me rather than flashing a spinner, so that revalidation never costs me my place or my scroll position.
3. As a traveler, I want foregrounding the app to show me current data, so that a phone left in my pocket doesn't strand me on yesterday's screen.
4. As a traveler, I want tapping the tab I'm already on to refresh it, so that the same gesture works on all four tabs and not only on Home.
5. As a traveler, I want the "N new posts" pill to keep telling me something arrived on Home, so that new content never yanks the feed under my thumb.
6. As the founder paying for the backend, I want a screen nobody is looking at to stop making requests, so that idle sessions cost nothing.

## Locked decisions *(founder, 2026-08-24, in grilling order)*

### 1 · The contract is bounded staleness, not push

"Live" means *correct whenever you look at it*, not *sub-second arrival while you sit still*. Focus revalidation delivers exactly that, fixes all four tabs with one pattern, and stays valuable after a push layer arrives — it catches the cold starts and reconnects a push channel structurally misses. Push for the trip-scoped surfaces is S4.35's business, decided in the same grilling.

### 2 · Freshness is focus-scoped — work stops when a screen loses focus

Four always-mounted screens each doing background work is four times the battery and API load for information nobody is reading. Only the focused screen revalidates. This is why Home's poll is rescoped rather than left alone.

### 3 · "Once at the query layer" is not achievable, and the spec says so

react-query's `focusManager` is **app**-level — it tracks window/AppState focus, not screen focus. The founder's actual complaint is tab switching, and expo-router keeps screens mounted, so no remount fires and `focusManager` alone would not move. Both halves ship: the `AppState` wiring **and** a per-screen hook at roughly five call sites, via one shared helper so they cannot drift. Recorded because the epic-map line's "wire it once" phrasing is optimistic, and discovering it mid-build is how a small story grows.

### 4 · Retap-to-refresh extends to all four tabs

`onHomeTabRetap` exists only on Home. The same helper serves Discover, Trips and Profile. Doing it later means touching all four tabs a second time.

### 5 · Home's poll survives, focus-scoped

The pill tells a traveler something arrived without moving the list. It is kept. What changes is that its interval runs only while Home is focused.

## Mechanics *(the decisions' consequences)*

- **The app-level half:** an `AppState` listener calls `focusManager.setFocused(state === 'active')`. It lives beside `useSocketLifecycle` in the root layout, which already owns the `AppState` subscription shape — the two are the same lifecycle question asked of two subsystems. **Web fork:** react-query's browser default already tracks window focus; the native fork supplies it from `AppState`.
- **The screen-level half:** one helper — `useRevalidateOnFocus(query)` — wrapping `useFocusEffect` + `refetch`, applied to the four tabs' list queries. It **background-revalidates**: the cached data stays rendered and no `isPending` state is entered, so nothing flashes. `pollQueries.ts` and `WorkspaceTravelersTab` are migrated onto it rather than left as hand-rolled twins — two existing copies of a pattern about to gain four more is exactly how the counter-pill chrome got copied into three files.
- **Home's poll:** the `setInterval` in `FeedScreen` is started on focus and cleared on blur. `POLL_MS` and `freshPosts.ts` are untouched, as is `NewPostsPill`.
- **Retap:** `onHomeTabRetap` generalizes to a per-tab registry keyed by route. Each tab's screen registers its own handler; the behaviour stays what Home already does — at top, refresh with the "You're caught up" toast; scrolled down, scroll to top first. **The web fork must read `Date.now()` itself** rather than trusting `nativeEvent.timestamp`, which is not populated on react-native-web (S4.22 — the feed's double-tap silently never fired for exactly this reason, and the pure module's Jest tests passed the whole time because they pass real numbers).
- **`staleTime` is not changed.** 30 seconds remains the right bounded-staleness window; what was missing is a trigger, not a shorter fuse. Reducing it would make focus revalidation redundant *and* make every other read chattier.
- **Nothing subscribes, connects or listens to a socket in this story.**

## Wire changes

**None.** No endpoint is added, changed or read differently. No schema change. No new dependency.

## Acceptance criteria

1. A traveler edits a trip on the workspace screen, navigates to Home, returns to Trips — the card reflects the edit, with **no pull-to-refresh and no spinner**, and the list does not jump or lose scroll position.
2. The same walk on Discover and on Profile: leaving and returning revalidates the screen's list query.
3. Backgrounding the app for longer than `staleTime` and foregrounding it revalidates the focused screen (device rung — `AppState` has no web equivalent worth trusting).
4. While the traveler is on Discover, Trips or Profile, **no feed poll request is issued**; returning to Home resumes it. Proven by observed requests, not by reading the code.
5. The "N new posts" pill still appears on Home when a postcard is posted by another traveler while Home is focused, and tapping it still refreshes to top.
6. Tapping the already-active tab refreshes it on **all four** tabs; at the top it refreshes, scrolled down it scrolls to top first. Proven on web and on device — the double-tap timing is the platform-forked part.
7. `pollQueries` and `WorkspaceTravelersTab` behave exactly as before after migrating onto the shared helper (no regression in the poll or roster surfaces).
8. The retap decision and the focus-revalidation decision are pure, Jest-tested modules with sabotage-verified failure modes — a broken window comparison, or a helper that refetches while pending, must turn a test red.

## Testing decisions *(the seams)*

Mobile Jest on the pure seams: the retap window decision (with an injected clock — no `Date.now()` in what a test must steer, the S4.10 precedent) and the revalidation predicate. **No component rendering** — the existing suites test pure modules, and importing screens pulls reanimated's native init (S4.17). Playwright (web project) for AC 1, 2 and 6: navigate away, mutate through a second context, navigate back, assert the change with no refresh gesture — sabotage-verified by removing the focus wiring. AC 3 and the device half of AC 6 close on a **dev build on the emulator**; a release APK earns nothing here, since nothing about this story differs by signing key. AC 4 is closed by watching the backend log for feed requests while parked on another tab — the discriminating signal is the absence of a request, so the check states its own failure: park on Home first, see the request, then move.

## Out of scope

Any socket, subscription or server push (**S4.35**) · changing `staleTime` or any cache policy beyond adding a revalidation trigger · caching the feed's viewer-independent first page (epic-map line, *"Read-load ladder"* — a backend change with a much larger payoff, deliberately not smuggled in here) · the Travelers tab's own live behaviour (S4.35) · pull-to-refresh, which already works and is untouched · any change to what the four screens render.

## Comments

**2026-08-24, owner review — passed.** All four tickets approved as written ("tickets are all good and confirm"); statuses flipped `needs-triage` → `ready-for-agent`. Implementation deliberately not started — the owner triggers the build. Ticket 01 has no blockers and can begin immediately; so can S4.35's ticket 01, and the two do not touch each other.

**One thing the owner should know is still open, recorded here rather than lost in the transcript.** The gate ticket's *gate record* section was added at the owner's ask and answers "results get lost in translation". It does **not** answer the second thing the owner raised — a fix that was lost and a bug reintroduced in Discovery — because a published page does not fail when a fix is reverted. The instrument for that already exists in this repo and was not used: `REGRESSION_CHECKLIST.md`'s ratchet (*"every bug that escapes to a human adds a line here"*) holds **no Discovery line at all**, and there is no off-epic ledger entry for the incident. The owner deferred deciding how to maintain this. Whoever picks the thread up needs two facts only the owner has: **which** Discovery bug it was, and **how** the fix was lost (a merge or rebase dropped it · someone rewrote the code without knowing why it was that way · it was never committed) — the remedy differs by shape.
