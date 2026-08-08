import {
  coverPreviewFor,
  forgetCoverPreview,
  rememberCoverPreview,
} from '../src/media/coverInFlight';

describe('the cover a screen shows while the upload is still in flight', () => {
  afterEach(() => {
    forgetCoverPreview('trip-1');
    forgetCoverPreview('trip-2');
  });

  it('knows nothing about a trip nobody staged a cover for', () => {
    expect(coverPreviewFor('trip-1')).toBeNull();
  });

  it('hands back the local file so a screen can render it before any byte reaches the server', () => {
    rememberCoverPreview('trip-1', 'file:///tmp/beach.jpg');

    expect(coverPreviewFor('trip-1')).toBe('file:///tmp/beach.jpg');
  });

  it('keeps trips apart — one traveler can create two in a session', () => {
    rememberCoverPreview('trip-1', 'file:///tmp/one.jpg');
    rememberCoverPreview('trip-2', 'blob:http://localhost/two');

    expect(coverPreviewFor('trip-1')).toBe('file:///tmp/one.jpg');
    expect(coverPreviewFor('trip-2')).toBe('blob:http://localhost/two');
  });

  it('forgets the local file once the real one exists, so the server variant wins from then on', () => {
    rememberCoverPreview('trip-1', 'file:///tmp/beach.jpg');
    forgetCoverPreview('trip-1');

    expect(coverPreviewFor('trip-1')).toBeNull();
  });
});
