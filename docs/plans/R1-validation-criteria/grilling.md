# R1 — Register #1, the validation criteria — grilling record

**Status:** record, 2026-09-23 — `grilling` skill, one round answered, one round withdrawn, one proposal signed. The founder's answers are quoted verbatim; the agent's reading sits under each; corrections are made in place. **Not a story**: no code, no spec, no tickets. The canon it amends rides the same docs branch, and the closing section names every line written from it.

## How it started

After TW-2 landed the founder asked for an admin dashboard: total unique users, average screen time per day, users joined, trips created, itineraries published, diaries and postcards posted. The agent's read of the tree before answering: five of the six already emit server-side analytics events (`traveler_signed_up`, `onboarding_completed`, `itinerary_created`, publication's own event, `diary_created`, `postcard_created`); the sink is a log line (`LoggingAnalytics`); the mobile `track()` is `console.log`; the security chain has no admin actor and every authenticated route is traveler-scoped; there is no APM and no metrics.

The founder ruled the shape before the session opened: **the dashboard is not in the app** — it goes to worklog, on the FB-1 relay pattern, through a **new intake endpoint** separate from Reports. The agent's proposed sequence was (1) this session, so worklog builds its page against a signed list, (2) worklog's story — intake contract, store, dashboard, (3) our story — the outbox behind the existing seam, the batching relay, `POST /v1/events`, and an "events this story must emit" line in every later spec. The founder chose to start with (1).

**The goal, as stated before Round 1:** settle the list of numbers the alpha dashboard shows, and who counts as a user, so worklog's dashboard and our relay are built against a fixed list.

## The premise, checked against the docs before Round 1

The founder, on pulling this: *"i'm pretty sure I already deferred the MVP build and we are already on product mode for this app."*

Checked. `01-intent-and-constraints.md` §Build mode records **Product** as the build rule — one-way doors at production depth, no throwaway MVP — and, in the same sentence, that *the alpha is judged against pre-committed validation criteria*. `00-requirements-brief.md` §Success records the three tiers and the strawman; epic-map line 20 records *the validation gate sits after E6 ships to alpha*. Nothing anywhere records the gate deferred. So "product mode" was already canon and the gate's retirement was not — a load-bearing decision that lived only in a conversation. Q1 put it to the founder.

## Round 1

**Q1 — Is there still a gate?** (a) keep the three tiers · (b) drop the gate; register #1 becomes the dashboard's number list · (c) keep "validated" and "change approach", drop the hard pause. Recommended (c).

> "we are already an alpha, and it is full speed since we already have a hefty features and screens to be implemented."

*Reading:* (b). The gate is retired — no read date, no floor, no thresholds, no tiers. The agent noted once, and records here, that "full speed because there is a lot to build" is a fact about the backlog and not about whether groups adopt the app; the share in Q2/Q8 is what carries that question onto the dashboard. Consequence: "post-validation" is a trigger phrase in 24 places across the brief, the intent doc, the ADR log and the epic map, including Epic 7's heading and the backlog-epics header. Decided by the agent, not asked (see *Round 2, withdrawn*): the phrase is **defined once** in `01` §Build mode rather than edited 24 times.

**Q2 — The one headline number.** Keep the July strawman's metric as the headline: of travelers who sign up, the share in a trip with two or more members within 14 days. Recommended keep.

> "what is this headline for?"

*Reading:* the purpose had not been stated plainly. Restated in the proposal: a count says how much the app is used; a share says how well it works. A thousand onboarded travelers and fifty group trips is a different product from a hundred onboarded and fifty group trips, and both dashboards show "50 group trips". Settled by the proposal.

**Q3 — Who counts as a user?** Registered accounts, or travelers who finished onboarding. Recommended onboarded.

> "travelers, accounts onboarded. unique users may be on live basis"

*Reading:* the denominator is **onboarded travelers**. "Live basis" read as an online-now count; the socket registry already knows every connected traveler, so that number needs nothing new. The proposal shows both — online now, and unique per day and per week.

**Q4 — Screen time.** Keep, or replace with days-active and sessions-per-week from one `app_opened` event. Recommended replace.

> "defer this for now, we'll add it later once i get more information"

*Reading:* **deferred**, trigger a founder pull. Not replaced by a ruling — the days-active numbers are on the dashboard on their own merits (Q3's "unique users"), not as a stand-in.

**Q5 — Who signs?** The register says the COO drafts and all founders ratify. Recommended: the founder decides here, the record goes to the others for a yes.

> "i decide as said by the founders."

*Reading:* the founder signs alone, under a standing delegation from the other founders. "COO drafts" leaves the register.

**Q6 — The "EOI-as-gate" item.** Read as a minimum number of expressions of interest before launch; recommended drop.

> "this is a feature"

*Reading:* expression of interest is a **product feature**, not a criterion. It leaves register #1 and becomes an epic-map backlog line, raised and undefined — one sentence from the founder (who does it, on what, what they get) is owed before it can be grilled.

## Round 2 — asked and withdrawn

Six questions were asked: what "post-validation" means now (three options), whether one share sits above the counts, unique users exactly (online now vs per period vs both), how test accounts are excluded (marker at the source vs a worklog list vs count them), the EOI feature's one sentence, and the group-trips count.

> "i dont understand these questions. what are we getting at."

*Reading:* the round asked the founder to decide housekeeping the agent could decide alone (which doc lines a retired phrase touches, the exclusion mechanism) and framed a product question — a share versus a count — as a design choice. Withdrawn. The session's purpose was restated in one line and replaced by a single proposal to correct. The lesson is recorded in the agent's memory: never ask the founder about doc consequences; when a round loses them, collapse to one concrete proposal and ask only what is wrong with it.

## The proposal, signed

> **The dashboard, v1**
>
> | Number | Shown as |
> |---|---|
> | Travelers onboarded | per day, per week, total |
> | Unique travelers active | per day, per week |
> | Travelers online now | live |
> | Trips created | per day, per week, total |
> | Trips with two or more members | per week, total |
> | Itineraries published | per week, total |
> | Diaries created | per week, total |
> | Postcards posted | per day, per week, total |
> | Group-trip share | of travelers onboarded each week, the share who are in a trip with two or more members within 14 days |
>
> Screen time: deferred, the founder's call later.
>
> **Who counts.** Onboarded travelers only. The five pool accounts and the seeded demo travelers are excluded, so a test walk never shows up as usage.
>
> **Why the last row is there.** Every other row goes up whenever more people sign up. That one only goes up when the app is doing its job — getting groups into a shared trip. It costs nothing extra; it comes from data that already exists.
>
> **Written without asking further:** the alpha is no longer judged against thresholds; "post-validation" in the docs now means "whenever the founder calls it from the dashboard"; expression of interest is a feature for the backlog, not a criterion.

> "all good."

## Decisions

1. **The validation gate is retired.** No tiers, no read date, no floor, no threshold. The app is in alpha at full speed. `01` §Build mode's build rule (*Product*) is unchanged; its tiers are amended out. *(Q1)*
2. **Register #1 resolves as the alpha dashboard's number list** — the nine rows above. Built in worklog, never in the app. *(the proposal)*
3. **The denominator is onboarded travelers.** "Users joined" means onboarding completed. *(Q3)*
4. **Unique users are both live and per period**: online now from the socket registry, unique per day and per week from one client event, `app_opened`. *(Q3 + the proposal)*
5. **Test accounts are excluded at the source**: a marker the seeders set on the pool and demo travelers, and the relay never sends their events. A dashboard that mixes walk traffic with real traffic cannot tell "used" from "tested" — the check-with-no-failure-mode trap in a new place. Agent's recommendation, accepted in the proposal. *(the proposal)*
6. **One share sits above the counts**: of travelers onboarded each week, those in a trip with two or more members within 14 days. The July strawman's metric survives as that share; its thresholds do not. *(Q2, the proposal)*
7. **Screen time is deferred**, trigger a founder pull. *(Q4)*
8. **Costs are unmeasurable until E5 exists**; the list measures plan and record. Stated, not asked. *(agent)*
9. **The founder signs alone**, under the other founders' standing delegation. *(Q5)*
10. **Expression of interest is a feature**, moved to the backlog undefined. *(Q6)*
11. **"Post-validation" is defined once**, in `01` §Build mode: *after the founder reads the dashboard and calls it — no fixed date, no threshold.* The 24 lines that use the phrase stay as written; Epic 7's trigger becomes a founder pull. Decided by the agent after Round 2 was withdrawn; the founder approved the proposal that stated it. *(Round 2 Q7, withdrawn; the proposal)*
12. **The pipeline that feeds the dashboard is an epic-map line**, the second cross-repo pipeline with worklog: worklog's intake, store and dashboard first, then our outbox, batching relay, test-account marker and `POST /v1/events`; every spec after it carries an "events this story must emit" line. Each half is grilled when pulled. *(the opening exchange)*

## What was written from this record

- `docs/design/00-requirements-brief.md` — §Success: a dated amendment carrying decisions 1–10; register row #1 marked resolved; register row #2 annotated with the sink decision; the closing signature line annotated.
- `docs/design/01-intent-and-constraints.md` — §Build mode: a dated amendment retiring the tiers and defining "post-validation" (decision 11).
- `docs/design/07-epic-map.md` — line 20 (the gate) retired in place; Epic 7's heading re-anchored to a founder pull; the backlog-epics header annotated; the *register #1 pulls forward* line marked resolved; the *mobile analytics events never leave the device* line and the EDA line annotated with the sink decision; the standing-work paragraph annotated; three new backlog lines — **AN-1, the analytics pipeline to worklog**; **expression of interest, a feature**; **screen time, deferred**.
- `BUILD_STATUS.md` — an off-epic ledger entry dated 2026-09-23; the standing off-epic work rows for registers #1 and #2.

## Open

- The expression-of-interest feature's one sentence, from the founder.
- Worklog's story and AN-1 — each grilled when the founder pulls it. Worklog's half lands first, as FB-1 did.
