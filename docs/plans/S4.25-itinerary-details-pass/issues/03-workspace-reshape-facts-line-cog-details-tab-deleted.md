# 03 — The workspace reshape: facts line, cog, Details tab deleted

Status: ready-for-agent

**What to build:** The Trip Workspace answers "where and when is this trip" from every tab, and its settings live behind one quiet cog. The Details tab — the sixth tab that duplicated the editor and buried the facts — is deleted. Design baseline: artboards 1 and 1b of the archived Claude Design file (see the spec's Design baseline section).

**Blocked by:** 01 — One destination and a Trip Currency in the model.

- [ ] The facts line renders under the workspace title through the header's existing provenance slot, visible to every member on every tab. Exact strings: `Boracay · 12–19 Mar 2027` with dates, `Boracay · Dates to be decided` without. Exactly two facts.
- [ ] The cog renders beside the Edit Itinerary pencil with a role- and state-filtered menu: **Edit details** (owner ∧ trip editable) · **View published** (any member ∧ published) · **Unpublish** (owner ∧ published, keeping its existing confirm wording). The cog is absent when the menu would be empty — a collaborator on an unpublished trip sees no cog.
- [ ] Edit details opens the trip form in edit mode; View published and Unpublish behave exactly as they did on the Details tab.
- [ ] The Details tab, its component, and its tab-row key are deleted; a stale `?tab=details` deep link lands on Day-by-Day via the existing fallback; no test or walk references the tab.
- [ ] The menu-visibility rule is a pure module with a unit-tested matrix (role × editable × published).
- [ ] Playwright: the owner walk sees the facts line, opens the cog, reaches the editor; the collaborator walk sees the facts line and no cog on an unpublished trip; the published-trip walk sees View published + Unpublish (owner) and View published only (member); no walk finds a Details tab.

## Comments
