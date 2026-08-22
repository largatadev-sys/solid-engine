# Local verification evidence — S4.29 (2026-08-23)

Screenshots from the local full stack, taken after rebuilding both the backend (card route, preview route, V39) and the preview container (crawler routing). Trips were seeded through the real invite → accept flow; every card here was rendered on request by the backend at `localhost:8080`.

| File | What it shows |
|---|---|
| `A-cover.png` | Cover photo uploaded through `POST /cover`, centre-cropped into the 552px panel |
| `B-fallback.png` | Same trip with the cover removed → `EN` initials at 35% over the two circles |
| `C-longtitle.png` | 61-char title: steps 58→46px, three lines, ellipsis; meta line follows the edit |
| `D-dead.png` | The same token after publishing the trip → the closed card at 200, no trip name |
| `E-misclassified-human.png` | The preview route opened in a real browser — branded page, working link, no redirect |
| `F-spa-landing.png` | The S4.28 join postcard a real browser still gets on the same URL |
| `G-chat-unfurl.png` | Chat-bubble mockup built from the **live** `og:` tags and card bytes |

`index.html` bundles all seven with the written findings; it is gitignored because it embeds the same PNGs as base64. Rebuild it by re-running the publish step, or just open the PNGs.

**Not provable here:** platform cache behaviour (an already-shared link keeping its old card while a re-shared bumped URL scrapes fresh) needs deployed dev and the Facebook Sharing Debugger — the story gate's closing AC.
