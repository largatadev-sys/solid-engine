import { mediaSourceFor, isOurMedia } from '../src/media/mediaSource';

jest.mock('../src/auth/tokenSource', () => ({
  currentToken: jest.fn(async () => 'a-token'),
}));

jest.mock('../src/api/apiClient', () => ({
  baseUrl: () => 'http://backend.test:8080',
}));

describe('mediaSourceFor', () => {
  it('is null when there is no photo', async () => {
    expect(await mediaSourceFor(null)).toBeNull();
    expect(await mediaSourceFor('')).toBeNull();
  });

  it('leaves a Google photo URL absolute and unauthenticated', async () => {
    const source = await mediaSourceFor('https://lh3.googleusercontent.com/a/abc');

    expect(source).toEqual({ uri: 'https://lh3.googleusercontent.com/a/abc' });
  });

  it('resolves our own media path against the API base url', async () => {
    const source = await mediaSourceFor('/v1/media/photo-id');

    expect(source?.uri).toBe('http://backend.test:8080/v1/media/photo-id');
  });

  it('carries the bearer token on our own media, which the endpoint requires', async () => {
    const source = await mediaSourceFor('/v1/media/photo-id');

    expect(source?.headers).toEqual({ Authorization: 'Bearer a-token' });
  });

  it('never sends our token to a third-party host', async () => {
    const source = await mediaSourceFor('https://lh3.googleusercontent.com/a/abc');

    expect(source?.headers).toBeUndefined();
  });
});

describe('isOurMedia', () => {
  it('recognises the media path and nothing else', () => {
    expect(isOurMedia('/v1/media/x')).toBe(true);
    expect(isOurMedia('https://lh3.googleusercontent.com/a/abc')).toBe(false);
    expect(isOurMedia('https://evil.test/v1/media/x')).toBe(false);
  });
});
