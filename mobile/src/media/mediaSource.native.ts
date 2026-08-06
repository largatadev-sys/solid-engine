import { baseUrl } from '../api/apiClient';
import { currentToken } from '../auth/tokenSource';
import { isOurMedia, type MediaSource } from './mediaSourceContract';

export async function mediaSourceFor(url: string | null): Promise<MediaSource | null> {
  if (url === null || url === '') return null;
  if (!isOurMedia(url)) return { uri: url };

  const token = await currentToken();
  return {
    uri: `${baseUrl()}${url}`,
    ...(token !== null ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  };
}
