# 03 — One form, create mode

**What to build:** The shared trip form is born and creation re-houses onto it with no visible change except one: **Destinations become multi-entry** ("+ Add destination" — the S4.15 mock-baseline amendment, spec decision 3). The form component consumes a **pure mode contract** — per-mode field set, headline, submit label, submit shape — and a mode-aware validator (required = title + at least one destination). Create mode's chrome and flow are otherwise untouched: "Plan a Trip", "Create Trip", the simplified placeholders, Duration minting days, `replace` to the Trip Created overview. **Cover behavior comes from the mode, not common code** (spec decision 5): create keeps the staged attach-after-POST sequence with its local preview — the server enforces the lease ordering, so wiring edit's live-upload path here would 409.

**Blocked by:** None — can start immediately. *(04 builds on this component; do this first.)*

**Status:** ready-for-agent

- [ ] The mode contract is a pure module with table-driven unit tests: create's field set (cover · title · destinations multi · description · standouts · best time · Duration), chrome strings, and submit shape.
- [ ] The create walk is behavior-identical to S4.15 apart from the destination rows: placeholders, validation, day-minting, Trip Created overview, back-to-Trips (spec AC 3).
- [ ] A trip created with three destinations carries all three on the wire (the list field already exists — no wire change).
- [ ] A trip created with a cover still attaches it through the staged post-create sequence, local preview intact (spec AC 5, create half).
- [ ] The converged validator's unit tests pin required fields for create mode; the S4.15 copy tests still pass or move onto the contract.
- [ ] The create walk runs on the emulator and the web preview container.
