# 07 — Retire the audience control and the composer note

**What to build:** the itinerary preview no longer asks Public or Private — one line says everyone on Largata can find and read it — publishing sends no audience, the trip card keeps its Published badge and loses its Private one, and the postcard composer stops telling the traveler who can see a postcard. Every piece of client code that carried an audience goes with the control, and every test that pinned it is rewritten (spec decisions 13 and 14; canvas frame 8).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] **The preview footer** (frame 8): the Public/Private chips and their blurb are gone; one static line, **"Everyone on Largata can find and read this itinerary."** at 13 muted, centered, sits above **Publish Itinerary** (filled, h44) and **Continue Editing** (outlined, h44).
- [ ] **Publishing sends no audience.** The publish mutation and repository call take none; the contract publishes as today when the field is absent, and the constant `visibility` on the response is not read.
- [ ] **The audience plumbing goes:** the audience helpers, the caller-less show-trip-to mutation and its repository call, the audience the removal undo queue carries through republish, and the client's `PublishAudience` and `Visibility` types. The itinerary response type stops declaring `visibility`, since nothing reads it.
- [ ] **The trip card badge** reads "Published" when published and nothing otherwise; the Private branch and its type dependency are deleted.
- [ ] **The composer's privacy note goes entirely** — the component, its copy constant, and both of its mounts (the composer and the diary entry screen). The globe glyph stays in the icon set if anything else uses it.
- [ ] **Tests rewritten, not deleted silently:** the publish spec's two audience-chip cases become one "no audience control, the static line" case, and its "Publish lands" case keeps asserting the server's constant; the trip-card-anatomy suite's private case becomes "a published trip reads Published, whatever the wire says"; the publish-controls suite's audience describe goes; the diary-is-public suite's note assertions become "the composer carries no audience statement at all" and the diary-capture suite's literal pin goes; the diary web spec asserts the note's absence; the test fixtures that set `visibility` drop it; the tab-routing structural guard against branching on `data.visibility` stays, since it is still true. Each rewritten case named for what it now asserts.
- [ ] **Structural guards (Jest):** no audience-chip label on the preview; the note component mounted nowhere; sabotage-checked once each.
- [ ] **Playwright, web:** the preview of a completed, unpublished trip shows the line and no "Publish public" or "Publish private" control → Publish → the success screen, the server published; the composer route shows no audience text.
- [ ] Process gates: the full Jest run before the push (the guards are the point); the Playwright list check after the spec edits.
