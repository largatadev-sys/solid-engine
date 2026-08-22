import { HANDLE_SEARCH_MIN_LENGTH } from '../identity/handleRules';

export type AddSheetState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'looking' }
  | { readonly kind: 'invitable'; readonly handle: string }
  | { readonly kind: 'pending'; readonly handle: string }
  | { readonly kind: 'member'; readonly handle: string }
  | { readonly kind: 'noResults'; readonly query: string };


export const SEARCH_PLACEHOLDER = 'Search by @handle';
export const SEARCH_ACTION_LABEL = 'Search for this handle';
export const INVITE_LABEL = 'Invite';
export const INVITED_GHOST_LABEL = 'Invited';
export const ON_THIS_TRIP_LABEL = 'On this trip';
export const SHARE_LINK_LABEL = 'Copy invite link';
export const SHARE_LINK_SUB = 'Anyone with the link can request to join';
export const NOT_ON_LARGATA = 'They might not be on Largata yet.';


export function normalizeHandleQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}


export function isSearchable(raw: string): boolean {
  return normalizeHandleQuery(raw).length >= HANDLE_SEARCH_MIN_LENGTH;
}


export function noOneMatchesLabel(query: string): string {
  return `No one matches "@${query}"`;
}


export interface LookupInput {
  readonly query: string;
  readonly looking: boolean;
  readonly found: { readonly travelerId: string; readonly handle: string | null } | null;
  readonly notFound: boolean;
  readonly memberIds: readonly string[];
  readonly invitedIds: readonly string[];
}


export function addSheetState(input: LookupInput): AddSheetState {
  const query = normalizeHandleQuery(input.query);
  if (query === '') return { kind: 'idle' };
  if (input.looking) return { kind: 'looking' };

  if (input.found !== null) {
    const handle = input.found.handle ?? query;
    if (input.memberIds.includes(input.found.travelerId)) return { kind: 'member', handle };
    if (input.invitedIds.includes(input.found.travelerId)) return { kind: 'pending', handle };
    return { kind: 'invitable', handle };
  }

  if (input.notFound) return { kind: 'noResults', query };

  return { kind: 'looking' };
}


export function foundCardVisible(state: AddSheetState): boolean {
  return state.kind === 'invitable' || state.kind === 'pending' || state.kind === 'member';
}


export function linkRowVisible(state: AddSheetState): boolean {
  return state.kind !== 'noResults';
}


export function pivotVisible(state: AddSheetState): boolean {
  return state.kind === 'noResults';
}
