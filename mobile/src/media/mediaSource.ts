import { baseUrl } from '../api/apiClient';
import { currentToken } from '../auth/tokenSource';

export interface MediaSource {
  readonly uri: string;
  readonly headers?: Record<string, string>;
}

export function isOurMedia(url: string): boolean {
  return url.startsWith('/v1/media/');
}

export async function mediaSourceFor(url: string | null): Promise<MediaSource | null> {
  if (url === null || url === '') return null;
  if (!isOurMedia(url)) return { uri: url };

  const token = await currentToken();
  return {
    uri: `${baseUrl()}${url}`,
    ...(token !== null ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  };
}
