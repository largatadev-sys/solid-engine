# 03 — Feed card variant C + the destination field

**What to build:** the story's one wire change and the feed re-chrome, as a single vertical
slice. Backend: `FeedPostcardResponse` gains an additive `destination`, read live at query time
exactly as `tripTitle` is — no snapshot, no schema change, no migration; the postcard-feed IT
table asserts it. Mobile: the location tag deletes its open-the-trip branch and always opens
Maps (even on unpublished trips), query hinted with the card's new `destination`; pressed
state swaps the well `#FFF0EC → #FFE0D5` and ink to `#C2410C` (new `tagWellPressed` /
`tagInkPressed` tokens beside the feed tokens). The trip-title line becomes the door to the
published trip — tappable and tinted `#C2410C` when `publishedItineraryId` is present,
**untinted** muted `#78716C` and inert when not (fixing the shipped tinted-but-dead behavior,
so tint = tappable holds card-wide). A11y: tag relabels to `"<place>, open in Google Maps"`;
the title line keeps "open the published trip". Everything else on the card is unchanged.

**Blocked by:** 01 (uses the query builder, opener split, and tokens).

**Status:** ready-for-agent

- [ ] Backend IT: feed postcards carry `destination`; existing assertions untouched
- [ ] Tag opens Maps on published AND unpublished trips; the old navigate-to-trip branch is gone
- [ ] Trip-title line opens the published trip when published; untinted `#78716C` and inert when not
- [ ] Tag pressed state per the canvas (well + ink swap); tag stays single-line ellipsised
- [ ] feedCard Jest updates: the tag's new target, the dead trip line's untint
- [ ] Playwright feed walk: captured Maps URL includes the destination hint; trip-title tap still routes to the published trip
