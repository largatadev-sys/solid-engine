# 05 — Remove-follower

**What to build:** on their own Followers list, and nowhere else, a traveler finds a kebab on every row that opens a sheet with **Remove follower**; a confirm says the person will not be told and will have to follow again; Remove drops the edge, the row leaves, the count moves, and there is no undo — on a public or a private profile alike (spec decision 10; canvas frames 5a–5c, motion M3, M4 and M5).

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] **The affordance rule:** the kebab (three dots, 36px target) replaces the chevron on a row **only when the list is the viewer's own Followers list**; the own Following list and every other traveler's lists keep S4.37's plain rows and chevrons. Row tap still opens the profile; the kebab tap does not.
- [ ] **The sheet** (frame 5b, **M4**: scrim 160ms, slide up 260ms cubic-bezier(.2,0,0,1), dismiss reverses at 200ms, rows press at 0.98): grab handle, an identity header (36px avatar, name 14/700, handle 12 muted) over a hairline, then two 52px rows — **Remove follower** in the destructive ink and **Dismiss**. A scrim tap dismisses. Built on the existing bottom-sheet pattern.
- [ ] **The confirm** (frame 5c, **M5**): **"Remove @handle?"** / **"They won't be told, and they'll have to follow you again."**, buttons **Cancel** and **Remove** (filled destructive). Through the platform-forked confirm helper with the wording in the copy module.
- [ ] **Remove** calls the removal endpoint by the follower's traveler id; the row leaves with **M3**, the count line "{n} followers" and the own stats update, and **no undo toast** follows. On failure the row stays and the removal module's existing failure toast is shown — the canvas draws no wording for this case, so the module's own is adopted rather than a new string minted. Under Reduce Motion, opacity swaps throughout.
- [ ] **Works on a public owner too** (S4.39 decision 7).
- [ ] **Jest:** the affordance rule as a pure module (own followers → kebab; own following, someone else's lists → chevron); the sheet's items; a structural guard that the kebab is never rendered on the following side or on another traveler's list, sabotage-checked.
- [ ] **Playwright, web:** **t1 = owner, t2 = follower**. Public t1: own Followers → the kebab on t2's row → the sheet's wording → Remove follower → the confirm's wording captured → Remove → the row leaves, the count line decrements, the server reads t2's relation as `none`, t2's view of t1 reads Follow. Cancel keeps the row. Then t1 flipped private through the API with t2 re-approved: the same walk. Another traveler's followers list shows chevrons and no kebab; t1's own Following list shows no kebab.
- [ ] Process gates: full Jest before any push that adds a file under `src`; the Playwright list check.
