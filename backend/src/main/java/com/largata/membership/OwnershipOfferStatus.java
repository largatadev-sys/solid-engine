package com.largata.membership;

/**
 * An {@link OwnershipOffer}'s lifecycle state (S1.6 §4) — {@code PENDING} and four terminal ends.
 *
 * <p><strong>The names are stored, not just held</strong> ({@code @Enumerated(STRING)}), and V9's
 * partial unique index tests {@code 'PENDING'} literally. That makes this enum's spelling a contract
 * with SQL, not an internal detail: rename a constant and the index silently stops matching anything —
 * enforcing nothing, with no error, ever (the S1.1 {@code WHERE role = 'owner'} near-miss).
 * {@code OwnershipOfferStorageIT} pins it.
 *
 * <p><strong>Three ways to end that are not one way</strong>, which is why this has five constants and
 * not three: {@link #REVOKED} is the owner retracting, {@link #DECLINED} is the target refusing, {@link
 * #VOIDED} is the system dissolving the offer because the target left the trip. They differ in who
 * acted, and the analytics events say so; collapsing them would make the funnel attribute a departure
 * to the owner's hand.
 */
public enum OwnershipOfferStatus {

    /** Live: awaiting the target's answer. At most one per workspace (V9's partial unique index). */
    PENDING,

    /** The target took the crown — the transfer executed in the same transaction (S1.6 §6). */
    ACCEPTED,

    /** The target refused. The owner may offer again, to them or anyone else. */
    DECLINED,

    /** The owner retracted it — required before offering to somebody else (no silent supersede). */
    REVOKED,

    /**
     * The target left the trip (or was removed) while the offer stood, so it dissolved with their
     * membership — S1.6 §5, written inside S1.5's departure transaction.
     */
    VOIDED
}
