import {
  ANONYMOUS_AUTHOR,
  FORK_CANCEL_LABEL,
  FORK_CONFIRM_LABEL,
  FORK_CTA_LABEL,
  FORK_HONESTY_LINE,
  FORK_SHEET_BODY,
  FORK_SHEET_TITLE,
  FORK_SUCCESS_TITLE,
  FORKED_STAT_LABEL,
  OPEN_FORKED_WORKSPACE_LABEL,
  attributionLabel,
  attributionLinks,
  forkHighlights,
  forkSuccessBody,
  forkSuccessMeta,
} from '../src/itineraries/forkCopy';
import type { ForkedFromResponse } from '../src/types/api';

const visibleSource: ForkedFromResponse = {
  sourceItineraryId: 'source-1',
  ownerHandle: 'josetravels',
  sourceVisible: true,
};

describe('attribution names the @handle and never a display name (S4.23 decision 5)', () => {
  it('credits the source author by handle', () => {
    expect(attributionLabel(visibleSource)).toBe('Original by @josetravels');
  });

  it('falls back to "a traveler" when the author has no handle', () => {
    expect(attributionLabel({ ...visibleSource, ownerHandle: null })).toBe(
      `Original by ${ANONYMOUS_AUTHOR}`,
    );
  });

  it('treats a blank handle as no handle rather than rendering a bare @', () => {
    expect(attributionLabel({ ...visibleSource, ownerHandle: '   ' })).toBe('Original by a traveler');
  });

  it('renders nothing at all for a trip nobody forked', () => {
    expect(attributionLabel(null)).toBeUndefined();
    expect(attributionLabel(undefined)).toBeUndefined();
  });
});

describe('the pill links only while the source is visible (never a tap into a 404)', () => {
  it('links when the fence says the source is still on the public surface', () => {
    expect(attributionLinks(visibleSource)).toBe(true);
  });

  it('renders plain text once the source is unpublished or archived', () => {
    expect(attributionLinks({ ...visibleSource, sourceVisible: false })).toBe(false);
  });

  it('has nothing to link when the trip carries no provenance', () => {
    expect(attributionLinks(null)).toBe(false);
    expect(attributionLinks(undefined)).toBe(false);
  });

  it('still names a handle-less author whose source is visible, and still links', () => {
    const anonymous = { ...visibleSource, ownerHandle: null };
    expect(attributionLabel(anonymous)).toBe('Original by a traveler');
    expect(attributionLinks(anonymous)).toBe(true);
  });
});

describe('the confirm sheet says what forking does before it is done', () => {
  it('titles itself with the same words as the CTA that opened it', () => {
    expect(FORK_SHEET_TITLE).toBe(FORK_CTA_LABEL);
    expect(FORK_CTA_LABEL).toBe('Fork This Trip');
  });

  it('promises an editable copy, a group and ownership', () => {
    expect(FORK_SHEET_BODY).toBe(
      'Create your own editable copy of this itinerary. Customize the plan, invite your travel group, and make it yours.',
    );
  });

  it('names the three highlights, crediting the source author first', () => {
    expect(forkHighlights('josetravels')).toEqual([
      { icon: 'shieldCheck', text: 'Keeps credit with @josetravels' },
      { icon: 'workspace', text: 'Creates your own Trip Workspace' },
      { icon: 'travelGroup', text: 'Invite your travel group' },
    ]);
  });

  it('pairs each icon with its own words, so a reorder cannot silently mismatch them', () => {
    const byText = new Map(forkHighlights('josetravels').map((row) => [row.text, row.icon]));
    expect(byText.get('Keeps credit with @josetravels')).toBe('shieldCheck');
    expect(byText.get('Invite your travel group')).toBe('travelGroup');
  });

  it('keeps the privacy posture in the highlight when the author has no handle', () => {
    expect(forkHighlights(null)[0]?.text).toBe('Keeps credit with a traveler');
  });

  it('states the honesty line so a photo-less copy reads as the rule working', () => {
    expect(FORK_HONESTY_LINE).toBe("The plan copies. Photos and dates don't.");
  });

  it('offers one primary and one secondary, and collects nothing', () => {
    expect(FORK_CONFIRM_LABEL).toBe('Fork It');
    expect(FORK_CANCEL_LABEL).toBe('Cancel');
  });
});

describe('the success screen celebrates a fork, not a publication', () => {
  it('says the trip was forked', () => {
    expect(FORK_SUCCESS_TITLE).toBe('Trip Forked!');
  });

  it('names the copied title and points at the workspace', () => {
    expect(forkSuccessBody('Island Hopping in El Nido')).toBe(
      'Your copy of "Island Hopping in El Nido" is saved to your trips. Open the workspace to make it yours.',
    );
  });

  it('never claims the copy is live or discoverable — it is born an unpublished draft', () => {
    expect(forkSuccessBody('A trip')).not.toMatch(/publish|live|discover/i);
  });

  it('carries one primary into the new workspace', () => {
    expect(OPEN_FORKED_WORKSPACE_LABEL).toBe('Open Trip Workspace');
  });
});

describe('the summary meta is duration-only — a fork carries no dates', () => {
  it('reads destination then day count, joined by a bullet', () => {
    expect(forkSuccessMeta({ destination: 'El Nido', days: 5 })).toBe('El Nido • 5 Days');
  });

  it('says Day for a one-day copy, because "1 Days" reads as a bug', () => {
    expect(forkSuccessMeta({ destination: 'El Nido', days: 1 })).toBe('El Nido • 1 Day');
  });

  it('falls back to the destination alone when the source had no days', () => {
    expect(forkSuccessMeta({ destination: 'El Nido', days: 0 })).toBe('El Nido');
  });

  it('renders nothing rather than a stray bullet when it knows neither', () => {
    expect(forkSuccessMeta({ destination: '', days: 0 })).toBe('');
  });
});

describe('the Forked stat is a plain stat now the count is real', () => {
  it('is labelled the way the published page has always labelled it', () => {
    expect(FORKED_STAT_LABEL).toBe('Forked');
  });
});
