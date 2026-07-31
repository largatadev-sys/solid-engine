import {
  publishControl,
  workspaceEyebrow,
} from '../src/itineraries/publishControls';

describe('publishControl', () => {
  it('offers publish to the owner of a private trip', () => {
    expect(publishControl({ visibility: 'private', archived: false }, true)).toBe('publish');
  });

  it('offers unpublish to the owner of a published trip', () => {
    expect(publishControl({ visibility: 'published', archived: false }, true)).toBe('unpublish');
  });

  it('offers nothing to a member — the visibility fact is the owner’s to change', () => {
    expect(publishControl({ visibility: 'private', archived: false }, false)).toBeNull();
    expect(publishControl({ visibility: 'published', archived: false }, false)).toBeNull();
  });

  it('offers nothing while the trip is archived — both verbs are acts the fence rejects', () => {
    expect(publishControl({ visibility: 'private', archived: true }, true)).toBeNull();
    expect(publishControl({ visibility: 'published', archived: true }, true)).toBeNull();
  });
});

describe('workspaceEyebrow', () => {
  it('names the audience, and the two variants never read the same', () => {
    const priv = workspaceEyebrow('private');
    const published = workspaceEyebrow('published');

    expect(priv.label).toBe('Private Workspace');
    expect(published.label).toBe('Published Itinerary');
    expect(priv.icon).not.toBe(published.icon);
  });
});
