import { avatarPreviewOf } from '../src/media/stagedAvatar';

describe('avatarPreviewOf — the circle shows what Save would commit', () => {
  it('shows the current photo when nothing is staged', () => {
    expect(avatarPreviewOf(null, '/v1/media/current')).toBe('/v1/media/current');
  });

  it('shows the freshly picked photo instantly, before any upload exists', () => {
    const staged = {
      kind: 'photo' as const,
      photo: { uri: 'file:///cache/cropped.jpg', name: 'cropped.jpg', mimeType: 'image/jpeg' },
    };

    expect(avatarPreviewOf(staged, '/v1/media/current')).toBe('file:///cache/cropped.jpg');
  });

  it('shows the initials fallback once removal is staged, even while the server still has a photo', () => {
    expect(avatarPreviewOf({ kind: 'removed' }, '/v1/media/current')).toBeNull();
  });

  it('shows nothing when there is no photo anywhere', () => {
    expect(avatarPreviewOf(null, null)).toBeNull();
  });
});
