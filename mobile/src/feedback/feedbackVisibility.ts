export type DockVisibility = 'default' | 'revealed' | 'hidden';

export const DEPLOYED_DEV_BASE_URL = 'https://api-dev.largata.com';


export function dockVisible(visibility: DockVisibility, apiBaseUrl: string): boolean {
  if (visibility === 'revealed') return true;
  if (visibility === 'hidden') return false;
  return apiBaseUrl === DEPLOYED_DEV_BASE_URL;
}


export function asVisibility(stored: unknown): DockVisibility {
  if (stored === 'revealed' || stored === 'hidden') return stored;
  return 'default';
}
