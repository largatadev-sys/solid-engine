# 06 — The activity form stages

**What to build:** The activity form — a separate screen, reached by navigation from the editor — stops mutating the server and stages into the editor's draft instead: Save Activity validates as today, then writes the create or edit into the staged plan and returns; the staged activity renders in the editor immediately and reaches the server only at Save Changes. The staged state must survive the navigation in both directions — this is the bulk of the client work and the reason S4.18 is a story, not a tweak (spec mechanics). Editing a staged (temp-id) activity edits the buffer entry; deleting one removes it without trace. The form's own Cancel/Discard Changes remains a local abandonment of the form — it never touches the editor's buffer. Validation, field set and chrome are untouched (S4.13/S4.17's form; only the persistence moment moves).

**Blocked by:** 05 — the editor stages (the draft state the form stages into, and the save/discard flow that commits it).

**Status:** ready-for-agent

- [ ] An activity created through the form appears in the editor's staged plan immediately and on the server only after Save Changes (spec AC 4).
- [ ] Create-then-edit: a staged activity re-opened in the form shows its staged values and edits in place; create-then-delete leaves no trace in the save request (spec AC 4).
- [ ] Editing an existing (server-id) activity stages the change; the server shows the old values until Save Changes.
- [ ] The form's Cancel (create) / Discard Changes (edit) abandons only the form; the editor's buffer is exactly as it was.
- [ ] Back-exit from the editor after form-staged work discards it with everything else — one buffer, one confirm.
- [ ] Client-side validation behaves exactly as today; no server error path is reachable from the form anymore (the save's errors surface at Save Changes).
