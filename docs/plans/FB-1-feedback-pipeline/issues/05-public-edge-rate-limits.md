# 05 — The public edge defends itself

**What to build:** the abuse layers on the accept route (spec decision 8): a per-IP token
bucket (5 reports/hour; the IP read from the proxy-appended `X-Forwarded-For` value, falling
back to the remote address — no global forwarded-header config change) and a global daily cap
(100 accepts/day), both answering `429` and persisting nothing. In-memory state is accepted
at this volume — a restart resets the buckets, and the global cap is the layer that actually
protects worklog's permanent inbox from rotating IPs.

**Blocked by:** 02 (the accept endpoint).

**Status:** done

- [x] The sixth report from one IP within the hour → `429` in the standard envelope, no outbox row
- [x] Past the global daily cap, every caller answers `429` regardless of IP
- [x] A signed-in request obeys the same limits as an anonymous one
- [x] The limits scope to the reports route only — no other route's behavior moves
- [x] A `429`'d `reportId` retried after the window is accepted normally (the client's replay remains safe)
