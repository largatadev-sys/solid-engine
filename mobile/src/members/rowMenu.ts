import type { TripPosture } from './travelerSections';


export type RowMenuEntryKey = 'transfer' | 'revokeOffer' | 'remove' | 'leave';

export interface RowMenuEntry {
  readonly key: RowMenuEntryKey;
  readonly label: string;
  readonly destructive: boolean;
  readonly icon: 'transfer' | 'removeUser' | 'leave';
}

export const TRANSFER_OWNERSHIP_LABEL = 'Transfer ownership';
export const REVOKE_OFFER_LABEL = 'Revoke ownership offer';
export const REMOVE_FROM_TRIP_LABEL = 'Remove from trip';
export const LEAVE_TRIP_LABEL = 'Leave trip';


export interface RowMenuInput {
  readonly viewerIsOwner: boolean;
  readonly isYou: boolean;
  readonly rowIsOwner: boolean;
  readonly offerPendingOnRow: boolean;
  readonly posture: TripPosture;
}


export function rowMenuEntries(input: RowMenuInput): RowMenuEntry[] {
  if (input.isYou) {
    if (input.rowIsOwner) return [];
    return [
      { key: 'leave', label: LEAVE_TRIP_LABEL, destructive: true, icon: 'leave' },
    ];
  }

  if (input.posture !== 'open' || !input.viewerIsOwner || input.rowIsOwner) return [];

  const ownership: RowMenuEntry = input.offerPendingOnRow
    ? { key: 'revokeOffer', label: REVOKE_OFFER_LABEL, destructive: false, icon: 'transfer' }
    : { key: 'transfer', label: TRANSFER_OWNERSHIP_LABEL, destructive: false, icon: 'transfer' };

  return [
    ownership,
    { key: 'remove', label: REMOVE_FROM_TRIP_LABEL, destructive: true, icon: 'removeUser' },
  ];
}
