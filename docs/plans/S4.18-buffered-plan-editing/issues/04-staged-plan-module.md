# 04 — The staged-plan module

**What to build:** The pure seam the whole client side stands on — the staged plan as a value, not an op log (spec mechanics). One module owns: initializing the draft from an itinerary read (carrying its base `planVersion`); the seven ops as pure functions (append/rename/delete day, create/edit/delete activity, reorder) mutating the draft, minting client temp ids for staged creations; the dirty derivation (draft differs from base); and the save-request derivation (the draft becomes the bulk PUT body — id-less entries for temp-id creations, so the server never sees a temp id). No component, no network, no React — table-driven Jest on the `landingSlot` precedent (S4.17: extract the pure logic; importing the component pulls native init and kills the suite). This can start immediately and run parallel with the backend tickets: the wire shape is pinned by the spec.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Draft initialization reproduces the server plan exactly; dirty is false; the derived request round-trips it unchanged.
- [x] Each of the seven ops is covered table-driven, including: rename to empty (clears the optional name), delete a day carrying activities, reorder within a day, create-then-edit and create-then-delete cycles entirely inside the buffer (the latter leaves no trace in the derived request — spec AC 4's pure half).
- [x] Temp ids never appear in the derived request: staged creations serialize id-less; existing entries keep their ids; array order is the order.
- [x] Dirty flips true on any effective change and back to false when ops restore the base shape.
- [x] The module is import-safe in Jest with no native or component dependency.
