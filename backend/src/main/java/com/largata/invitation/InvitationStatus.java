package com.largata.invitation;

/**
 * An Invitation's lifecycle (02-domain-model, S1.2 grilling Q3): {@code PENDING} then exactly one of
 * five terminal states. Re-inviting after any terminal state is a new row — a status never returns to
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

    /**
     * <strong>The system invalidated it</strong> — nobody chose this (S1.9). Archiving a trip voids its
     * pending invitations, because an invitation into a frozen workspace can only ever fail: leaving it
     * {@code PENDING} would put an entry in an outsider's inbox whose one outcome is a refusal, which is
     * the dead-end this repo declines to advertise.
     *
     * <p><strong>Distinct from {@link #REVOKED} deliberately, and the distinction is the whole point of
     * a fifth value.</strong> {@code REVOKED} means the owner changed their mind about a person;
     * {@code VOIDED} means the trip changed underneath an invitation nobody reconsidered. Collapsing
     * them would permanently lose <em>why</em> a pending invitation ended — and under ADR-008 that loss
     * is not recoverable later. {@code OwnershipOfferStatus} made this same three-way split first
     * (revoked / declined / voided), for the same reason, at S1.6.
     *
     * <p><strong>Not resurrected on unarchive</strong> (S1.9 spec decision 13): an invitation is a
     * point-in-time act by the owner, and reviving it weeks later — possibly toward someone they have
     * since thought better of — is worse than re-inviting, which S1.5 established as the zero-code path.
     */
    VOIDED,

    EXPIRED
}
