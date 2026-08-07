import { mediaSourceFor as nativeSource } from '../src/media/mediaSource.native';
import { mediaSourceFor as webSource } from '../src/media/mediaSource.web';
import { isOurMedia, thumbOf } from '../src/media/mediaSourceContract';
import { apiClient } from '../src/api/apiClient';
import { File } from 'expo-file-system';

jest.mock('../src/auth/tokenSource', () => ({
  currentToken: jest.fn(async () => 'a-token'),
}));

jest.mock('../src/api/apiClient', () => ({
  baseUrl: () => 'http://backend.test:8080',
  apiClient: { fetchBlob: jest.fn(async () => new Blob(['pixels'])) },
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: jest.fn(() => ({ exists: true, create: jest.fn() })),
  File: Object.assign(
    jest.fn(() => ({ exists: false, delete: jest.fn(), uri: 'file:///cache/media/photo' })),
    { downloadFileAsync: jest.fn(async () => ({ uri: 'file:///cache/media/downloaded.jpg' })) },
  ),
}));

// <Image> drops source.headers on BOTH platforms — proven on a device at S3.3, where an
// authenticated avatar 401'd after a successful upload. Neither fork may hand back a bare
// remote URL for our own media: native downloads it with auth, web fetches it with auth.
describe('mediaSourceFor on native — a local file, because <Image> drops headers', () => {
  it('is null when there is no photo', async () => {
    expect(await nativeSource(null)).toBeNull();
    expect(await nativeSource('')).toBeNull();
  });

  it('leaves a Google photo URL absolute and unauthenticated', async () => {
    expect(await nativeSource('https://lh3.googleusercontent.com/a/abc')).toEqual({
      uri: 'https://lh3.googleusercontent.com/a/abc',
    });
  });

  it('downloads our media WITH auth and hands Image a local file uri', async () => {
    const source = await nativeSource('/v1/media/photo-id');

    expect(File.downloadFileAsync).toHaveBeenCalledWith(
      'http://backend.test:8080/v1/media/photo-id',
      expect.anything(),
      { headers: { Authorization: 'Bearer a-token' } },
    );
    expect(source?.uri).toBe('file:///cache/media/downloaded.jpg');
    expect(source?.headers).toBeUndefined();
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

describe('thumbOf — small renders fetch the thumb rung, never the full display image', () => {
  it('points our media at its thumbnail variant', () => {
    expect(thumbOf('/v1/media/abc')).toBe('/v1/media/abc/thumb');
  });

  it('leaves an external avatar URL untouched, because /thumb is our contract, not the web’s', () => {
    expect(thumbOf('https://lh3.googleusercontent.com/a/abc')).toBe(
      'https://lh3.googleusercontent.com/a/abc',
    );
  });

  it('passes through the no-photo cases unchanged', () => {
    expect(thumbOf(null)).toBeNull();
    expect(thumbOf('')).toBe('');
  });
});
