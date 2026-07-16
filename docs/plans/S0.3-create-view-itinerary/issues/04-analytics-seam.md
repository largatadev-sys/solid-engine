# 04 — Backend: analytics seam + register #2 default events

**What to build:** `analytics.emit(name, attributes)` in `common` — the seam is the asset (call sites accrete per story; the sink is swappable plumbing). v1 sink: one structured JSON log line per event on a dedicated `analytics` logger, mechanically distinguishable from app logs. Emission is post-commit and fire-and-forget — an analytics failure can never fail the user action. Events: **`itinerary_created`** (`travelerId`, `itineraryId`, `hasDates`, `destinationCount`) from the itinerary logic layer, and **`traveler_signed_up`** as one line in S0.2's existing provisioning path. Durable sink is deliberately deferred — epic-map trigger: before alpha, with registers #1/#2.

**Blocked by:** 03 — the create path is the first call site.

**Status:** done

- [x] `itinerary_created` line appears on the `analytics` logger with exactly the four attributes; emitted after commit
- [x] **No user text ever**: asserted that title/destination content does not appear in the event line (P3 extended to analytics)
- [x] A throwing sink does not fail or delay the create (fault-injection test) — *reframed, see below*
- [x] `traveler_signed_up` emitted on first provisioning only — not on subsequent sign-ins
- [x] Rolled-back create emits nothing

## Comments

**2026-07-16 — implemented.**

**MDC, not logstash's `StructuredArguments`.** The instinct was the richer structured-arguments API; the classpath said otherwise (`net.logstash.logback` is not a dependency, and S0.1 chose Boot's built-in ECS format precisely to avoid one). Boot's ECS formatter renders MDC entries as real JSON fields, which is the same mechanism `LogContextFilter` already uses for traceId/userId — so attributes ride the MDC, scoped to the one call. Keys are namespaced `event.*` so an attribute can never clobber a context key the request filter owns.

**The fault-injection AC was tested wrong twice before it was tested right.** First attempt stubbed `emit()` to swallow its own exception — proving only that a test double does what the test told it to. Second attempt injected an appender that throws, and *passed with the catch deleted*: `AppenderBase.doAppend()` swallows append failures and reports them to Logback's status manager. A logging framework's standing promise not to break its host means **that AC was already satisfied by Logback, not by our code**. Both tests are kept — one pins Logback's promise, one (`attributeConversionFailuresNeverReachTheCaller`, a hostile `toString()`) exercises our catch, which the delete-and-rerun check now proves load-bearing.

**And that third test found a real leak.** The MDC-put loop sat *outside* the `try`, so an attribute that threw mid-loop left earlier keys set on a pooled thread — reappearing on unrelated requests' log lines. `try` now opens before the first put. Invisible to inspection; needed a hostile attribute *and* a surviving one to show up.

**`traveler_signed_up` is emitted in `insertOrReadWinner`'s success path, not in the resolver** — the only line that runs when a Traveler is genuinely new. The race-loser re-reads an existing row and emits nothing: two signups for one traveler would misreport the single number this event exists to give.

**`Map.copyOf` was silently discarding attribute order** — caught by the very test the review asked for, on its first real run. The builder uses a `LinkedHashMap` precisely so a log line's fields read in a stable order; `Map.copyOf` returns an immutable map whose iteration order is *unspecified*, so the intent was thrown away one line later and fields scattered differently per run. Harmless to a machine query, but the ordering was a lie and inconsistent output is miserable to read. Now `Collections.unmodifiableMap(new LinkedHashMap<>(attributes))` — copy for immutability, wrap to say so, order preserved.

**Two things code review corrected.** (1) `AnalyticsEvent`'s javadoc cited an `AnalyticsEventTest` that did not exist, claiming the no-PII rule was held "by construction" — it is not, and no unit test on a `Map<String, Object>` could hold it: a bag of Object cannot tell an id from a confession. The rule is a call-site discipline, held by a test *per call site* (`ItineraryAnalyticsIT#theEventNamesTheTripByIdAndLeaksNothingTheTravelerWrote`), and the javadoc now says so. `AnalyticsEventTest` was written anyway, for what the type *can* guarantee — immutability, and that a builder cannot reach back into an event it already built. (2) `ItineraryService` had **no operational log line at all**, violating 06b §4 ("services log one info line on success — entity id + operation"): the analytics event is not a substitute, since it rides a deliberately separate logger for a different reader. Added, ids only, with its own P3 assertion.
