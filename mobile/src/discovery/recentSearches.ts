export const RECENTS_CAP = 8;

export const RECENTS_STORAGE_KEY = 'largata.discovery.recents';


export function rememberSearch(recents: readonly string[], query: string): string[] {
  const trimmed = query.trim();
  if (trimmed === '') {
    return [...recents];
  }
  const withoutDuplicate = recents.filter((seen) => !sameQuery(seen, trimmed));
  return [trimmed, ...withoutDuplicate].slice(0, RECENTS_CAP);
}


export function forgetSearch(recents: readonly string[], query: string): string[] {
  return recents.filter((seen) => !sameQuery(seen, query));
}


export function clearedRecents(): string[] {
  return [];
}


export function recentsFromStorage(raw: string | null): string[] {
  if (raw === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
      .slice(0, RECENTS_CAP);
  } catch {
    return [];
  }
}


export function recentsToStorage(recents: readonly string[]): string {
  return JSON.stringify(recents.slice(0, RECENTS_CAP));
}


function sameQuery(one: string, other: string): boolean {
  return one.trim().toLowerCase() === other.trim().toLowerCase();
}
