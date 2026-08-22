const CARD = {
  width: 1200,
  height: 630,
  file: 'og-card.png',
};

const COPY = {
  siteName: 'Largata',
  title: 'Largata',
  headline: 'Plan the trip together',
  tagline: 'One plan, one group, one record.',
  alt: 'Largata — plan the trip together',
};

COPY.description = `${COPY.headline} — ${COPY.tagline.toLowerCase()}`;

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeBase(baseUrl) {
  const trimmed = String(baseUrl ?? '').trim();
  if (trimmed === '') throw new Error('a base URL is required to build absolute og:image tags');
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error(`the base URL must be absolute, got "${trimmed}"`);
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function metaTagsFor(baseUrl) {
  const base = normalizeBase(baseUrl);
  const image = `${base}/${CARD.file}`;

  return [
    ['name', 'description', COPY.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', COPY.siteName],
    ['property', 'og:title', COPY.title],
    ['property', 'og:description', COPY.description],
    ['property', 'og:image', image],
    ['property', 'og:image:width', String(CARD.width)],
    ['property', 'og:image:height', String(CARD.height)],
    ['property', 'og:image:alt', COPY.alt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', COPY.title],
    ['name', 'twitter:description', COPY.description],
    ['name', 'twitter:image', image],
  ]
    .map(([attribute, key, value]) => {
      const name = escapeAttribute(key);
      const content = escapeAttribute(value);
      return `<meta ${attribute}="${name}" content="${content}">`;
    })
    .join('\n    ');
}

function cardMarkup() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; }
  .card {
    width: ${CARD.width}px;
    height: ${CARD.height}px;
    background: #FFF7ED;
    position: relative;
    overflow: hidden;
    display: flex;
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  .cover {
    width: 552px;
    height: ${CARD.height}px;
    flex: none;
    background: #FFEDD5;
    position: relative;
    overflow: hidden;
  }
  .blobA { position: absolute; width: 420px; height: 420px; border-radius: 999px; background: #FED7AA; top: -120px; left: -110px; }
  .blobB { position: absolute; width: 300px; height: 300px; border-radius: 999px; background: #FDBA74; opacity: 0.5; bottom: -90px; right: -60px; }
  .initial {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif; font-size: 170px; font-weight: 800;
    color: #C2410C; opacity: 0.35;
  }
  .body {
    flex: 1;
    display: flex; flex-direction: column; justify-content: center;
    gap: 18px;
    padding: 0 84px 0 64px;
  }
  .wordmark { font-family: 'Outfit', sans-serif; font-size: 34px; font-weight: 800; color: #EA580C; }
  .block { display: flex; flex-direction: column; gap: 10px; }
  .headline { font-family: 'Outfit', sans-serif; font-size: 58px; line-height: 1.12; font-weight: 700; color: #1C1917; }
  .tagline { font-size: 28px; line-height: 1.3; color: #78716C; }
  .divider { height: 2px; width: 64px; background: #FED7AA; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #EA580C; }
</style>
</head>
<body>
  <div class="card">
    <div class="cover">
      <div class="blobA"></div>
      <div class="blobB"></div>
      <div class="initial">L</div>
    </div>
    <div class="body">
      <div class="wordmark">${COPY.siteName}</div>
      <div class="block">
        <div class="headline">${COPY.headline}</div>
        <div class="tagline">${COPY.tagline}</div>
      </div>
      <div class="divider"></div>
    </div>
    <div class="bar"></div>
  </div>
</body>
</html>`;
}

module.exports = { CARD, COPY, cardMarkup, metaTagsFor, normalizeBase };
