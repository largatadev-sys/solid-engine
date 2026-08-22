# CardProto — the grilling's fidelity prototype (throwaway, primary source)

`CardProto.java` is the throwaway Java2D renderer built at S4.29's grilling (2026-08-23) to answer one question: *does a hand-rolled Java2D render reproduce the design bundle's card?* It rendered the bundle's frames 1–3 (cover, no-cover fallback, long-title clamp) from the real fonts and real JPEG bytes; the founder reviewed the output against the frames before the spec was written. It seeds the real renderer — the layout math, seam gradient, line-box model, wrap/clamp and tracking in it are the validated starting point, not to be re-derived.

It is **not production code**: no error handling, hardcoded sample data, reads assets from its working directory.

## Run it

From a scratch directory containing this file:

```bash
# fonts (Google Fonts serves TTF URLs to a plain curl UA)
mkdir -p fonts && curl -s "https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Noto+Sans:wght@400;700" \
  | grep -o "https://[^)]*" > urls.txt
# download in order as: NotoSans-400.ttf NotoSans-700.ttf Outfit-700.ttf Outfit-800.ttf into fonts/

# sample covers (the mock's own picsum seeds, so comparison is apples-to-apples)
curl -sL "https://picsum.photos/seed/elnido/1104/1260" -o cover-elnido.jpg
curl -sL "https://picsum.photos/seed/kyotofall/1104/1260" -o cover-kyoto.jpg

java CardProto.java   # emits card-1-cover.png, card-2-fallback.png, card-3-longtitle.png
```

## What the review established

- The layout, seam gradient, fallback panel and clamp reproduce the frames at spec values.
- Java's line-breaking is slightly more conservative than a browser's, so wrap points differ from the mock by a word; reviewed and accepted (tunable, never glyph-identical to Chrome).
- Verdict: Java2D covers the design with no new dependency — the estimate's biggest risk retired before the story started.
