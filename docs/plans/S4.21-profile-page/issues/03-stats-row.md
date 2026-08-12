# 03 — The stats row: real counts end to end

**What to build:** The four-cell stats row live on the profile header, mock order and treatment: **Published** and **Trips** as true counts served by a new additive traveler-scoped stats endpoint (published count = published itineraries the caller owns; trips count = trips the caller belongs to), flowing through the repository layer's typed apiClient; **Followers** and **Following** from the stub-metrics module. Cells are not tappable. Whether the counts ride their own endpoint or fields on ticket 05's listing is this ticket's call — additive either way, and if the listing route is chosen, coordinate the wire shape with ticket 05 rather than duplicating. See [spec](../spec.md) decisions 4, 6 and the wire-changes section.

**Blocked by:** 01 (the screen), 02 (the stub module).

**Status:** done

- [x] Integration test at the controller seam: a fixture traveler owning published trips, owning drafts, and holding plain membership in someone else's published trip gets exactly the right two counts
- [x] The row renders true Published and Trips values against the live backend
- [x] Followers and Following render stub integers in 1–100; with the switch off they render 0
- [x] Screen test covers the row's loading and error presentation

## Comments
