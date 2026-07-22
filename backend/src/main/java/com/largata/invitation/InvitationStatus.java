package com.largata.invitation;

/**
 * An Invitation's lifecycle (02-domain-model, S1.2 grilling Q3): {@code PENDING} then exactly one of
 * four terminal states. Re-inviting after any terminal state is a new row — a status never returns to
 * {@code PENDING}.
 *
 * <p><strong>{@code EXPIRED} is a behaviour before it is a stored value.</strong> The 14-day window
 * (grilling Q4) is checked lazily against {@code expires_at} at read and transition time; a row past
 * its window behaves expired whether or not its {@code status} has been flipped. The value exists so
 * that a flip can be recorded, but nothing depends on the flip having happened.
 *
 * <p>{@code @Enumerated(STRING)} writes the <em>name</em> ({@code PENDING}), which is the value V6's
 * partial unique index tests. Change the spelling and the index silently stops matching; {@code
 * InvitationStorageIT} pins it (the S1.1 {@code WHERE role = 'owner'} lesson).
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    DECLINED,
    REVOKED,
    EXPIRED
}
