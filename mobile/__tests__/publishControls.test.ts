import {
  audienceBlurb,
  audienceLabel,
  audienceOf,
  isEditable,
  isPublished,
  otherAudience,
  publishControl,
  workspaceEyebrow,
} from '../src/itineraries/publishControls';

describe('publishControl (ADR-018)', () => {
  it('offers publish on a draft and unpublish once it is out, whichever audience', () => {
    expect(publishControl({ status: 'draft', archived: false }, true)).toBe('publish');
    expect(publishControl({ status: 'private', archived: false }, true)).toBe('unpublish');
    expect(publishControl({ status: 'public', archived: false }, true)).toBe('unpublish');
  });

  it('offers nothing to a member — publishing is the owner’s act', () => {
    expect(publishControl({ status: 'draft', archived: false }, false)).toBeNull();
    expect(publishControl({ status: 'public', archived: false }, false)).toBeNull();
  });

  it('offers nothing while archived — the fence rejects both verbs', () => {
    expect(publishControl({ status: 'draft', archived: true }, true)).toBeNull();
    expect(publishControl({ status: 'public', archived: true }, true)).toBeNull();
  });
});

describe('published and editable are opposites, and private sits on the published side', () => {
  it('counts private as published — it is out, just not to everyone', () => {
    expect(isPublished({ status: 'private' })).toBe(true);
    expect(isPublished({ status: 'public' })).toBe(true);
    expect(isPublished({ status: 'draft' })).toBe(false);
  });

  it('lets only a draft be edited', () => {
    expect(isEditable({ status: 'draft', archived: false })).toBe(true);
    expect(isEditable({ status: 'private', archived: false })).toBe(false);
    expect(isEditable({ status: 'public', archived: false })).toBe(false);
  });

  it('lets an archived draft be edited by nobody either', () => {
    expect(isEditable({ status: 'draft', archived: true })).toBe(false);
  });
});

describe('the audience', () => {
  it('exists only once published', () => {
    expect(audienceOf({ status: 'draft' })).toBeNull();
    expect(audienceOf({ status: 'private' })).toBe('private');
    expect(audienceOf({ status: 'public' })).toBe('public');
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
  it('names all three statuses distinctly, and only public gets the globe', () => {
    const labels = (['draft', 'private', 'public'] as const).map((s) => workspaceEyebrow(s).label);

    expect(new Set(labels).size).toBe(3);
    expect(workspaceEyebrow('public').icon).toBe('globe');
    expect(workspaceEyebrow('private').icon).not.toBe('globe');
    expect(workspaceEyebrow('draft').label).toMatch(/Draft/);
  });
});
