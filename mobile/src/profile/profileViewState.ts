export type ProfileTab = 'diary' | 'itineraries';

interface ProfileViewState {
  tab: ProfileTab;
  expanded: Record<string, boolean>;
}

const state: ProfileViewState = { tab: 'diary', expanded: {} };


export function selectedTab(): ProfileTab {
  return state.tab;
}


export function selectTab(tab: ProfileTab): void {
  state.tab = tab;
}


export function isExpanded(itineraryId: string, first: boolean): boolean {
  return state.expanded[itineraryId] ?? first;
}


export function toggleExpanded(itineraryId: string, first: boolean): void {
  state.expanded[itineraryId] = !isExpanded(itineraryId, first);
}


export function forgetProfileView(): void {
  state.tab = 'diary';
  state.expanded = {};
}
