import { File, Paths } from 'expo-file-system';
import { recentsFromStorage, recentsToStorage } from './recentSearches';


const RECENTS_FILE = 'discovery-recents.json';


export async function loadRecents(): Promise<string[]> {
  try {
    const file = new File(Paths.document, RECENTS_FILE);
    if (!file.exists) {
      return [];
    }
    return recentsFromStorage(file.textSync());
  } catch {
    return [];
  }
}


export async function saveRecents(recents: readonly string[]): Promise<void> {
  try {
    const file = new File(Paths.document, RECENTS_FILE);
    file.write(recentsToStorage(recents));
  } catch {
    return;
  }
}
