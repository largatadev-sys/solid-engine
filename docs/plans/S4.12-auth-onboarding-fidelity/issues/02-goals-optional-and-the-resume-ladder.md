# 02 — Goals become optional, and the resume ladder stops keying on emptiness

**Status:** ready-for-agent

**What to build:** the goals step stops requiring a selection, so that "Select all that apply" becomes literally true (spec decision 4) — **and the resume ladder is corrected for the trap that creates** (spec decision 5).

**The trap, stated plainly, because a straight-through walk cannot see it.** The gate answers "where does this traveller resume?" by asking each step whether its data is absent. Goals answer that question by being an empty list. The moment an empty list becomes a *legal answer*, the predicate stops distinguishing **not asked** from **asked, chose none** — and a traveller who picks nothing, then force-quits, is dropped back on the goals step at every cold start. They can still finish in one sitting, which is exactly why every straight-through test stays green.

**Blocked by:** nothing.

- [ ] Continue on the goals step is **live with zero selections**; the subtitle still reads "Select all that apply" (spec decision 4, AC 4)
- [ ] A zero-goal traveller **saves and advances** to interests (spec decision 4, AC 4)
- [ ] The goals step **leaves the resume ladder**: a traveller with a handle, zero goals and zero interests resolves to **interests** (spec decision 5, AC 6)
- [ ] The forward walk is **unchanged** — profile still routes to goals, goals still routes to interests; only *resumption* skips it (spec decision 5)
- [ ] **Sabotage-verified:** the ladder test fails against the current ladder before the change lands. A test that passes either way proves nothing — this repo's standing rule, and the reason this criterion is written separately (spec AC 6)
- [ ] **On a device:** pick no goals → force-quit mid-flow → relaunch → **not** returned to goals (spec AC 7)
- [ ] Interests are **untouched** — "Pick at least 3" and its minimum both still hold (spec decision 4, AC 5)
- [ ] The step model is unchanged and stays pinned: profile 1 · goals 2 · interests 3 · travel-setup 4, completion uncounted (spec AC 9)
- [ ] `drive-preview.js`'s goals-step assertion flips from "blocked until a goal is picked" to "live with none picked", and the full preview walk still completes (spec AC 12)

**Rejected upstream, do not re-derive:** making the stored goal list nullable so `null` means *not asked* and `[]` means *asked, chose none*. It is the truthful shape and the right answer the day something reads goals — but it is a column-semantics change plus an API change for a step with no reader, against an MVP-grade dial. Recorded in spec decision 5.

**Cost accepted on the record:** the "Earn from my itineraries" signal thins, since the step can now be passed without answering. It was never a sample of everyone — it is a count of people who chose it — so the denominator shrinks and the measurement stays legible.

## Comments
