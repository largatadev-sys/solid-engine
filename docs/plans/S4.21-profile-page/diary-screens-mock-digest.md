# Diary screens mock digest *(founder, 2026-08-12; archived 1:1 as `diary-screens-mock.html`)*

Two frames, delivered mid-S4.21 as a self-extracting bundle. The **design baseline** for the per-trip diary stream and for a surface that did not exist before: the **postcard preview**. Frame 2 draws frame 1 with the preview overlaid, so the preview is a **modal**, not a route.

The bundle's text arrived mojibaked (`â¢` for `•`, `GraÃ§a` for `Graça`); the archived copy is repaired. Mobile and web frames are identical content — the web column is the same 393px screen on a muted desk, so there is one design here, not two.

## What the founder said, verbatim

> "when a diary is tapped, it goes to the trip diary screen. and when a diary entry is tapped, it shows the postcard preview."

Ruled at the ask (2026-08-12): **the profile's Diary tab keeps mock 2a's inline expansion — the row navigates to Trip Diary, the chevron still toggles the section.** Both survive; the row and the chevron are separate tap targets. Share ships as drawn, wired to the coming-soon helper.

## Frame 1 — Trip Diary (the per-trip stream)

**This ratifies the anatomy S3.1 already shipped** — eyebrow above the title, a horizontal photo strip, divider-separated rows — rather than the profile's card-and-carousel postcard. The two anatomies are now both mocked and both correct; see the note at the end.

- **Header:** padding `24px 20px 0`, gap 8. Overline `MY DIARY` — 11/14, 700, `letter-spacing 1.5`, `#5C6470`. Title row gap 16: a **36px circled back chevron** (`border 1px #E2E4E8`, white fill, 20px glyph `#1B263B`) beside the trip title at 24/29, 700, `letter-spacing -0.2`, `#1B263B`.
- **Body:** `flex:1`, scrolls, gap **24**, padding `16px 20px 32px`.
- **Entry row:** gap 8, `padding-bottom 16`, `border-bottom 1px #E7E5E4`.
  - Eyebrow `Day 1 • 9:30 AM` — 11/14, 700, `letter-spacing 1.2`, uppercase, `#EA580C`. **Bullet separator**, not the profile's middle dot.
  - Title 18/22, 700.
  - **Photo strip:** the scroller is edge-to-edge (`margin: 0 -20px; padding: 0 20px`), inner row gap 8, photos **332×250**, radius 12.
  - Caption 16/22, `#1C1917`. **Absent entirely** on the third entry — a captionless entry renders no caption node, no empty space.

## Frame 2 — Postcard preview (new surface)

Scrim `rgba(27,38,59,0.55)` over the whole screen, contents centred, padding 24.

- **Card:** 345 wide, radius 20, white, shadow `0 24px 60px rgba(27,38,59,0.35)`, `overflow:hidden`.
- **Photo:** 345×**300**. **Close ✕** top-right at 12/12 — 32px circle, `rgba(28,25,23,0.55)`, 14px white glyph. **Dots** bottom-centre at 12, gap 6, 8×8 — active `#FFFFFF`, rest `rgba(255,255,255,0.45)`. No counter pill on the photo.
- **Body** padding 20, gap 8:
  - Row, `align-items:baseline`, `space-between`: eyebrow (same 11/14 700 uppercase `#EA580C`) and **`1 of 3`** at 11/14, 600, `#78716C` — the count is *text on the right*, not the profile's pill.
  - Title 22/27, **800**.
  - Caption 15/22, `#44403C`.
  - Trip name **uppercased**, 11/14, 700, `letter-spacing 1.5`, `#A8A29E`, `margin-top 4`.
- **Footer:** `border-top 1px #E7E5E4`, two halves split by a 1px full-height divider, each `padding 14px 0`, icon 15px + label 14/18 700.
  - **Edit entry** — pencil, `#1C1917`.
  - **Share** — share-nodes glyph, `#EA580C` (icon *and* label).
- **Hint** below the card: `margin-top 16`, 12/16, `rgba(255,255,255,0.75)` — *"Swipe photos • Tap outside to close"*. Both gestures are therefore load-bearing: the scrim closes.

## New colours — this mock introduces a family the token set does not have

| Value | Role | Nearest existing |
|---|---|---|
| `#1B263B` | screen/trip title ink | — (`workspaceColors.title` is `#1C1917`) |
| `#5C6470` | overline, secondary label | — (`profileColors.meta` is `#78716C`) |
| `#E2E4E8` | the back button's hairline | — (`workspaceColors.hairline` is `#E7E5E4`) |
| `#A8A29E` | the modal's trip-name ink | — |
| `rgba(27,38,59,.55)` | modal scrim | — (`workspaceColors.scrim` is `rgba(0,0,0,.4)`) |

Per the fidelity rule these ship as **new tokens**, not as the nearest existing value.

## Deltas from what the stream renders today

| | Today | Mock |
|---|---|---|
| Photo | 280×220 (`diaryMetrics`) | **332×250** — *superseded 2026-08-12: the founder doubled the viewport and removed the peek, so the photo is now the strip's full width × 500* |
| Strip | inset in the body padding | **edge-to-edge**, bleeds `-20` |
| Back | `ScreenHeader`'s bare chevron | **36px circled button** |
| Title | `ScreenHeader` heading | 24/29 700 `#1B263B`, beside the chevron |
| Caption | `typography.body`, lh 22 | 16/22 |
| Entry tap | opens the **editor** | opens the **preview modal** |

**The photo strip is not part of the tap target** *(founder ruling, 2026-08-12, at the code review)*. The heading and the caption each open the preview; the photos between them scroll and nothing else. This came out of the swipe-lands-as-a-tap bug — the entry was one `Pressable`, so releasing a horizontal swipe over a photo fired `onPress` and the postcard flew open mid-scroll. A movement-threshold tap was offered and declined: the profile's `Postcard` already behaves this way (its `Pressable` wraps only the body), so the two diary surfaces agree, and an inert strip has no frame in which a swipe can be mistaken for a tap. The narrower reading of *"when a diary entry is tapped"* is deliberate.

## The two postcard anatomies are now both canon

The epic-map line raised at ticket 04 — *"the diary stream adopts `Postcard` the next time it is touched"* — is **superseded**: the stream has its own mock now, and the founder has sanctioned both shapes. The profile shows a **card** (bordered, paged carousel, counter pill, `·` separator, likes row); the trip stream shows a **row** (divider-separated, horizontal strip, `•` separator, no likes). The separator divergence is by design, not drift. What stays shared is the pure layer — `postcardAnatomy` and `postcardCarousel`.
