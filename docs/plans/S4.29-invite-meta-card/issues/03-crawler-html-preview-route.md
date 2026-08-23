# 03 — The crawler HTML preview route

**What to build:** The backend's first `text/html` endpoint, confined to the join surface under ADR-032's existing anonymous matcher — no security-chain change. Fetching the preview route by token returns a head carrying the full tag set for that trip — `og:title` "You're invited: {trip title}", `og:description` = the meta line, an **absolute API-origin** `og:image` pointing at ticket 01's card route, `og:site_name`, `twitter:card` `summary_large_image`, image dimensions — plus a minimal branded body with a plain "Open this invite" link to the SPA landing. No auto-redirect (a misclassified browser would loop — spec decision 2). Dead links get the dead-card tag copy at 200 (`og:title` "Largata", description "This invite link is no longer active."); unknown tokens 404.

**Blocked by:** 01 — the card route the `og:image` URL must point at.

**Status:** built and tested — the code ACs are closed; the demo-on-the-running-stack line waits on a rebuilt container at the story gate.

- [x] Preview route answers `text/html` with exactly the specified tags for a live trip (spec decision 11); the meta line matches the card's
- [x] `og:image` is absolute, API-origin, and resolves (the IT fetches it)
- [x] ~~Body contains a working link to the SPA's `/join/<token>` landing and no meta-refresh or script redirect~~ — **both halves superseded, on different dates, and neither silently.** *No meta-refresh* still holds and is still tested — some crawlers follow one and would miss the tags. *No script redirect* was reversed by decision 1's second amendment (2026-08-23), which made this page the answer for **every** invite open rather than crawlers only: humans must be handed off, and a script is the only mechanism a crawler will not follow. *A working link in the body* was narrowed by the third amendment the same day — the link is now inside `<noscript>`, because painting a card and then replacing it was the defect being fixed.
- [x] DEAD → 200 with dead tag copy; unknown → 404
- [x] `Cache-Control: no-cache` on the HTML
- [x] Route lives under the existing anonymous join matcher — the security config diff is empty
- [x] Prior art followed: the join teaser ITs' shape, singleton-Postgres base
- [ ] Demoable: curl the preview URL for a seeded trip and read that trip's title in the tags *(open: needs the rebuilt backend container; `JoinCardIT` asserts the tags over real HTTP.)*
