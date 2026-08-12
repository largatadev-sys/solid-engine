# 04 — The Diary tab

**What to build:** The Diary tab renders one collapsible section per diary trip from the existing my-diary-trips listing — trips **with entries only**, newest first (the endpoint's existing order), first section expanded and the rest collapsed. Expanding a section loads that trip's postcards via the existing per-trip entries listing and renders them with the **reused postcard component** — carousel (1–5 photos, counter pill + dots), snapshotted title, Day · time badge, caption — extended with an **optional likes row** fed by the stub-metrics module, rendered only on this surface. Tapping a postcard opens its existing entry screen. Empty tab state points the traveler at their trips. The mock's empty-trip section does not ship (founder ruling). No diary wire changes; author-only visibility untouched. See [spec](../spec.md) decisions 1, 7, 10.

**Blocked by:** 01 (the screen), 02 (the stub module).

**Status:** done

- [x] Sections list diary trips newest-first; first expanded, rest collapsed; tap toggles with the mock's chevron treatment
- [x] Expanding loads and renders that trip's postcards; carousel, title, badge, and caption match the mock's anatomy
- [x] The likes row renders stub integers 1–100 on this surface only; with the switch off, no likes row — and the diary surface's own rendering is unchanged (its existing tests still pass)
- [x] Postcard tap opens the entry screen; back returns to the profile with tab and expansion state intact
- [x] Empty state renders when the traveler has no diary trips
- [x] Screen tests cover ordering, expansion state, empty state; the optional likes-row prop is pinned where the postcard component's tests live

## Comments
