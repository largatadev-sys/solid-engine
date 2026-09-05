# Handoff: Private Profiles (S4.40)

## Overview
Adds private profiles to Largata. Successor of S4.36 (Public Profiles) and S4.37 (Follow); anatomy reused exactly, only what is new is drawn. Subject: Maya Ocampo, @mayaocampo, meta line "@mayaocampo · #0042".

Frames: 1a private profile (stranger), 1b Requested state, 1c same with nothing published, 1d approved follower, 2 own Profile header, 3a Account (private, live switch + confirm), 3b Account (public), 3c going-public confirm, 4a Follow requests (live Approve/Decline), 4b its empty state, 5a own Followers list (live kebab → sheet → confirm → row exit), 5b row sheet, 5c remove confirm, 6 creator row compact pill (live), 7 gated per-trip diary read, 8 itinerary preview footer.

## About the Design Files
`Private Profiles S4.40 Spec.dc.html` is a **design reference**: a live interactive prototype, not production code. Open in a browser (keep `support.js` beside it). Implement in the Expo/React Native codebase (`mobile/`), extending the S4.36/S4.37 profile, follow-list, and account components.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and motion timings are final. All shipping copy is plain ASCII.

## Decision log (changes from the brief)
1. **No Private chip** on any header (1a–1d, 2). The notice already says the profile is private.
2. **No Follows-you chip** on 1d, same reason. The chip anatomy is unused in this story.
3. **Published itineraries are hidden** from a private profile viewed by a stranger or requester (1a–1c). The notice is the last element on all three. Itineraries stay reachable by address and search.
4. **Open question:** the Account helper text still reads "Your published itineraries stay public." Kept verbatim; revisit if item 3 makes it misleading.
5. Motion extended with M3–M6 (row exit, sheet, confirm dialog, switch + press) so every new control has a response.

## Tokens
- Font: Inter (400/500/600/700/800)
- accent #EA580C · accent pressed #C2410C · ink #1C1917 · bio #44403C · muted #78716C · group label #A8A29E · hairline #E7E5E4 · divider #F5F5F4 · row press #FAFAF9 · chevron #D6D3D1 · cream #FFF7ED · avatar fallback #FDE4CF with initials #C2410C · destructive #B91C1C (pressed #991B1B) · switch off #D6D3D1 / on #EA580C · scrim rgba(28,25,23,.45) · toast #1C1917 with #FFFFFF text · profile link #C2410C
- Frame 393. Avatar 72 r36; list avatar 44 r22; creator avatar 36 r18. Name 22/800, meta 13, bio 13.5. Stats: value 16/700, label 11, border 1px #E7E5E4 r14.

## Frames

### 1a–1c — Private profile, not approved
- Pushed screen: back (36px) + "Profile" 15/700. Identity block unchanged. Four stat cells **inert** (no press state).
- Pill h40 r999 13.5/700, spans the content column, no width change between states. **Follow** filled #EA580C white. **Requested** white fill, 1px #E7E5E4, muted #78716C label, no glyph. **Following** white, 1px #E7E5E4, ink label, leading 14px check.
- Notice where the tabs used to be: 48px #FFF7ED circle with the sealed-postcard glyph (SVG in markup), title "Maya's postcards are for approved followers." 15/700, support "Follow to ask. Maya decides who's in." 13 muted max-width 240. Nothing in the notice is tappable. The notice is the **last element** — no tabs, no published itineraries section.
- Failure toasts (dark pill, 11/600, bottom, 2.5s): "Couldn't send a request to @handle" / "Couldn't cancel the request".

### 1d — Approved follower
The full S4.37 profile (tabs, Following pill, pressable Followers/Following cells). No chips.

### 2 — Own Profile header
Unchanged from S4.37 (cog, stats, Edit Profile pill). No private mark.

### 3a–3c — Account
- Pushed screen "Account". Rows, min-height 52, label 15/600, hairline #E7E5E4: **Edit profile** (chevron) · **Private profile** (switch 44x26, knob 20) with helper 12.5 muted "Only followers you approve can see your postcards and who you follow. Your published itineraries stay public." · **Follow requests** (chevron, only while private) · **Sign out** (#B91C1C).
- No count, no badge on any row.
- Off → on saves at once. On → off opens the confirm: "Make your profile public?" / "Going public lets everyone see your postcards, and approves anyone who has asked to follow you." Buttons Cancel / Go public (h40). Go public drops the Follow requests row (M3).
- Failure toast: "Couldn't change your profile visibility".

### 4a/4b — Follow requests
- Pushed screen "Follow requests". No count line.
- Row = list row anatomy + second line "Asked 2d ago" 12 muted + trailing **Approve** (36px filled pill, white 13/700, padding 0 16) and **Decline** (text button, muted 13/700). Row tap opens the profile.
- Empty: person-plus glyph, "No requests right now", "When someone asks to follow you, they'll show up here."
- Failure toasts: "Couldn't approve @handle" / "Couldn't decline".

### 5a–5c — Own Followers
- S4.37 list with a trailing **kebab** (36px target) replacing the chevron. Count line "{n} followers" 13/600 muted updates live.
- Sheet (r24 top, 52px rows): identity header, **Remove follower** (#B91C1C), **Dismiss**.
- Confirm: "Remove @handle?" / "They won't be told, and they'll have to follow you again." Buttons Cancel / Remove (#B91C1C). Row leaves with M3. **No undo toast.**

### 6 — Creator row on a published itinerary
Avatar 36, name 14/700, handle 12 muted, compact pill h32 13/700 padding 0 14 in the same three treatments (check 12px). Same state machine as C1. **Hidden when the creator is the viewer.**

### 7 — Gated read by address
Per-trip diary opened from a stale feed card, shared link, or back-navigation after Maya went private. Body replaced by the notice; only **"Maya"** in the title is tappable (#C2410C, light underline) and opens her profile. No retry link.

### 8 — Itinerary preview footer
Public/Private audience chips removed. One static line "Everyone on Largata can find and read this itinerary." 13 muted centered, above **Publish Itinerary** (h44 filled) and **Continue Editing** (h44 outlined). Itinerary visibility is no longer a per-itinerary choice.

## Contracts
- **C1 Pill state machine:** none / requested / following. Tap on a private profile → Requested optimistically; on a public one → Following. Second tap cancels or unfollows, confirm-free. Failure reverts + toast. Taps during an in-flight request are ignored.
- **C2 Approve / Decline:** remove the row optimistically; failure restores it + toast. Decline has no confirm and is silent to the requester.
- **C3 Visibility switch:** saves on flip, optimistic, reverts with toast on failure. Private → public passes through the 3c confirm; public → private has none.
- **C4 Live surfaces:** requests list, own followers list, own stats update without refresh. The pill on other travelers' screens refreshes on focus.

## Motion
- **M1 Pill crossfade:** fill/border/label 160ms ease across all three states; press scale 0.96 at 120ms; reverts reuse it.
- **M2 List cascade:** fade + 6px rise, 200ms ease, 40ms stagger, first 8 rows.
- **M3 Row exit:** fade + 6px drop 200ms ease, no stagger; list closes the gap. Failed request plays M2 on the restored row. Zero rows → empty state enters with M2.
- **M4 Sheet:** scrim 160ms ease; sheet slides up 260ms cubic-bezier(.2,0,0,1); dismiss reverses at 200ms; sheet rows press 0.98.
- **M5 Confirm dialog:** scrim 160ms; card fade + scale 0.96→1 over 200ms cubic-bezier(.2,0,0,1); cancel reverses at 160ms; confirming dismisses first, then M3.
- **M6 Switch + press:** track color 160ms ease, knob 160ms cubic-bezier(.2,0,0,1); all new controls press 0.96 over 120ms, hover/press fills 160ms.
- **Reduce Motion (normative):** every change is a 120ms opacity swap. No translates, slides, scale, staggers, or press scale.

## Not drawn, by decision
No Private or Follows-you chip on any header. No published itineraries on a private profile a stranger or requester views. No counts or badges for requests. No private marks on search results, list rows, feed bylines, or discovery cards. No privacy note in the postcard composer. No consent line on the Photo Dump. No Diary/Itineraries tabs on 1a–1c. No lock icon. The notice never says "This account is private".

## Copy strings (byte-for-byte)
Profile · Follow · Requested · Following · Maya's postcards are for approved followers. · Follow to ask. Maya decides who's in. · Edit Profile · Account · Edit profile · Private profile · Only followers you approve can see your postcards and who you follow. Your published itineraries stay public. · Follow requests · Sign out · Make your profile public? · Going public lets everyone see your postcards, and approves anyone who has asked to follow you. · Cancel · Go public · Asked 2d ago · Approve · Decline · No requests right now · When someone asks to follow you, they'll show up here. · Followers · {n} followers · Remove follower · Dismiss · Remove @handle? · They won't be told, and they'll have to follow you again. · Remove · Everyone on Largata can find and read this itinerary. · Publish Itinerary · Continue Editing · Couldn't send a request to @handle · Couldn't cancel the request · Couldn't approve @handle · Couldn't decline · Couldn't change your profile visibility

## Files
- `Private Profiles S4.40 Spec.dc.html` — live spec (frames, contracts, motion, handoff card); archived in this directory as `mock-render.dc.html`
- `support.js` — runtime the spec needs to open in a browser (not committed; the markup is the normative artifact)
- Codebase touchpoints (`mobile/src/`): profile/PublicProfileScreen, PublicProfileHeader, followState, FollowListScreen, PersonRow, ProfileStatsRow; itineraries/publishControls (audience chips removed). Tests worth extending: followState, publicProfile, publicProfileCopy, profileStatsRow, publishControls, audienceLadderCopy.
