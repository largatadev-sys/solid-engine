package com.largata.identity;

import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inserts a new Traveler in a transaction of its own.
 *
 * <p><strong>This exists as a separate bean for one reason: {@code REQUIRES_NEW} has to be real.</strong>
 * Spring implements {@code @Transactional} with a proxy around the bean, so a call from inside
 * {@link TravelerService} to a method on itself would never pass through it — the annotation would
 * be decoration, and the failure it is there to prevent would happen anyway, silently, only under
 * concurrency. Crossing a bean boundary is what makes the proxy apply.
 *
 * <p>Why a separate transaction at all: losing the {@code firebase_uid} race raises a constraint
 * violation, which marks its transaction rollback-only. If that were the caller's transaction, the
 * recovery read ("fetch the row the winner just wrote") would fail too, and the handled race would
 * still surface as a 500. Isolated here, the violation rolls back this transaction only; the caller
 * is free to go and read the winner's committed row.
 */
@Component
class TravelerProvisioner {

    private final TravelerRepository travelers;

    TravelerProvisioner(TravelerRepository travelers) {
        this.travelers = travelers;
    }

    /**
     * {@code saveAndFlush}, not {@code save}: the insert must hit the database <em>here</em>, inside
     * this transaction, so a violation is raised where it can be caught. A deferred flush would
     * throw at commit time, outside the caller's try/catch, and the race would go unhandled.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    Traveler insert(TravelerClaims claims) {
        return travelers.saveAndFlush(
                Traveler.provision(claims.firebaseUid(), claims.email(), claims.displayName(), Instant.now()));
    }
}
