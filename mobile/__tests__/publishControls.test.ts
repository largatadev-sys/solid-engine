import {
  audienceBlurb,
  audienceLabel,
  audienceOf,
  canPublish,
  isEditable,
  isPublished,
  otherAudience,
  publishControl,
  publishNeedsCompleteBody,
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

describe('the audience', () => {
  it('is a fact of its own, readable whether or not the trip is published', () => {
    expect(audienceOf({ visibility: 'private' })).toBe('private');
    expect(audienceOf({ visibility: 'public' })).toBe('public');
  });

  it('has exactly one alternative, so the toggle needs no menu', () => {
    expect(otherAudience('public')).toBe('private');
    expect(otherAudience('private')).toBe('public');
  });

  it('says who can read it, in words a traveler can act on', () => {
    expect(audienceLabel('public')).toBe('Public');
    expect(audienceBlurb('public')).toMatch(/Everyone/);
    expect(audienceBlurb('private')).toMatch(/collaborators/);
  });
});
