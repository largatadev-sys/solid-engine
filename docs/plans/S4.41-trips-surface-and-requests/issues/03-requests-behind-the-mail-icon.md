# 03: Requests behind the mail icon, and the Trips header at 22

**What to build:** a traveler opening Trips sees trips and nothing above them. Where the search icon was — a stub whose only behaviour was *"Search trips, coming soon"* — there is a mail icon; tapping it pushes a **Requests** screen holding what used to sit as a header on every lifecycle tab: the invitations sent to them and the join requests they sent, on the same cards, with the same accept, decline-behind-its-confirm and withdraw (record round 1 Q2, round 2 Q1, Q2). The screen is built from the primitives the other screens pushed off Trips already use — the shared header with a back control, the archived-trips list container, pull-to-refresh, an empty state that says nothing is pending — and the tab bar hides on it because the standing rule hides it on everything pushed above a root; nothing is added to that rule (spec decision 6). The Trips title drops from 28px to the 22px extra-bold the other three roots carry, using the token Discover uses — the founder's ruling over the S4.26 canvas, recorded on the epic map (spec decision 13). No backend changes: this ticket is demoable on the preview against today's server. The count on the icon is ticket 04; here the icon is the affordance and nothing more. Two structural tests pin the old truth and flip here: the tab-routing guard that asserts search is greyed (S4.26), and the coming-soon key list. Every Playwright walk that meets the inbox as a header today re-routes through the icon; the two quarantined accept walks stay quarantined until ticket 06.

**Blocked by:** None (can start immediately) — mobile only; independent of the backend chain.

**Status:** done

- [x] The Trips header shows a mail icon in the search icon's place, labelled for a screen reader; the search stub, its coming-soon message key, and the routing guard's "search greyed" pin are gone, replaced by a pin that the mail icon opens Requests
- [x] Tapping the icon pushes Requests inside the trips route group; the tab bar is hidden there, by the existing rule, with no change to that rule or its test
- [x] Requests lists invitations received and the traveler's own join requests on the existing cards; accept, decline (with its confirm and its "the inviter will not be told" wording) and withdraw behave exactly as they did in the header — the invitation-inbox and pending-request-card walks pass re-routed through the icon with their assertions unchanged
- [x] Requests uses the shared pushed-screen header with back, the archived-trips list container, pull-to-refresh, and an empty state; back lands on Trips
- [x] The Trips root no longer renders the inbox as a list header on any lifecycle tab
- [x] The Trips title is 22px extra-bold, the same token Discover's title uses; the padding is untouched
- [x] `npx playwright test --list` still parses every spec (read the `Total:` line — a bad import collapses the suite to zero silently); the full `npx jest` runs once before the push because this ticket adds files under `src/`
- [x] CI green on push; the walk on the preview container is the proof, and any local run against the stack is asked for first — **green**: run `34856269840` is every job success — backend 499 unit + 1,342 ITs, Playwright 866/866, mobile typecheck + jest — after the object-store test image was repointed at quay.io (`7d5eba64`) and the founder walked the LAN rung on a real phone

## Comments

*None yet.*
