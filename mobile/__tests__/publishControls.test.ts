import {
  canPublish,
  isEditable,
  isPublished,
  publishControl,
  publishNeedsCompleteBody,
  PUBLISH_AUDIENCE_LINE,
} from '../src/itineraries/publishControls';

describe('publishControl (ADR-019)', () => {
  it('offers publish while out of the feed and unpublish once in it, whichever audience', () => {
    expect(publishControl({ published: false, archived: false }, true)).toBe('publish');
    expect(publishControl({ published: true, archived: false }, true)).toBe('unpublish');
  });

  it('offers nothing to a member — publishing is the owner’s act', () => {
    expect(publishControl({ published: false, archived: false }, false)).toBeNull();
    expect(publishControl({ published: true, archived: false }, false)).toBeNull();
  });

  it('offers nothing while archived — the fence rejects both verbs', () => {
    expect(publishControl({ published: false, archived: true }, true)).toBeNull();
    expect(publishControl({ published: true, archived: true }, true)).toBeNull();
  });
});

describe('the freeze hangs on discovery, not on the audience', () => {
  it('reads published straight off the fact', () => {
    expect(isPublished({ published: true })).toBe(true);
    expect(isPublished({ published: false })).toBe(false);
  });

  it('lets only an unpublished trip be edited, whatever its audience', () => {
    expect(isEditable({ published: false, archived: false })).toBe(true);
    expect(isEditable({ published: true, archived: false })).toBe(false);
  });

  it('lets an archived trip be edited by nobody either', () => {
    expect(isEditable({ published: false, archived: true })).toBe(false);
  });
});

describe('the publish gate', () => {
  it('admits a completed trip and nothing else', () => {
    expect(canPublish({ state: 'completed' })).toBe(true);
    expect(canPublish({ state: 'upcoming' })).toBe(false);
    expect(canPublish({ state: 'ongoing' })).toBe(false);
  });

  it('explains the precondition in words that name the way through', () => {
    expect(publishNeedsCompleteBody('upcoming')).toMatch(/mark it complete/i);
    expect(publishNeedsCompleteBody('ongoing')).toMatch(/mark it complete/i);
  });

  it('describes the trip’s actual state rather than one generic sentence', () => {
    const bodies = (['upcoming', 'ongoing'] as const).map(publishNeedsCompleteBody);

    expect(new Set(bodies).size).toBe(2);
  });
});

describe('the audience is no longer asked for (S4.40)', () => {
  it('states the one outcome publishing has, since there is no longer a choice', () => {
    expect(PUBLISH_AUDIENCE_LINE).toBe('Everyone on Largata can find and read this itinerary.');
  });
});
