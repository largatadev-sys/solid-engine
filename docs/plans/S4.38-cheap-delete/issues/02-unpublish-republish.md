# 02 — Unpublish / Republish on the Itineraries tab

**What to build:** a traveler on their Profile's Itineraries tab taps the kebab on a published itinerary and gets Edit details · View published page · **Unpublish** (cautionary tone). Unpublish collapses the card out of the list and the toast offers **Republish** for 5 seconds — the server-undo variant of the kit: unpublish is called immediately, undo republishes with the trip's current visibility. The non-destructive entries do what they say: Edit details opens the details editor, View published page opens the published route, and any entry whose destination does not exist yet takes the house measured coming-soon prompt — each such stub named in the PR, never a dead click.

**Blocked by:** 01 — the sheet/toast kit.

**Status:** ready-for-agent

- [ ] Unpublish → card collapses → Republish toast; undo round-trips the PUBLISHED pill and the public page (Playwright walks it both ways).
- [ ] Unpublish is called immediately (server-truthful across devices); undo calls publish with the audience the trip already had.
- [ ] Diary-card kebab ships its menu (Edit diary details · Copy public link) with existing destinations routed and stubs on the coming-soon prompt, named.
- [ ] Every label and toast message from the shared copy module.
- [ ] Toast messages per the handoff's table ("Itinerary unpublished" / "Itinerary republished").
