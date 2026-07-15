# 07 — Mobile: My Trips list + create + view screens

**What to build:** The three screens, tokens-only styling, reads through the query layer. **My Trips (the list) becomes the signed-in home screen**; the S0.2 me-screen stays reachable, demoted (nav affordance, not home). List: newest-first, infinite scroll on `nextCursor`, empty state ("plan your first trip" → create), pull-to-refresh. Create: title field, one destination text field (submits `destinations: [value]`), optional start/end date pickers (each clearable, independent), inline validation mirroring the server rules, submit → back to list with the new trip visible. View: title, destinations, dates, and the `draft`/`private` badges — read from cache, refreshed in background.

**Blocked by:** 05, 06.

**Status:** ready-for-agent

- [ ] Signed-in launch lands on My Trips; sign-in flow unchanged; me-screen reachable
- [ ] Create round-trip works end-to-end: submit → 201 → list shows the trip without manual refresh → tap → view renders all fields
- [ ] Dateless create succeeds; date-only-start create succeeds; `start > end` blocked inline before the request
- [ ] Empty list renders the empty state, not a spinner-forever or a crash
- [ ] Server 400 surfaces as a field-level message (envelope `message`), not a toast of JSON
- [ ] Zero hardcoded style literals; zero raw API calls (both grep-clean)
- [ ] Jest: screens tested against mocked repositories (S0.1/S0.2 convention — mock at the module boundary)

## Comments
