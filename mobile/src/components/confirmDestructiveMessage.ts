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

/**
 * The owner starting the trip (S1.7) — `draft → active`.
 *
 * The gentlest confirm in the set, and it earns its place only because the transition is one-way: the
 * body says so plainly rather than implying danger the act does not carry. Nothing is lost by starting
 * a trip — planning continues exactly as before — so the copy answers the only real question, which is
 * "can I undo this if I tapped it by accident".
 */
export function startTripWording(): ConfirmWording {
  return {
    title: 'Start this trip?',
    body: "It moves from draft to active. You can keep editing the plan, but a trip can't go back to draft.",
    confirmLabel: 'Start',
  };
}

/**
 * The owner marking the trip complete (S1.7) — `active → completed`.
 *
 * Names the forward-only rule *and* what completion does not do. Both halves matter: an owner
 * hesitating here is usually asking "does this lock the trip?" (it does not — plan edits, members and
 * settling all continue; canon's afterlife is a working one), and the genuinely irreversible part is
 * the state itself. Saying only "this cannot be undone" would be true and misleading.
 */
export function completeTripWording(): ConfirmWording {
  return {
    title: 'Mark this trip complete?',
    body: "The plan and everyone on it stay as they are — but a completed trip can't be reopened.",
    confirmLabel: 'Complete',
  };
}

/**
 * The owner archiving a trip (S1.9).
 *
 * <p>Leads with <strong>reversible</strong>, because that is the fact the traveler most needs and the
 * one the word "archive" does not settle on its own — in this product it is the *only* end-of-life act
 * (permanent deletion is parked), so nothing here destroys anything. It then names the two real
 * consequences, both of which land on other people: the trip freezes for everyone, and anything pending
 * against it — invitations, an ownership offer — is dissolved and will not come back on unarchive. That
 * last clause is the one an owner would otherwise learn by surprise.
 */
export function archiveTripWording(): ConfirmWording {
  return {
    title: 'Archive this trip?',
    body: 'It leaves your trip list and nobody can edit it — for everyone on it, not just you. Pending invites and ownership offers are cancelled. You can unarchive it at any time.',
    confirmLabel: 'Archive',
  };
}

/**
 * The owner bringing an archived trip back (S1.9).
 *
 * <p>Not destructive at all, and the copy says so — it exists for symmetry with archive rather than as
 * a last chance, so it is short. It names the one thing that does <em>not</em> come back, because the
 * natural expectation of "unarchive" is that everything returns exactly as it was.
 */
export function unarchiveTripWording(): ConfirmWording {
  return {
    title: 'Unarchive this trip?',
    body: 'It returns to your trip list and everyone on it can edit again. Invites and offers cancelled by archiving are not restored.',
    confirmLabel: 'Unarchive',
  };
}
