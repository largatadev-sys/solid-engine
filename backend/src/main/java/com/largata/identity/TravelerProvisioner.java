package com.largata.identity;

import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class TravelerProvisioner {

    private final TravelerRepository travelers;
    private final VanityNumberAllocator vanityNumbers;

    TravelerProvisioner(TravelerRepository travelers, VanityNumberAllocator vanityNumbers) {
        this.travelers = travelers;
        this.vanityNumbers = vanityNumbers;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    Traveler insert(TravelerClaims claims) {
        return travelers.saveAndFlush(
                Traveler.provision(
                        claims.firebaseUid(),
                        claims.email(),
                        claims.displayName(),
                        claims.photoUrl(),
                        Instant.now(),
                        vanityNumbers.allocate()));
    }
}
