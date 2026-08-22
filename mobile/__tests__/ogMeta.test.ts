import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { CARD, COPY, metaTagsFor, normalizeBase } = require('../scripts/ogCard');
const { MARKER, injectInto } = require('../scripts/inject-web-meta');

const BASE = 'https://founders.largata.com';
const SHELL = '<!DOCTYPE html><html><head><title>Largata</title></head><body></body></html>';

describe('the base URL an unfurl is built against', () => {
  it('refuses a relative one — a crawler resolves og:image against nothing', () => {
    expect(() => normalizeBase('/founders')).toThrow(/absolute/);
    expect(() => normalizeBase('founders.largata.com')).toThrow(/absolute/);
  });

  it('refuses an empty one rather than shipping a dead preview', () => {
    expect(() => normalizeBase('')).toThrow();
    expect(() => normalizeBase(undefined)).toThrow();
  });

  it('tolerates a trailing slash without doubling it', () => {
    expect(metaTagsFor(`${BASE}/`)).toContain(`content="${BASE}/${CARD.file}"`);
  });
});

describe('the tags a crawler reads', () => {
  const tags = metaTagsFor(BASE);

  it('names an ABSOLUTE image — the single thing that makes or breaks the card', () => {
    expect(tags).toContain(`<meta property="og:image" content="${BASE}/${CARD.file}">`);
    expect(tags).toContain(`<meta name="twitter:image" content="${BASE}/${CARD.file}">`);
  });

  it('declares the dimensions, so platforms lay the card out before fetching it', () => {
    expect(tags).toContain(`<meta property="og:image:width" content="1200">`);
    expect(tags).toContain(`<meta property="og:image:height" content="630">`);
  });

  it('asks for the large card rather than the thumbnail', () => {
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it('carries no og:url — a single shell would make every link canonical to one page', () => {
    expect(tags).not.toContain('og:url');
  });

  it('says the same thing the image says, so the card and the text cannot drift', () => {
    expect(tags).toContain(COPY.headline);
    expect(COPY.description).toContain(COPY.headline);
  });
});

describe('injecting into the export', () => {
  it('puts the tags inside the head, where a crawler looks', () => {
    const injected = injectInto(SHELL, BASE);

    expect(injected.indexOf(MARKER)).toBeGreaterThan(injected.indexOf('<head>'));
    expect(injected.indexOf(MARKER)).toBeLessThan(injected.indexOf('</head>'));
  });

  it('does not inject twice when a build re-runs', () => {
    const once = injectInto(SHELL, BASE);

    expect(injectInto(once, BASE)).toBe(once);
  });

  it('fails loudly when the export shape changes rather than writing nothing', () => {
    expect(() => injectInto('<html><body></body></html>', BASE)).toThrow(/head/);
  });
});

describe('the committed card image', () => {
  const png = join(__dirname, '..', 'assets', CARD.file);

  it('exists — the tags point at it and nothing else generates it at deploy time', () => {
    expect(statSync(png).isFile()).toBe(true);
  });

  it('is a real PNG at exactly 1200x630, which is the ratio every platform expects', () => {
    const bytes = readFileSync(png);

    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(bytes.readUInt32BE(16)).toBe(CARD.width);
    expect(bytes.readUInt32BE(20)).toBe(CARD.height);
  });

  it('stays under the 300KB WhatsApp will actually inline', () => {
    expect(statSync(png).size).toBeLessThan(300 * 1024);
  });
});

describe('the build path that carries the tags', () => {
  const dockerfile = readFileSync(join(__dirname, '..', 'Dockerfile.web-preview'), 'utf8');

  it('runs the injection after the export, or the tags never reach the image', () => {
    const exported = dockerfile.indexOf('expo export --platform web');
    const injected = dockerfile.indexOf('inject-web-meta.js');

    expect(exported).toBeGreaterThan(-1);
    expect(injected).toBeGreaterThan(exported);
  });

  it('refuses to build without a base URL, rather than shipping dead previews', () => {
    expect(dockerfile).toContain('test -n "$LARGATA_WEB_BASE_URL"');
  });
});
