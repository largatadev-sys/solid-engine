package com.largata.identity;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * The identity module's one entry point (ADR-002: modules are reached by service interface, never
 * by another module's tables).
 */
@Service
public class TravelerService {

    private static final Logger log = LoggerFactory.getLogger(TravelerService.class);

    private final TravelerRepository travelers;
    private final TravelerProvisioner provisioner;
    private final Analytics analytics;

    TravelerService(TravelerRepository travelers, TravelerProvisioner provisioner, Analytics analytics) {
        this.travelers = travelers;
        this.provisioner = provisioner;
        this.analytics = analytics;
    }

    /**
     * Resolves the domain Traveler behind a verified Firebase identity, creating it on first
     * contact.
     *
     * <p><strong>Called at principal resolution, not from an endpoint</strong> (spec, decision 6a).
     * Provisioning is a consequence of authenticating, so every authenticated endpoint gets a
     * Traveler on first contact and none of them has to remember to ask. The rejected alternative —
     * "the client calls /me first" — is a promise the client keeps until a reinstall, a cached
     * token, or S0.3's create-itinerary firing before a bootstrap call resolves; then it is a 500
     * on a missing row. Same reasoning as Artifact 03's guard: structural, not disciplinary.
     *
     * <p><strong>Idempotency belongs to the database</strong> (decision 6b). The insert can lose a
     * race — two first calls from the same traveler both find nothing and both try to insert — and
     * that is fine: {@code firebase_uid} is UNIQUE, so one wins and the loser's violation is caught
     * here and answered by re-reading the winner's row. Java cannot close this gap by checking
     * harder; two threads both see "missing" at the same instant.
     *
     * <p><strong>Not {@code @Transactional}</strong>, deliberately, and this is load-bearing: a
     * constraint violation marks its transaction rollback-only, so if the failed insert and the
     * recovery read shared one transaction, the read would fail too and the race would surface as a
     * 500. Each step below therefore runs in its own transaction — the reads via Spring Data's
     * defaults, the insert via {@link TravelerProvisioner}, which is a separate bean precisely so
     * that its transaction is a real one. (A {@code REQUIRES_NEW} method on this class would be
     * invisible: self-invocation bypasses the proxy that implements it — the annotation would read
     * as protection while doing nothing at all.)
     *
     * @param claims the verified token's claims — never an unverified header
     */
    public Traveler getOrProvision(TravelerClaims claims) {
        return travelers
                .findByFirebaseUid(claims.firebaseUid())
                .orElseGet(() -> insertOrReadWinner(claims));
    }

    private Traveler insertOrReadWinner(TravelerClaims claims) {
        try {
            Traveler provisioned = provisioner.insert(claims);
            log.info("Traveler provisioned: id={}", provisioned.id());
            // The funnel's first stage (register #2's default set, backfilled at S0.3): emitted here
            // rather than in the resolver because this is the only line that runs when a Traveler is
            // genuinely new. The race-loser below re-reads an existing row and emits nothing — two
            // signups for one traveler would be a lie about the one number this event exists to give.
            // Emitted after the provisioner's own transaction has committed (it is a separate bean
            // with REQUIRES_NEW — see the note above), so this reports a row that survives.
            analytics.emit(
                    AnalyticsEvent.named("traveler_signed_up").with("travelerId", provisioned.id()).build());
            return provisioned;
        } catch (DataIntegrityViolationException lostTheRace) {
            // Someone else inserted this uid between our read and our write. Their row is the row —
            // and their transaction has committed, so this read finds it. Verified by deleting this
            // catch and watching concurrentFirstContactsYieldExactlyOneTraveler fail on
            // "duplicate key value violates unique constraint traveler_firebase_uid_key": the race
            // is real, not theoretical.
            return travelers.findByFirebaseUid(claims.firebaseUid()).orElseThrow(() -> lostTheRace);
        }
    }
}
