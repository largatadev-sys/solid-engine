# 02: Publication — publish mints the itinerary

**What to build:** publishing through the new grammar creates a real itinerary object from the frozen plan, with an identity that survives publish cycles: unpublish retires it, republish refreshes the same object, and every link ever shared points at the same id. The object also takes its own hard delete.

**Blocked by:** 01 (The trip's new face).

**Status:** done

- [x] The owner publishes via the new grammar: an itinerary object is minted from the frozen plan, carrying its creator-trip reference, addressed by its own id
- [x] Any signed-in traveler reads the minted object and sees the plan as of publish
- [x] Unpublish retires the object — reads mask — but keeps its id; republish refreshes the same object; the id never changes across cycles
- [x] A member who is not the owner gets the named forbidden on publish/unpublish; a non-member is masked
- [x] Hard delete by the recorded owner destroys the object permanently — including when its creator trip no longer resolves; a repeat delete answers not-found
- [x] The new table's migration is proven by a stepping IT; existing suites pass untouched

## Comments
