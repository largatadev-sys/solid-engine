package com.largata.identity;

import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class TravelerProvisioner {

    private final TravelerRepository travelers;

    TravelerProvisioner(TravelerRepository travelers) {
        this.travelers = travelers;
    }


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    Traveler insert(TravelerClaims claims) {
        return travelers.saveAndFlush(
                Traveler.provision(
                        claims.firebaseUid(),
                        claims.email(),
                        claims.displayName(),
                        claims.photoUrl(),
                        Instant.now()));
    }
}
