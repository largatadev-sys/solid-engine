import {
  COPY_PUBLIC_LINK_LABEL,
  DELETE_POSTCARD_LABEL,
  EDIT_DIARY_DETAILS_LABEL,
  EDIT_ITINERARY_DETAILS_LABEL,
  EDIT_POSTCARD_LABEL,
  UNPUBLISH_LABEL,
  VIEW_PUBLISHED_PAGE_LABEL,
} from '../src/removal/removalCopy';
import { removalMenuEntries } from '../src/removal/removalMenu';


describe('the postcard menu offers editing and removal', () => {
  const entries = removalMenuEntries('postcard');

  it('reads Edit postcard then Delete postcard, in that order', () => {
    expect(entries.map((entry) => entry.label)).toEqual([
      EDIT_POSTCARD_LABEL,
      DELETE_POSTCARD_LABEL,
    ]);
  });

  it('tones only the delete as destructive', () => {
    expect(entries.map((entry) => entry.tone)).toEqual(['default', 'destructive']);
  });
});


describe('the diary menu has no delete, because a diary is its postcards', () => {
  const entries = removalMenuEntries('diary');

  it('offers editing and the public link only', () => {
    expect(entries.map((entry) => entry.label)).toEqual([
      EDIT_DIARY_DETAILS_LABEL,
      COPY_PUBLIC_LINK_LABEL,
    ]);
  });

  it('carries no destructive entry at all', () => {
    expect(entries.some((entry) => entry.tone === 'destructive')).toBe(false);
  });
});


describe('the itinerary menu treats unpublish as cautionary, not destructive', () => {
  const entries = removalMenuEntries('itinerary');

  it('offers details, the published page, then Unpublish', () => {
    expect(entries.map((entry) => entry.label)).toEqual([
      EDIT_ITINERARY_DETAILS_LABEL,
      VIEW_PUBLISHED_PAGE_LABEL,
      UNPUBLISH_LABEL,
    ]);
  });

  it('tones Unpublish cautionary — the trip survives', () => {
    expect(entries.at(-1)?.tone).toBe('cautionary');
  });
});


describe('every entry is addressable and drawable', () => {
  it.each(['postcard', 'diary', 'itinerary'] as const)('%s entries carry unique keys', (kind) => {
    const keys = removalMenuEntries(kind).map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(['postcard', 'diary', 'itinerary'] as const)('%s entries all carry a glyph', (kind) => {
    expect(removalMenuEntries(kind).every((entry) => entry.icon.length > 0)).toBe(true);
  });
});
