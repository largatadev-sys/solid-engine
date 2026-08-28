# 03 — Sheet states: screenshots, honest failure, and the discard guard

**What to build:** everything the sheet does when the path is not happy. The screenshot
strip — up to three gallery picks, removable, the add tile always last and gone at three —
riding the shipped multipart path. The full failure matrix with the shipped copy rendered
verbatim: retryable failures (offline, 429, 5xx) relabel the button "Try again" with the
form intact; non-retryable ones (413, 400) hold "Send" inert and mark the field at fault —
screenshots on 413, description on 400 — until anything actually changes (field values at
failure recorded). The dirty-dismiss rule through ticket 01's seam: scrim tap, swipe-down,
and hardware back all flash the description border for 300ms instead of discarding; clean or
sent closes; only the explicit close X discards, and outright. Every async completion scoped
to a session token (the delete-undo guard) so a stale response cannot strand the sheet.

**Blocked by:** 02.

**Status:** done

- [ ] A report submitted with two screenshots shows both in its outbox row on the local stack; removal before send collapses the row and the add tile returns
- [ ] The failure banner's five messages are the shipped strings verbatim — asserted against the shared copy module, never retyped
- [ ] Offline (induced for real): "Try again" replays the same reportId and succeeds when the network returns
- [ ] Six rapid sends against the local stack: the sixth renders the 429 copy and retries clean later
- [ ] Oversized images (induced for real): 413 marks the screenshots label and tile borders; removing one re-enables Send
- [ ] A 400 marks the description and counter; editing the text re-enables Send; nothing is ever cleared
- [ ] Scrim tap and hardware back with text in the field flash and hold; with an empty field or after the thank-you they close; close X discards a dirty form
- [ ] The live description is read from state inside the dismiss handler, not a render-closure (the stale-string trap the handoff names)
- [ ] Focusing the description on native raises the sheet with the keyboard; the field is never covered
- [ ] Closing mid-flight and reopening cannot strand the new session in a sending state (token guard proven by test or walk)
