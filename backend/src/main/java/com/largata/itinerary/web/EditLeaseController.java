package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.EditLeaseService;
import com.largata.itinerary.api.EditLeaseResponse;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The edit-lock endpoints (S1.4, ADR-014) — acquiring, renewing and releasing the single-writer lease
 * on an itinerary's plan.
 *
 * <p>Transport only, like the other itinerary controllers: the guard resolves a {@link Membership}
 * from the itinerary id and the service does the rest. <strong>Guard-first on every operation</strong>
 * — a non-member is 404-masked before learning anything about the lock (spec AC 9's ordering), and
 * only a resolved member ever reaches the lease logic. No owner check: the lock is role-blind (any
 * member holds it, the owner is locked out while they do — ADR-014).
 *
 * <p>Under {@code /edit-lock}, itinerary-addressed, workspace id off the wire (the S1.2/S1.3
 * convention). POST acquires, POST {@code /renew} renews, DELETE releases — a denied acquire or renew
 * is a 409 ({@code EDIT_LOCKED}) whose message names the holder, translated at the one boundary.
 */
@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/edit-lock")
class EditLeaseController {

    private final EditLeaseService leases;
    private final AuthorizationGuard guard;

    EditLeaseController(EditLeaseService leases, AuthorizationGuard guard) {
        this.leases = leases;
        this.guard = guard;
    }

    /**
     * Acquires (or re-acquires / renews-by-re-entry) the lock. 409 if another member holds it live.
     *
     * <p><strong>200, not 201, and deliberately so (P9).</strong> 05-api-conventions maps POST-that-
     * creates to 201, but acquire is an <em>idempotent upsert</em>, not resource creation: there is at
     * most one lease per itinerary (V8's PK), and re-acquiring returns the same lease renewed rather
     * than minting a second. The resource the client cares about is "the lock on this itinerary", which
     * exists conceptually whether or not a row is currently present — so acquire is a state transition
     * on it (like a PUT), and 200 is the honest status. (POST rather than PUT only because the client
     * sends no representation — the holder is the authenticated caller, not a body.)
     */
    @PostMapping
    EditLeaseResponse acquire(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return EditLeaseResponse.of(leases.acquire(member));
    }

    /** Renews the caller's own live lease — the heartbeat. 409 if the caller no longer holds it. */
    @PostMapping("/renew")
    EditLeaseResponse renew(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return EditLeaseResponse.of(leases.renew(member));
    }

    /** Releases the caller's own lease. Idempotent — 204 whether or not a lease was actually held. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void release(@CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        leases.release(member);
    }
}
