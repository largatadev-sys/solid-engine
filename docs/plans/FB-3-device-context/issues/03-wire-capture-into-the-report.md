# 03 — Reports carry device context: warm at sheet-open, send at submit

**What to build:** the capture module's answer rides every report. Opening the feedback
sheet kicks off capture once per session (beside the existing screen capture at flow-open),
cached module-scoped; submit reads the cache — awaiting it only if still unresolved — and
the report part carries `os`, `browser` and `deviceModel` exactly when capture supplied
them. A capture failure costs the metadata and nothing else: the report still submits.
Verifiable end to end on the web preview: file a report, read the three values off the
outbox row / backend log — and on the emulator's existing dev build via Metro for the
native fork.

**Blocked by:** 01 (the backend must store the fields, or the walk proves nothing),
02 (the capture module).

**Status:** ready-for-agent

- [ ] Sheet-open triggers capture once per session; a second open reuses the cache
- [ ] The report part includes the three fields when present and omits them when capture
      yielded nothing — pinned at the existing report-submission Jest seam
- [ ] A throwing/never-resolving capture still submits the report, fields omitted
- [ ] A retry replays the same payload (same reportId, same device fields)
- [ ] Web-preview walk: a filed report's outbox row carries browser + OS (and model when
      walked from Android Chrome); emulator walk via Metro: OS + model, no browser
- [ ] Full Jest run and `tsc` clean before the push
