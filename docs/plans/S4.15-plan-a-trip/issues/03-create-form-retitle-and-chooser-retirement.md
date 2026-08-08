# 03 · Create form — retitle, simplified placeholders, mock styling; chooser retires

Status: needs-triage

Spec decisions 7, 8, 9. The field set, validation, day-minting, and cover-upload flow are untouched.

## Scope

- `itineraries/new.tsx`: screen title **"Plan a Trip"**; submit button **"Create Trip"**.
- Placeholders (decision 8's exact strings): Trip Title **"Name your trip"** · Destination **"Where to?"** · Duration **"Days"** · Best Time of Year **"Best months to go"** · Trip Description **"What's this trip about?"** · Standout **"Add a standout"**.
- Field styling per the mock: filled `#F4F4F5`-token inputs with the near-black 1px border (`#121212` → nearest token), radius 4, label style 600 · 12/15 capitalize muted; sticky footer dock per the mock's bottom bar (46px button, radius 4, top hairline).
- Cover zone per the mock's `CoverPhoto` block (150px dashed drop area, accent upload button) — behavior unchanged from S3.3.
- Retire the chooser: delete `itineraries/create.tsx` (Start from Scratch / Fork) and **repoint** the `(trips)/create.tsx` shim to `/itineraries/new`, so `/create` keeps resolving and lands on the form; no route in the tree renders the chooser.

## Acceptance

- AC 1 (chooser half), 2 of the spec.
- Unit: title/button/placeholder strings pinned; `validateItineraryForm` untouched and still green.
- `tsc` clean after the route deletions; emulator + web preview walk the form end to end.

## Comments
