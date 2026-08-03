

export type ConfirmWording = {
  title: string;
  body: string;

  confirmLabel: string;
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
    body:
      'It goes back to being a draft, which is how you edit it again. The page disappears and anything travelers left on it is hidden, not deleted — publish again and it all comes back. Copies other travelers already made keep existing.',
    confirmLabel: 'Unpublish',
  };
}


export function archiveTripWording(published: boolean): ConfirmWording {
  const page = published ? ' Your published page goes down until you unarchive.' : '';
  return {
    title: 'Archive this trip?',
    body: `It disappears for everyone else on it — they lose the trip from their list entirely — and nobody can edit it, including you.${page} Pending invites and ownership offers are cancelled. You can unarchive it at any time.`,
    confirmLabel: 'Archive',
  };
}


export function unarchiveTripWording(published: boolean): ConfirmWording {
  const page = published ? ' Your published page goes back up.' : '';
  return {
    title: 'Unarchive this trip?',
    body: `Everyone on the trip gets it back and can edit again.${page} Invites and offers cancelled by archiving are not restored.`,
    confirmLabel: 'Unarchive',
  };
}
