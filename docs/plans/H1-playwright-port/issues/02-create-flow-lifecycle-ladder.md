# 02 — Trips landing, create flow and the lifecycle ladder

**What to build:** The retired create-flow walk's coverage rebuilt from the flow inventory (§1), dark acts first: a traveler plans a trip through the real form, finishes the itinerary, starts the trip, and steps back — all proven on the web rung for the first time since the walk rotted. The surviving green renders (lifecycle sections, tab bar, preview absences) rebuild after the acts.

**Blocked by:** 01 — Foundation + the discovery pilot.

**Status:** ready-for-agent

- [ ] **Plan a Trip** opens the create form; the form says **Standouts** (never "Highlights") with **Add Standout** as the row control; the terminal CTA continues to the day schedules
- [ ] A draft card opens the **day editor**, not the preview; a trip card links to its **preview**, not the old workspace
- [ ] **Finish Itinerary** on a draft's preview moves the trip to `upcoming` **on the server** and lands back on Trips with no celebration screen
- [ ] **Start Trip** is offered on an upcoming trip, with a **one-step undo** back down the ladder (upcoming → draft reopens planning)
- [ ] Trips landing renders lifecycle grouping as **sections, not chips**; the tab bar has four tabs including Discover and **no centre +**
- [ ] The terminal lifecycle rung is never labelled "Complete" (one word must not name two facts)
- [ ] The draft preview offers **no publish controls**; the upcoming preview speaks the honest tense and offers no publish button the gate would refuse
- [ ] No console or page errors across the spec
