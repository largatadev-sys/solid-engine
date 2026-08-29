# 04 — Close-out: docs, the sanctioned prod live check, and the bookkeeping

**What to build:** the story's paperwork and its end-to-end proof. Docs: the glossary gains
**Device context** (mirroring worklog's term, sibling of Screen context); the epic map's
FB-1 line and FB-1's spec header get dated amendments re-pointing the frozen contract from
v1.1 to v1.2; the epic map gains the FB-3 line; the BUILD_STATUS row lands in the last
commit on the feature branch. Then the one sanctioned live check, **against worklog prod at
the founder's explicit call** (grilling R1-Q8 — FB-1's precedent, cost accepted again):
**two reports**, one from desktop Chrome (the full trio via Client Hints) and one from the
emulator's native app (OS + model, no browser), both triaged to `done` in worklog after.
The real relay is wired to prod only for the minutes those take, then unwired and the
logging sink verified active again. Both stack executions wait on the founder's explicit
yes at run time.

**Blocked by:** 03 (and through it 01, 02).

**Status:** ready-for-agent

- [ ] Glossary entry added; both v1.1 pointers amended with dated notes; epic-map FB-3 line;
      BUILD_STATUS row (status + spec link, nothing else) in the last commit on the branch
- [ ] Live check: the desktop-Chrome report renders a Device row in worklog prod reading
      browser · OS (· model where present); the native report renders OS · model with the
      browser part omitted — the row is **seen**, not inferred from the 201
- [ ] Both live-check reports triaged to `done`; intake config removed afterwards and the
      logging sink verified active again
- [ ] Closing suites: report ITs by their `Tests run:` counts, full mobile Jest + `tsc`,
      re-proven by CI on the PR
