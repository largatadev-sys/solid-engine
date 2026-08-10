# 02 — The shared profile card, email gone

**What to build:** The own-profile card becomes a shared read-only component — avatar (authenticated media path, never a bare image URL) · display name · @handle · bio · vanity number, each hidden when null — and **email renders nowhere the card renders**: the dedicated email line is deleted from the card itself, so the own-profile page loses it in the same stroke (spec decision 2). The profile tab consumes the component; Edit profile and everything else on that screen is untouched. The display-name fallback stays exactly as ruled — pool accounts stay self-identifying.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The own-profile page renders the shared card with no email line; avatar, name, handle, bio, vanity number render as today, null fields hidden (spec AC 3).
- [x] A pure props-mapping/visibility module pins the rule, ban-list style: no email string can reach the card (spec testing decisions).
- [x] Edit profile still works and still edits handle, display name, bio.
- [x] The card renders on emulator and web preview; the avatar arrives as a bearer-authenticated request on both (the S3.3 tell watched in the driver).
