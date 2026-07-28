/**
 * The wording of a confirm dialog, shared by both platform forks of {@code confirmDestructive} so the
 * phrasing cannot drift between the app and the web preview — the {@code comingSoonMessage} pattern,
 * for the same reason.
 */

export type ConfirmWording = {
  title: string;
  body: string;
  /**
   * The affirmative button's label — `Delete`, `Remove`, `Leave`.
   *
   * Never `OK`: on a dialog whose whole job is a last chance, the dangerous button should name the act
   * so it is not the reflexive tap. It is part of the wording (not the caller's styling) because the
   * web fork folds it into `window.confirm`, which offers no button labels at all — so the *word* has
   * to survive somewhere both platforms honour, or the two dialogs would say different things.
   */
  confirmLabel: string;
};

/** The signature both platform forks implement — see the fork files for why this is declared, not inferred. */
export type ConfirmWith = (wording: ConfirmWording, onConfirm: () => void) => void;

/** Deleting a thing outright: a day, an activity (S1.3). */
export function confirmDestructiveMessage(what: string): ConfirmWording {
  return {
    title: `Delete ${what}?`,
    body: 'This cannot be undone.',
    confirmLabel: 'Delete',
  };
}

/**
 * The owner removing somebody from a trip (S1.5).
 *
 * Says the reversible part out loud. Removal destroys the membership row, so it is irreversible as a
 * *record* — but the person can be invited back, and an owner hesitating over a tap deserves to know
 * that rather than to guess.
 */
export function removeMemberWording(displayName: string): ConfirmWording {
  return {
    title: `Remove ${displayName}?`,
    body: 'They lose access to this trip. You can invite them again later.',
    confirmLabel: 'Remove',
  };
}

/**
 * A member leaving a trip of their own accord (S1.5).
 *
 * Names the cost (the plan goes away) and the asymmetry: there is no self-service way back, because
 * invitation is the only door into a workspace. Leaving is the one destructive act here whose consequence
 * lands on the person tapping, so the copy is about what *they* lose.
 */
export function leaveTripWording(): ConfirmWording {
  return {
    title: 'Leave this trip?',
    body: 'You lose access to the plan. Only the trip owner can invite you back.',
    confirmLabel: 'Leave',
  };
}

/**
 * The owner offering ownership to a member (S1.6).
 *
 * <p>Names what the owner is *giving up*, not merely what they are doing. The tap itself is safe and
 * reversible — an offer can be revoked, and the other person must accept — so the dialog's job is not
 * "are you sure" but "you understand this ends with you not being the owner". It says the offer must be
 * accepted, because the single most likely misreading is that tapping this hands the trip over there
 * and then.
 */
export function offerOwnershipWording(displayName: string): ConfirmWording {
  return {
    title: `Offer ownership to ${displayName}?`,
    body: 'They choose whether to accept. If they do, they become the owner and you become a member.',
    confirmLabel: 'Offer',
  };
}

/** The owner retracting an offer before it is answered (S1.6). */
export function revokeOwnershipOfferWording(displayName: string): ConfirmWording {
  return {
    title: `Withdraw the offer to ${displayName}?`,
    body: 'You stay the owner. You can offer ownership again at any time.',
    confirmLabel: 'Withdraw',
  };
}

/**
 * The offeree accepting the crown (S1.6).
 *
 * <p>Names the authority being *taken on*, in the concrete terms of what only an owner can do, because
 * accepting is the one act in this flow that cannot be undone unilaterally: the new owner can hand it
 * back only if the other person accepts in turn. That asymmetry is exactly what a confirm exists for.
 */
export function acceptOwnershipWording(tripTitle: string): ConfirmWording {
  return {
    title: `Become the owner of ${tripTitle}?`,
    body: 'You take over managing members, ownership and the trip itself. The current owner stays on as a member.',
    confirmLabel: 'Accept',
  };
}

/** The offeree refusing the crown (S1.6) — nothing moves, and it can be offered again. */
export function declineOwnershipWording(): ConfirmWording {
  return {
    title: 'Decline ownership?',
    body: 'The current owner keeps the trip. They can offer it to you again later.',
    confirmLabel: 'Decline',
  };
}
