import {
  copyLinkFeedback,
  shareFeedback,
  shareMessage,
} from '../src/itineraries/shareLinkContract';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(undefined) }));

describe('the wording both forks share', () => {
  it('puts the trip title in front of the link', () => {
    expect(shareMessage({ title: 'Island Hopping in El Nido', url: 'largata://published/abc' })).toBe(
      'Island Hopping in El Nido — largata://published/abc',
    );
  });

  it('tells the traveler whether the copy landed', () => {
    expect(copyLinkFeedback('copied')).toBe('Link copied');
    expect(copyLinkFeedback('unavailable')).toMatch(/Could not copy/);
  });

  it('says nothing after a real share and explains the fallback after a copy', () => {
    expect(shareFeedback('shared')).toBeUndefined();
    expect(shareFeedback('copied')).toMatch(/copied instead/);
  });
});

describe('shareLink (web fork) — a browser with no share sheet must not fail silently', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  afterEach(() => {
    if (original !== undefined) Object.defineProperty(globalThis, 'navigator', original);
  });

  const web = () =>
    require('../src/itineraries/shareLink.web') as typeof import('../src/itineraries/shareLink.web');

  it('falls back to copying when navigator.share is absent, rather than rejecting', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

    await expect(web().shareLink({ title: 'Trip', url: 'https://example.test/published/abc' })).resolves.toBe(
      'copied',
    );
  });

  it('falls back to copying when the share sheet is dismissed or throws', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { share: jest.fn().mockRejectedValue(new Error('AbortError')) },
      configurable: true,
    });

    await expect(web().shareLink({ title: 'Trip', url: 'https://example.test/published/abc' })).resolves.toBe(
      'copied',
    );
  });

  it('builds a route on the origin the page is already served from', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://founders.largata.test' },
      configurable: true,
    });

    expect(web().publishedItineraryLink('abc')).toBe('https://founders.largata.test/published/abc');
  });
});
