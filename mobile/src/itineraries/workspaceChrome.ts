import type { WorkspaceTab } from './WorkspaceTabRow';


export const LADDER_TAB: WorkspaceTab = 'day-by-day';

export const DOCKED_TABS: readonly WorkspaceTab[] = ['chat'];


export function laddersOn(tab: WorkspaceTab): boolean {
  return tab === LADDER_TAB;
}


export function docksItsOwnBar(tab: WorkspaceTab): boolean {
  return DOCKED_TABS.includes(tab);
}
