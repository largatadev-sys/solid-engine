# 03 — History by diff

**What to build:** The bulk save keeps S4.9's promise that every plan write is captured. The server diffs the committed plan against the submitted plan at save time and emits the same typed activity-history entries per-action capture writes today — day appended/renamed/deleted, activity created/edited/deleted, reorder — every one attributed to the saver (the exclusive session means one holder per save, so attribution loses nothing). The client narrates nothing: history derives from state the server can verify (spec decision 7). Staged-then-undone churn never appears — what was never saved never happened, ruled a feature. Capture cannot be backfilled, so this granularity is permanent for entries written from here on; it is what S4.10's surface inherits.

**Blocked by:** 02 — the bulk save endpoint (the diff runs inside its transaction).

**Status:** done

- [x] After a mixed-op save, history holds exactly the diff's typed entries, attributed to the saver, and nothing else (spec AC 6).
- [x] An activity created and deleted within one staged buffer leaves no entry; a day renamed twice before saving leaves one rename entry (the diff sees only endpoints, not the path).
- [x] A reorder-only save emits the reorder entry; a no-op save (submitted plan identical to committed) emits nothing.
- [x] A same-id day change lands as the capture's move entry — the wire permits it even though no S4.18 UI stages one.
- [x] The entry types match per-action capture's exactly — S4.10 inherits no format fork; an IT asserts a per-action write and a diff-derived write of the same op produce the same entry shape.
- [x] The diff and entry emission happen inside the save's transaction: a failed save captures nothing.
