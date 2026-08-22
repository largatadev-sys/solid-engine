# Design baseline — Travelers Spec s2 (archived handoff)

> **Archive note (2026-08-22).** This README is the handoff document that accompanied the founder's Claude Design canvas *Travelers Spec s2*. The canvas itself (`Travelers Spec.dc.html` + `support.js`) is the pixel-exact baseline — **the founder drops the original two files into this directory**; the copies attached in conversation arrived with mangled text encoding and were not archived to avoid corrupting the baseline. Until the files land here, the Claude Design canvas is authoritative. The handoff text below was transcribed with glyphs restored.

## Overview

Design revision s2 of the Travelers tab in Largata's trip workspace, plus the two invite surfaces outside it: the handle-invitation card on the Trips tab and the `/join/<token>` invite-link landing (the app's only pre-auth screen). Covers roster, invites (@handle + email-legacy), join requests via invite link, owner-only removal, leave, and offer-based ownership transfer.

The canvas renders standalone in a browser (with `support.js` alongside). Frame 0 is a working demo that runs the full motion contract; frames 1–8 are static states; the annotated **Component contract (C1–C7)** and **Motion contract (M1–M7)** printed on the page are normative — implement from those. A dashed-border **v2 annex** at the bottom is explicitly NOT to be built.

**High-fidelity:** colors, typography, spacing, radii, and copy are final. Recreate pixel-perfectly using the codebase's existing components and tokens.

## Frames

1. **Travelers list, owner view** — sections Travelers · Invited (non-empty only) · Requests (owner only, non-empty only, always last); headers 11/700 uppercase #78716C with live counts. Member row: 40px photo avatar (tinted-initials fallback), handle 14/600 #1C1917, sub 12 #78716C ("Trip owner" / "Joined Feb 12"); viewer's row appends " · You". Special subs: **"Ownership offered · waiting on them"** in accent #EA580C; invited rows at 0.55 opacity with "Invited by @handle — waiting on them" + quiet Revoke; **email-legacy invite** row uses a neutral envelope avatar (#FAFAF9 on #E7E5E4), title "Email invitation" — **the address never renders anywhere**. Request row: "Via invite link · 2h ago" + Approve (13/600 accent) · Decline (13/600 muted). Pinned bottom bar with one full-width accent CTA **"Add traveler"** (#EA580C, radius 12, 15/700 white, plus icon) — never a list row. **The avatar is the row's only tap target** (≥44px): opens the existing read-only profile dialog; the rest of the row is inert. ⋯ (#A59E99, 44px hit) on every non-owner row in the owner's view.
2. **Add traveler sheet, v1** — bottom sheet (radius 20 top, 36×4 grabber, shadow) over 40% scrim. Title "Add traveler" 17/700. Search field (#FAFAF9 well, #E7E5E4 border, radius 12) placeholder **"Search by @handle"** — exact-handle lookup only. Found card: hairline border, radius 12 — photo avatar + handle 14/600 + display name 12 muted + **Invite** accent pill (radius 100, 13/700 white). Already invited → dead "Invited" ghost pill (#A59E99 on #E7E5E4, not tappable); already a member → card with no action ("On this trip"). Footer: divider, then "Share invite link" row (40px #FFF7ED/#FED7AA icon disc, label 14/600 #EA580C, sub "Anyone with the link can request to join") → platform share sheet.
   - **2b, no results:** "No one matches "@x"" 14/600 + "They might not be on Largata yet." 12.5 muted, then the link promoted into the accent well (#FFF7ED on #FED7AA): "Send them the invite link". The plain link row hides in this state.
3. **Member view** — no ⋯ on other members' rows (only your own row's ⋯ → Leave), no Requests section (never rendered). Invited visible to everyone; **any member can Revoke**. Add bar present for everyone.
   - **3b, ⋯ menus** — app-drawn compact bottom sheets (Android has no action sheet), same present/dismiss as the add sheet: grabber, title = the member's @handle 17/700, entries as full-width rows 15/600 with leading icons and #F5F5F4 dividers, 44px hits. Variants: owner-on-member [Transfer ownership · **Remove from trip** #B91C1C] · owner-on-offered-member [Revoke ownership offer · Remove from trip] · own row [**Leave trip** #B91C1C].
4. **Remove confirm** (platform alert): "Remove @handle?" / "They'll lose access to this trip. Their messages, votes, and photos stay." / Cancel · **Remove** (#B91C1C). No undo, no toast; re-inviting is the recovery path; no in-app group notification.
5. **Leave confirm** (platform alert): "Leave this trip?" / "You'll lose access to the plan, chat, and photos. Everything you added stays with the group." / **Not yet** · **Leave** (#B91C1C). On confirm → the Trips list.
   - **Transfer confirms** (platform alerts): Offer — "Offer ownership to @handle?" / "They'll be asked to accept. Until then, you stay the owner." / Cancel · **Offer** (#EA580C). Revoke — "Revoke the ownership offer?" / "@handle won't be able to accept it. You stay the owner." / Cancel · **Revoke** (#B91C1C).
   - **1b, published trip** — membership frozen: no inviting, removing, requesting, approving, or ownership transfer; **leave stays**. Invited/Requests hidden, add bar gone, no ⋯ except the viewer's own row (Leave). Archived: fully read-only *(see the spec's flagged S1.9 tension on Leave)*.
6. **Handle-invitation card, top of Trips** — handle invites never touch /join. Card: cover 120px, title 16/700, "Destination · Dates" 12.5 muted, going-facepile (26px avatars, 2px white ring, −8px overlap), "Invited by @handle · Nd ago", expiry from `expiresAt` (11.5 muted; #B91C1C under 48h; expired never render). **Accept**: accent pill, in-pill spinner, navigate into the workspace, card exits via M2; unverified email reroutes to verify-code. **Decline**: quiet text behind a platform alert — "@handle won't be notified. They can invite you again." Border #FED7AA, radius 16. API additions: destination, dates, cover, inviter handle, going preview.
7. **Invite-link landing, /join/<token> (7a–7e)** — the app's only pre-auth screen. **A postcard, not a full screen**: one elevated card centered on a warm #FFF7ED well — cover 136px (dims to 45% on dead link), "You're invited" kicker 11/700 uppercase #C2410C, title 18/700, "El Nido · Mar 12–18 · 4 travelers" 13 muted, the state's CTA inside the card (white card, #FED7AA border, radius 18, warm shadow; small Outfit "Largata" wordmark above). Never shows an inviter line, roster names, or plan content. No subtitles under the CTAs.
   - 7a signed out: accent CTA "Sign in or create account" → standard full signup + onboarding, the app returns here after.
   - 7b signed in: accent CTA "Request to join". Tap swaps to 7c **in place** — 150ms crossfade (M7), no navigation.
   - 7c pending: quiet state (#FAFAF9/#E7E5E4, 13.5/600 muted) "Request sent". Re-opening the link while pending lands here.
   - 7d already a member (or approved, link re-opened): accent CTA "Open trip workspace" — no auto-redirect.
   - 7e dead link (archived/published trip, invalid token): quiet "This trip isn't taking new travelers.", cover dimmed.
   - **Navigation:** reachable only by the link — in no tab or nav graph. One-way door: 7d opens the workspace; everything else exits to Trips (signed-in) or closes (web). *(Canvas caption "approval → they get a notification" corrected by the spec: no notification system exists; the trip appears in Trips.)*
8. **Ownership-offer card, top of the Travelers tab** — no trip-level banner; the members screen is deleted. Compact accent-well card (#FFF7ED/#FED7AA, radius 12) pinned above the list, scrolls with it: transfer icon, single title "@handle offered you ownership" 13/700, **Accept** small accent pill + **Decline** quiet text, both behind platform-alert confirms. On accept the card exits via M2 and the owner rows swap subs in the same layout pass.

## Component contract (C1–C7, normative)

- **C1 · Permissions**: any member invites by handle, revokes pending invites, shares the invite link; only the owner removes members and sees/answers Requests; only you can leave; the owner can do neither (transfer first). Owner-only: offer/revoke ownership transfer. ⋯ rendering: owner view = every non-owner row; member view = own row only.
- **C2 · Two consent directions**: @handle invitation = the trip asks the traveler (accept/decline, no owner action). Join request = the traveler asks the trip (owner approves → membership immediate — the request was their consent; declines silently — they may request again). One live link per trip, no expiry, no regeneration.
- **C3 · Member row**: photo avatar; tinted initials (the stable per-member tints, shared with Chat) are fallback only — same rule in facepiles and the add sheet. Avatar = only tap target → the existing read-only profile dialog.
- **C4 · Semantics**: removed/departed members' content stays (messages, votes, photos, itinerary edits — attributed as before); access lost immediately. Transfer is offer-based; one standing offer per trip; owner revokes from the ⋯ menu.
- **C5 · Sections + counts**: fixed order; Add traveler is the pinned bar's single CTA. Owner sorts first, then join date. Trip-card meta elsewhere counts accepted members only.
- **C6 · Invitee inbox**: frame 6, as drawn.
- **C7 · /join lifecycle**: frame 7, as drawn; membership freezes at publish, leave stays; archived read-only.
- **Ruled out — must not render anywhere**: roles beyond owner, member caps, mute/block, per-member permissions, "added you" system messages in Chat, notification badges on the tab, profile stats on rows, guest accounts, link expiry/regeneration, suggestions, trimmed onboarding for link joiners.

## Motion contract (M1–M7, normative, native-first)

All motion transform/opacity, native driver. **Reduce Motion:** M1/M6/M7 entrances jump-cut, M2's layout close snaps; the 150ms opacity fades stay. **Nothing else animates.**

- **M1 · Row entrance**: fade in + rise 8px, 150ms ease-out (invite sent, request approved). Initial load plays M6, never per-row M1. (The 40ms batch stagger lives in the v2 annex.)
- **M2 · Row exit + list close**: fade 150ms, then the list closes the gap 200ms ease-in-ease-out; counts update in the same pass; an emptied header exits with its last row. The frame-6 and frame-8 cards exit the same way.
- **M3 · Approve**: M2 out of Requests, then M1 into Travelers — no bespoke move animation, no accent flash.
- **M4 · Menus/sheets**: app-drawn bottom sheets — scrim fade 150ms, sheet rises 200ms ease-out, dismiss reverses at 150ms; identical for the add sheet and every ⋯ menu. Alerts and the share sheet stay platform. Invite pill → "Invited" ghost: 150ms crossfade; the found card appears/disappears with the 200ms layout value.
- **M5 · Press feedback**: opacity 1→0.85, 100ms in / 150ms release, on every tappable.
- **M6 · Tab entrance cascade**: headers + rows fade/rise in a 30ms top-to-bottom stagger, capped at ten rows; the add bar rises last (200ms ease-out, ~240ms in). Once per tab visit — never on re-render, scroll, or sheet return. Frame-6 facepile avatars pop 200ms spring (cubic-bezier(0.34,1.56,0.64,1)), 40ms stagger. The frame-8 card enters first in the cascade.
- **M7 · /join postcard**: enters once as one unit — fade + rise 8px, 200ms ease-out (never element-by-element). "Request to join" → pending is a 150ms in-place crossfade. Roster sub-line swaps after transfer ride the 200ms layout pass.

## Tokens

Accent #EA580C · accent-dark #C2410C · ink #1C1917 · muted #78716C · icon-muted #A59E99 · hairline #E7E5E4 · divider #F5F5F4 · wells #FAFAF9 / #FFF7ED · accent border #FED7AA · destructive #B91C1C. Avatar tints (well/ink): #DBEAFE/#1D4ED8 · #FDE4CF/#C2410C · #DCFCE7/#15803D · #FEF9C3/#A16207 · #EDE9FE/#6D28D9 · #FCE7F3/#BE185D · #CFFAFE/#0E7490 · #FEE2E2/#B91C1C — stable per member. Type: Inter (UI), Outfit 700 (wordmark only); rows 14/600 + 12 sub; headers 11/700 caps; sheet titles 17/700; alerts 17/700 + 13.5 body. Radii: rows none · cards 12 · invite cards 16 · sheets 20 (top) · postcard 18 · pills 100. Motion values: state 150ms ease-out · layout 200ms ease-in-ease-out · pop 200ms spring · press 100/150.

## Assets

Avatar photos in the canvas are placeholder images; production uses real traveler photos with the tinted-initials fallback. Trip covers are placeholders; production uses the trip's cover. Icons are simple strokes (search, link, share, transfer arrows, remove-user, plus, ⋯, envelope) — map to the app's existing icon set.
