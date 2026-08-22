

export type ConfirmWording = {
  title: string;
  body: string;

  confirmLabel: string;

  cancelLabel?: string;

  tone?: 'destructive' | 'accent';
};


export type ConfirmWith = (wording: ConfirmWording, onConfirm: () => void) => void;


export const CANCEL_LABEL = 'Cancel';


export const CONFIRM_DIALOG_TESTID = 'confirm-dialog';


export function confirmDestructiveMessage(what: string): ConfirmWording {
  return {
    title: `Delete ${what}?`,
    body: 'This cannot be undone.',
    confirmLabel: 'Delete',
  };
}


export function discardStagedEditsWording(): ConfirmWording {
  return {
    title: 'Discard unsaved changes?',
    body: 'Nothing you changed here has been saved yet. Leaving now loses it.',
    confirmLabel: 'Discard',
  };
}


export function removeMemberWording(handleLabel: string): ConfirmWording {
  return {
    title: `Remove ${handleLabel}?`,
    body: "They'll lose access to this trip. Their messages, votes, and photos stay.",
    confirmLabel: 'Remove',
  };
}


export function leaveTripWording(): ConfirmWording {
  return {
    title: 'Leave this trip?',
    body:
      "You'll lose access to the plan, chat, and photos. Everything you added stays with the group.",
    confirmLabel: 'Leave',
    cancelLabel: 'Not yet',
  };
}


export function offerOwnershipWording(handleLabel: string): ConfirmWording {
  return {
    title: `Offer ownership to ${handleLabel}?`,
    body: "They'll be asked to accept. Until then, you stay the owner.",
    confirmLabel: 'Offer',
    tone: 'accent',
  };
}


export function revokeOwnershipOfferWording(handleLabel: string): ConfirmWording {
  return {
    title: 'Revoke the ownership offer?',
    body: `${handleLabel} won't be able to accept it. You stay the owner.`,
    confirmLabel: 'Revoke',
  };
}


export function withdrawJoinRequestWording(): ConfirmWording {
  return {
    title: 'Withdraw your request?',
    body: "You'll need the invite link again to ask a second time.",
    confirmLabel: 'Withdraw',
  };
}


export function declineInvitationWording(inviterHandleLabel: string): ConfirmWording {
  return {
    title: 'Decline this invitation?',
    body: `${inviterHandleLabel} won't be notified. They can invite you again.`,
    confirmLabel: 'Decline',
  };
}


export function acceptOwnershipWording(tripTitle: string): ConfirmWording {
  return {
    title: `Become the owner of ${tripTitle}?`,
    body: 'You take over managing members, ownership and the trip itself. The current owner stays on as a member.',
    confirmLabel: 'Accept',
    tone: 'accent',
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
      'The public page comes down and editing thaws — the trip keeps the state it is in. Anything travelers left on the page is hidden, not deleted: publish again and it all comes back. Copies other travelers already made keep existing.',
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

export function changeTripCurrencyWording(): ConfirmWording {
  return {
    title: 'Change trip currency?',
    body: 'Prices keep their numbers: ₱1,500 becomes $1,500. Review your amounts after saving.',
    confirmLabel: 'Change currency',
  };
}
