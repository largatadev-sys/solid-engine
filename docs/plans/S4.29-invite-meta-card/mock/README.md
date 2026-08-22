# Design baseline — Invite Meta Card (archived handoff)

> **Archive note (2026-08-23).** This README is the handoff document that accompanied the founder's design bundle *Invite Meta Card*. The canvas itself (`Invite Meta Card.dc.html` + `support.js`) is the pixel-exact baseline; the copies attached in conversation arrived with mangled text encoding and were not archived, to avoid a corrupted "baseline" that would be worse than none (same situation as S4.28's mock). The handoff text below was transcribed with glyphs restored.
>
> **Founder ruling, 2026-08-23 — the canvas files are NOT being archived, and this README is the baseline of record:** *"leave it. we already had one earlier, and so far the results for the card is okay."* The card was signed off on the rendered evidence in `../verification/` rather than against the canvas. **The cost is recorded rather than hidden, because it already cost once:** an exact-value question is now answered from prose, and prose is exactly what let `right: -60px` be read as an *inset* instead of a *bleed* — a 120px error that shipped through a full review and was caught only by a second one. Two mitigations stand in its place: `CardArtTest` pins every number this README's token list gives, so the values cannot drift silently; and any *new* fidelity question on this card is a **founder question**, not a repo lookup — do not infer a missing value from this prose and call it the baseline.
>
> **Two deviations from this bundle are normative, ruled on the record in the spec:** the **"Invited by @{handle}" line is dropped everywhere** (card, og:description) — ADR-032's one-eternal-token-per-trip cannot say who shared; and the bundle's "system sans" body roles render in **bundled Noto Sans 400/700** server-side. Where this README mentions the inviter handle or system fonts, the spec's decisions 9–11 override.

## Overview

Server-rendered Open Graph preview image for Largata shared invite links (`largata.app/join/<token>`). When a trip invite link is pasted into a chat or social app, the platform unfurls this 1200×630 card. Companion to the Travelers s2 spec (`/join` postcard landing).

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look, not production code. The task is to implement a server-side image renderer that produces this card as a PNG, plus the meta tags on the /join route. Frames 2–4 in the HTML show fallback, clamping, and how platforms crop the result.

## Fidelity

**High-fidelity.** Colors, type, spacing, and copy are final. Recreate pixel-perfectly at 1200×630.

## The Card — 1200×630

Split layout: left cover panel, right text panel. All meaning lives in the right panel so left/center crops stay readable.

### Left panel — cover

- Size: 552×630, flex none, background #FFEDD5
- Trip cover photo, object-fit cover, full bleed
- Seam gradient overlaying the photo: linear-gradient(90deg, rgba(255,247,237,0) 82%, #FFF7ED 100%) — blends cover into the well so the seam never shows

### Right panel — text

- Fills remaining 648px; background #FFF7ED (warm well)
- Flex column, vertically centered, gap 18px, padding 0 84px 0 64px
- Wordmark: "Largata" — Outfit 800, 34px, #EA580C
- Text block (column, gap 10px):
  - Kicker: "YOU'RE INVITED" — 700, 22px, letter-spacing 4px, #C2410C, uppercase
  - Title: trip title — Outfit 700, 58px, line-height 1.12, #1C1917
  - Meta: "{destination} · {date range}" — 400, 28px, line-height 1.3, #78716C
- Divider: 64×2px, #FED7AA
- ~~Inviter: "Invited by @{handle}" — 24px #44403C; handle bold #1C1917~~ *(dropped — see archive note)*

### Brand bar

- Absolute bottom, full width, 10px tall, #EA580C — reads at thumbnail size

## Variants & Rules

### No cover photo (frame 2)

- Left panel: #FFEDD5 with two decorative circles — 420px circle #FED7AA at top -120px / left -110px; 300px circle #FDBA74 at 50% opacity, bottom -90px / right -60px
- Destination initials centered: Outfit 800, 170px, #C2410C at 35% opacity (e.g. "EN" for El Nido)
- Same fallback rule family as avatar initials (Travelers spec C1). Never a stock photo.

### Long title (frame 3)

- Titles over ~30 chars: step title 58px → 46px, line-height 1.15
- Clamp at 3 lines with ellipsis
- Dates always render — they're the strongest join signal *(spec amendment: dates are nullable in this codebase; the line degrades to destination-only — spec decision 9)*

## Meta Tags (on /join/<token> HTML response)

- og:title = "You're invited: {trip title}"
- og:description = "{destination} · {dates}" *(inviter segment dropped — see archive note)*
- og:image = this card, 1200×630 PNG
- twitter:card = summary_large_image

## Privacy & Lifecycle

- Medium privacy tier only: cover, title, dates. **Never** traveler avatars, names, or member count (those stay behind the /join postcard, post-tap).
- Revoked/expired links serve a generic branded card ("This invite link is no longer active") so stale previews in old threads don't leak the trip. *(In this codebase: DEAD = trip published or archived; there is no revocation — ADR-032.)*
- ~~Regenerate on title / dates / cover change; cache with the invite token as key.~~ *(Superseded: the server renders live on every request and never caches — freshness for new shares comes from the `?v=` URL versioning; spec decisions 6 and 12–14.)*
- Bake fonts into the render (Outfit 700/800) — no client font loading.
- Keep ≥64px right margin on text so platform rounding masks never clip it.

## Platform behavior (frame 4, informational)

- Facebook feed: 1.91:1 exact fit, uncropped; og:title/description repeat in the gray strip.
- Messenger / WhatsApp: full-width image in the preview bubble + title/domain footer.
- Instagram DM: small square **center** crop (the cover/text seam) — og:title carries the invite there, hence the "You're invited:" prefix. IG feed/stories don't unfurl external links.

## Design Tokens

Colors: #FFF7ED well · #FFEDD5 cover bg · #FED7AA divider/decor · #FDBA74 decor 2 · #EA580C brand/bar · #C2410C kicker/initials · #1C1917 ink · #44403C body · #78716C muted
Type: Outfit (700, 800) for wordmark/title/initials; Noto Sans for kicker/meta *(bundle said system sans — see archive note)*
Card: 1200×630, no border radius (platforms apply their own masks)

## Assets

- Trip cover photos: user-uploaded, from trip record (mocks use picsum.photos placeholders)
- Outfit font: Google Fonts, weights 700/800, embed in renderer

## Files

- `Invite Meta Card.dc.html` — frames: 1 card spec, 2 no-cover fallback, 3 long-title clamp, 4 platform mocks (FB, Messenger, IG DM, WhatsApp), contract block *(to be dropped in by the founder)*
- `support.js` — the canvas runtime the .dc.html renders with *(to be dropped in by the founder)*
- Related: S4.28's `mock/` (Travelers Spec s2, frames 7a–e — the /join postcard landing this card leads into)
