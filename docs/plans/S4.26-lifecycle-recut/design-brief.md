# S4.26 design brief — the Trips tabs and the transition drawers

Three sections: **§1** what is ruled (normative — the canvas must not contradict it), **§2** what the wire can render (the data contract — the canvas must not invent fields), **§3** the paste-ready Claude Design seed prompt. The canvas this seeds becomes the **design baseline** under the mock-fidelity rule; its digest is archived beside the spec before the UI tickets build.

## §1 — Behavior spec (normative, founder-ruled 2026-08-20)

**The Trips surface** (`/trips`):

- Three **fixed tabs**, ladder order: **Upcoming | Ongoing | Completed**. All three always render — no hiding when empty (sections hid; tabs cannot).
- **Landing is adaptive**: Ongoing iff it holds at least one trip, else Upcoming.
- **In-page tab row** (the profile-tabs idiom, not the bottom tab bar), `role=tab`.
- **Rows carry no lifecycle badge** — the tab is the lifecycle fact. Rows keep: cover thumb, title, destination, the **publication badges** (S4.15) and the amber **"Currently being edited"** lease advisory. The Draft subtitle is dead with its state.
- **Per-tab empty states**, one line each. The **create CTA lives only on Upcoming's empty state** ("Plan a Trip" — creation births `upcoming`). Active/Completed empties get copy only.
- **Archived is not a tab** (different axis). Fact for the canvas: the archived list route currently has **no door anywhere**; the canvas may give it a quiet link (e.g. a footer line) or leave it — founder's call, drawn or not drawn.
- Tab **counts are not ruled** — recommend none (quiet chrome); founder's call on the canvas.

**The lifecycle chrome** (workspace viewer):

- The state badge reads the state's own name: **Upcoming / Ongoing / Completed**. "Ready" and "Active" are dead labels — nowhere in the app.
- **No Step back** — the link is gone in every state. Only the forward CTA renders: Upcoming → **Start Trip**, Ongoing → **Complete Trip**, Completed → **Publish Itinerary** (publish keeps its existing preview flow).
- **Start Trip and Complete Trip each confirm in a bottom drawer** before acting (the FinalizeSheet visual pattern; FinalizeSheet itself dies with Finalize). Drawer anatomy: title, one-line body, primary confirm, quiet cancel. Suggested wording (founder edits on the canvas):
  - Start: **"Start this trip?"** / "Postcards open for every member once the trip starts." / confirm **Start Trip**
  - Complete: **"Complete this trip?"** / "Marks the trip as travelled — a completed trip can be published." / confirm **Complete Trip**
- Mis-tap protection is the drawer; there is **no undo affordance** (ruled, on the record).

## §2 — Data contract (what exists to render — no wire change)

`GET /v1/itineraries?cursor&limit&archived&category` → cursor-paginated `ItineraryResponse` rows. `category ∈ upcoming | ongoing | complete` (server-filtered; `draft` stays accepted-and-empty after the re-cut). Per-tab query or one grouped listing is an implementation choice — both are served today.

Fields a Trips row can render (`ItineraryResponse`): `title` · `destination` · `coverImageUrl` · `startDate`/`endDate` · `state` (`upcoming | ongoing | completed` after the re-cut) · `published` + `visibility` (the publication badges) · `beingEdited` (+ `editingSession` holder for the advisory) · `archived` (always false on this surface). **Nothing else exists** — no counts-of-days, no member avatars on this listing; the canvas must not draw data the row cannot have.

## §3 — Claude Design seed prompt (paste-ready)

> Redesign the **Trips landing** of Largata (traveler trip-planning app, phone viewport, existing house style — same project as the polls canvas) and add two confirmation drawers. Six frames:
>
> 1. **Trips — Ongoing tab active**: in-page tab row **Upcoming | Ongoing | Completed** (ladder order, fixed, all three always visible), Ongoing selected, holding one trip card. Trip cards: cover thumbnail, title, destination line, optional amber "Currently being edited" advisory, optional publication badge — **no lifecycle badge on any card** (the tab already says it).
> 2. **Trips — Upcoming tab**: several trip cards, one being-edited advisory visible.
> 3. **Trips — Completed tab**: a few cards, at least one carrying its publication badge.
> 4. **Empty states**: each tab's empty, one line of copy each; only Upcoming's empty carries a create CTA ("Plan a Trip"). Annotate: landing is adaptive — Ongoing when it holds a trip, else Upcoming. Optionally a quiet "Archived trips" footer link (decide: drawn or not).
> 5. **Start Trip drawer**: bottom confirmation drawer over the trip screen — title "Start this trip?", one-line body ("Postcards open for every member once the trip starts."), primary **Start Trip**, quiet cancel. The trip screen's state badge reads **Upcoming**.
> 6. **Complete Trip drawer**: same anatomy — "Complete this trip?", body "Marks the trip as travelled — a completed trip can be published.", primary **Complete Trip**. Badge reads **Ongoing**.
>
> Constraints that are ruled, not yours to move: the three tab labels and their order; no "Draft", "Ready" or "Active" anywhere (dead labels); no Step back / undo affordance; the create CTA only on Upcoming's empty state; cards show only title, destination, cover, publication badge, editing advisory. Wording inside the drawers and empty-state copy is yours to improve — annotate anything you change.

---

*Flow: founder seeds the canvas from §3 → canvas returns as the design baseline (mock-fidelity rule) → digest archived beside the spec → UI tickets build against it. The backend re-cut is not gated on this.*
