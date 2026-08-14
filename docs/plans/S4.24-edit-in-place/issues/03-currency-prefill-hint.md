# 03 — A price-less activity saves: the currency prefill becomes a hint

**What to build:** A traveler leaves the estimated price empty and the activity saves — the prefilled home currency is a hint that becomes data only once an amount is typed, so the request carries neither cost field when the amount is blank. The pairing rule's real job survives: a typed amount still demands a currency. Free stays an explicit 0, rendered "Free". Absent means "not stated" (the glossary's ruling); nothing on the wire or in the database changes, because price was always optional there.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] An activity with an empty amount and a prefilled currency validates and saves; the request carries neither `costAmount` nor `costCurrency`
- [ ] A typed amount without a currency still refuses with the existing message; amount + currency saves both fields
- [ ] An explicit 0 still saves and renders "Free" (pinned, since it now carries the free-vs-not-stated distinction)
- [ ] Editing an existing activity that has a price, and blanking the amount, clears both fields rather than orphaning the currency
- [ ] The form-validation and request-builder tests cover the hint semantics
