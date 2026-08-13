import { RECENTS_STORAGE_KEY, recentsFromStorage, recentsToStorage } from './recentSearches';


export async function loadRecents(): Promise<string[]> {
  if (typeof window === 'undefined' || window.localStorage === undefined) {
    return [];
  }
  return recentsFromStorage(window.localStorage.getItem(RECENTS_STORAGE_KEY));
}


export async function saveRecents(recents: readonly string[]): Promise<void> {
  if (typeof window === 'undefined' || window.localStorage === undefined) {
    return;
  }
  window.localStorage.setItem(RECENTS_STORAGE_KEY, recentsToStorage(recents));
}
