import {
  COPY_PUBLIC_LINK_LABEL,
  DELETE_POSTCARD_LABEL,
  DELETE_TRIP_BODY,
  EDIT_DIARY_DETAILS_LABEL,
  EDIT_ITINERARY_DETAILS_LABEL,
  EDIT_POSTCARD_LABEL,
  UNPUBLISH_LABEL,
  VIEW_PUBLISHED_PAGE_LABEL,
  deleteTripAcknowledgement,
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


describe('the delete-trip acknowledgement counts the OTHER members, and reads naturally at each count', () => {
  it('names no one else when the traveler is alone on the trip', () => {
    expect(deleteTripAcknowledgement(1)).toBe('I understand this removes the trip from Largata.');
  });

  it('says member, singular, when exactly one other traveler is on it', () => {
    expect(deleteTripAcknowledgement(2)).toContain('1 other member.');
  });

  it('counts the rest, excluding the owner', () => {
    expect(deleteTripAcknowledgement(5)).toContain('4 other members.');
  });

  it('never goes negative, however odd the count it is handed', () => {
    expect(deleteTripAcknowledgement(0)).toBe('I understand this removes the trip from Largata.');
  });
});


describe('the modal body promises only what archive actually does', () => {
  it('names the visible effects that are true the moment archive lands', () => {
    expect(DELETE_TRIP_BODY).toContain('removes the trip for everyone');
    expect(DELETE_TRIP_BODY).toContain('leave Largata immediately');
  });

  it('claims no destruction, because nothing is destroyed (R2)', () => {
    expect(DELETE_TRIP_BODY).not.toContain('cannot be undone');
    expect(DELETE_TRIP_BODY).not.toContain('deletes');
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
