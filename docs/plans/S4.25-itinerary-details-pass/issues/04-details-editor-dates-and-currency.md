# 04 — The details editor grows dates and currency

Status: ready-for-agent

**What to build:** The owner opens Edit details and can finally set, change, and *clear* the trip's dates, and pick the trip's currency — with the consequence of a currency change stated before it happens. Design baseline: artboards 2, 3 and 4 of the archived Claude Design file (mock fidelity applies — copy the frames).

**Blocked by:** 01 — One destination and a Trip Currency in the model · 02 — The update contract.

- [ ] Edit mode gains start and end date fields, each with a visible clear affordance on **both** platforms (the web date input has none of its own — it is drawn); chronological validation unchanged ("A trip cannot end before it starts."), either date may be absent.
- [ ] The two tests that pinned the DatePicker's absence from the trip form flip to pin its presence — the ruling they enforced was reversed by its own author, on the record in the spec.
- [ ] The currency picker is a plain option list (sign + code + name) over one canonical currency module; the two legacy client maps collapse into it; a legacy off-list currency still displays via the uppercased-code fallback.
- [ ] The currency-change confirm appears only when saving would change the currency while priced activities exist, with the baseline's exact copy ("Prices keep their numbers: ₱1,500 becomes $1,500. Review your amounts after saving."); cancel returns to the form with the draft intact; an unpriced trip saves silently.
- [ ] The standouts hint "Shown on your published page." renders under the label in both create and edit modes.
- [ ] Create mode changes by the hint alone — no dates, no currency drawn.
- [ ] Playwright: the owner sets dates → saves → facts line updates → clears both → saves → "Dates to be decided" survives a reload; changes currency through the confirm and sees relabeled prices on Day-by-Day.

## Comments
