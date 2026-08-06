import { Directory, File, Paths } from 'expo-file-system';
import { baseUrl } from '../api/apiClient';
import { currentToken } from '../auth/tokenSource';
import { isOurMedia, type MediaSource } from './mediaSourceContract';

const cached = new Map<string, string>();

export async function mediaSourceFor(url: string | null): Promise<MediaSource | null> {
  if (url === null || url === '') return null;
  if (!isOurMedia(url)) return { uri: url };

  const known = cached.get(url);
  if (known !== undefined) return { uri: known };

  const token = await currentToken();
  if (token === null) return null;

  const folder = new Directory(Paths.cache, 'media');
  if (!folder.exists) folder.create({ intermediates: true });

  const destination = new File(folder, url.replaceAll('/', '_'));
  if (destination.exists) destination.delete();

  try {
    const downloaded = await File.downloadFileAsync(`${baseUrl()}${url}`, destination, {
      headers: { Authorization: `Bearer ${token}` },
    });
    cached.set(url, downloaded.uri);
    return { uri: downloaded.uri };
  } catch {
    return null;
  }
}
