import { apiClient } from '../api/apiClient';
import { isOurMedia, type MediaSource } from './mediaSourceContract';

const objectUrls = new Map<string, string>();

export async function mediaSourceFor(url: string | null): Promise<MediaSource | null> {
  if (url === null || url === '') return null;
  if (!isOurMedia(url)) return { uri: url };

  const cached = objectUrls.get(url);
  if (cached !== undefined) return { uri: cached };

  const bytes = await apiClient.fetchBlob(url);
  if (bytes === null) return null;

  const objectUrl = URL.createObjectURL(bytes);
  objectUrls.set(url, objectUrl);
  return { uri: objectUrl };
}


