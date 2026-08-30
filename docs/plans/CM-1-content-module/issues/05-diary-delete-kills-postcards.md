# 05: Deleting a diary deletes its postcards

**What to build:** the founder-ruled containment semantics: an author deletes a diary and everything inside it goes with it, in one act — while loose postcards and other diaries stand untouched.

**Blocked by:** 04 (Standalone postcard).

**Status:** done

- [x] The author deletes a diary: the diary and every postcard inside it are destroyed in one transaction — photo rows and stored objects included
- [x] Loose postcards and postcards in the author's other diaries are untouched, proven after the delete
- [x] A non-author's diary delete answers the masked not-found; a repeat delete answers not-found
- [x] Existing suites pass untouched

## Comments
