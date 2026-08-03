import {
  audienceBlurb,
  audienceLabel,
  audienceOf,
  canPublish,
  isEditable,
  isPublished,
  lifecycleLabel,
  nextLifecycleAct,
  otherAudience,
  publishControl,
  publishNeedsCompleteBody,
  workspaceEyebrow,
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
    expect(canPublish({ state: 'draft' })).toBe(false);
    expect(canPublish({ state: 'active' })).toBe(false);
  });

  it('explains the precondition in words that name the way through', () => {
    expect(publishNeedsCompleteBody('draft')).toMatch(/mark it complete/i);
    expect(publishNeedsCompleteBody('active')).toMatch(/mark it complete/i);
  });

  it('describes the trip’s actual state rather than one generic sentence', () => {
    expect(publishNeedsCompleteBody('draft')).not.toBe(publishNeedsCompleteBody('active'));
  });
});

describe('the lifecycle', () => {
  it('steps forward one act at a time and stops at complete', () => {
    expect(nextLifecycleAct('draft')).toEqual({ act: 'start', label: 'Start trip' });
    expect(nextLifecycleAct('active')).toEqual({ act: 'complete', label: 'Mark complete' });
    expect(nextLifecycleAct('completed')).toBeNull();
  });

  it('names all three states distinctly', () => {
    const labels = (['draft', 'active', 'completed'] as const).map(lifecycleLabel);

    expect(new Set(labels).size).toBe(3);
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

describe('workspaceEyebrow', () => {
  it('names the lifecycle while unpublished, so an active trip does not read as a draft', () => {
    const labels = (['draft', 'active', 'completed'] as const).map(
      (state) => workspaceEyebrow({ state, published: false, visibility: 'public' }).label,
    );

    expect(new Set(labels).size).toBe(3);
    expect(labels[0]).toMatch(/Draft/);
  });

  it('names the audience once published, and only public gets the globe', () => {
    const published = workspaceEyebrow({ state: 'completed', published: true, visibility: 'public' });
    const restricted = workspaceEyebrow({
      state: 'completed',
      published: true,
      visibility: 'private',
    });

    expect(published.icon).toBe('globe');
    expect(published.label).toMatch(/Public/);
    expect(restricted.icon).not.toBe('globe');
    expect(restricted.label).toMatch(/Private/);
  });

  it('does not let a published trip read as its lifecycle — discovery wins the eyebrow', () => {
    const eyebrow = workspaceEyebrow({ state: 'completed', published: true, visibility: 'public' });

    expect(eyebrow.label).not.toMatch(/Complete/);
  });
});
