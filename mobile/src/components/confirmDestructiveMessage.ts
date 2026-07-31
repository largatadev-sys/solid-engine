

export type ConfirmWording = {
  title: string;
  body: string;

  confirmLabel: string;

  tone?: 'destructive' | 'default';
};


export type ConfirmWith = (wording: ConfirmWording, onConfirm: () => void) => void;


export function confirmDestructiveMessage(what: string): ConfirmWording {
  return {
    title: `Delete ${what}?`,
    body: 'This cannot be undone.',
    confirmLabel: 'Delete',
  };
}


export function removeMemberWording(displayName: string): ConfirmWording {
  return {
    title: `Remove ${displayName}?`,
    body: 'They lose access to this trip. You can invite them again later.',
    confirmLabel: 'Remove',
  };
}


export function leaveTripWording(): ConfirmWording {
  return {
    title: 'Leave this trip?',
    body: 'You lose access to the plan. Only the trip owner can invite you back.',
    confirmLabel: 'Leave',
  };
}


export function offerOwnershipWording(displayName: string): ConfirmWording {
  return {
    title: `Offer ownership to ${displayName}?`,
    body: 'They choose whether to accept. If they do, they become the owner and you become a member.',
    confirmLabel: 'Offer',
  };
}


export function revokeOwnershipOfferWording(displayName: string): ConfirmWording {
  return {
    title: `Withdraw the offer to ${displayName}?`,
    body: 'You stay the owner. You can offer ownership again at any time.',
    confirmLabel: 'Withdraw',
  };
}


export function acceptOwnershipWording(tripTitle: string): ConfirmWording {
  return {
    title: `Become the owner of ${tripTitle}?`,
    body: 'You take over managing members, ownership and the trip itself. The current owner stays on as a member.',
    confirmLabel: 'Accept',
  };
}


export function declineOwnershipWording(): ConfirmWording {
  return {
    title: 'Decline ownership?',
    body: 'The current owner keeps the trip. They can offer it to you again later.',
    confirmLabel: 'Decline',
  };
}


export function unpublishTripWording(): ConfirmWording {
  return {
    title: 'Unpublish this trip?',
    body: 'The public page disappears. Anything travelers left on it is hidden, not deleted, and comes back if you publish again. Copies other travelers already made keep existing.',
    confirmLabel: 'Unpublish',
  };
}


export function archiveTripWording(): ConfirmWording {
  return {
    title: 'Archive this trip?',
    body: 'It leaves your trip list and nobody can edit it — for everyone on it, not just you. Pending invites and ownership offers are cancelled. You can unarchive it at any time.',
    confirmLabel: 'Archive',
  };
}


export function unarchiveTripWording(): ConfirmWording {
  return {
    title: 'Unarchive this trip?',
    body: 'It returns to your trip list and everyone on it can edit again. Invites and offers cancelled by archiving are not restored.',
    confirmLabel: 'Unarchive',
  };
}
