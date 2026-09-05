import type { ProfileVisibility } from '../types/api';


export type AccountRow = 'edit-profile' | 'private-profile' | 'follow-requests' | 'sign-out';


export function accountRows(visibility: ProfileVisibility): AccountRow[] {
  const rows: AccountRow[] = ['edit-profile', 'private-profile'];
  if (visibility === 'private') {
    rows.push('follow-requests');
  }
  rows.push('sign-out');
  return rows;
}


export function confirmsFlip(from: ProfileVisibility): boolean {
  return from === 'private';
}


export function flipped(from: ProfileVisibility): ProfileVisibility {
  return from === 'private' ? 'public' : 'private';
}
