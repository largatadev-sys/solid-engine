import { mediaSourceFor as nativeSource } from '../src/media/mediaSource.native';
import { mediaSourceFor as webSource } from '../src/media/mediaSource.web';
import { isOurMedia } from '../src/media/mediaSourceContract';
import { apiClient } from '../src/api/apiClient';

jest.mock('../src/auth/tokenSource', () => ({
  currentToken: jest.fn(async () => 'a-token'),
}));

jest.mock('../src/api/apiClient', () => ({
  baseUrl: () => 'http://backend.test:8080',
  apiClient: { fetchBlob: jest.fn(async () => new Blob(['pixels'])) },
}));

describe('mediaSourceFor on native — headers ride along', () => {
  it('is null when there is no photo', async () => {
    expect(await nativeSource(null)).toBeNull();
    expect(await nativeSource('')).toBeNull();
  });

  it('leaves a Google photo URL absolute and unauthenticated', async () => {
    expect(await nativeSource('https://lh3.googleusercontent.com/a/abc')).toEqual({
      uri: 'https://lh3.googleusercontent.com/a/abc',
    });
  });

  it('resolves our own media path and carries the bearer token', async () => {
    const source = await nativeSource('/v1/media/photo-id');

    expect(source?.uri).toBe('http://backend.test:8080/v1/media/photo-id');
    expect(source?.headers).toEqual({ Authorization: 'Bearer a-token' });
  });

  it('never sends our token to a third-party host', async () => {
    const source = await nativeSource('https://lh3.googleusercontent.com/a/abc');

    expect(source?.headers).toBeUndefined();
  });
});

describe('mediaSourceFor on the web — a blob, because <Image> drops headers', () => {
  beforeEach(() => {
    (URL.createObjectURL as unknown) = jest.fn(() => 'blob:http://localhost/generated');
    jest.clearAllMocks();
  });

  it('leaves a third-party URL alone and fetches nothing', async () => {
    const source = await webSource('https://lh3.googleusercontent.com/a/abc');

    expect(source).toEqual({ uri: 'https://lh3.googleusercontent.com/a/abc' });
    expect(apiClient.fetchBlob).not.toHaveBeenCalled();
  });

  it('fetches our media WITH auth and hands Image a blob url', async () => {
    const source = await webSource('/v1/media/photo-id');

    expect(apiClient.fetchBlob).toHaveBeenCalledWith('/v1/media/photo-id');
    expect(source?.uri).toBe('blob:http://localhost/generated');
    expect(source?.headers).toBeUndefined();
  });

  it('is null when the media cannot be read, rather than a url that 401s', async () => {
    (apiClient.fetchBlob as jest.Mock).mockResolvedValueOnce(null);

    expect(await webSource('/v1/media/gone')).toBeNull();
  });
});

describe('isOurMedia', () => {
  it('recognises the media path and nothing else', () => {
    expect(isOurMedia('/v1/media/x')).toBe(true);
    expect(isOurMedia('https://lh3.googleusercontent.com/a/abc')).toBe(false);
    expect(isOurMedia('https://evil.test/v1/media/x')).toBe(false);
  });
});
