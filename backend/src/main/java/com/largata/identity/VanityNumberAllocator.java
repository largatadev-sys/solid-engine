package com.largata.identity;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
class VanityNumberAllocator {

    private static final int COHORT_SIZE = 10_000;

    private final VanityPoolRepository pool;
    private final Clock clock;
    private final LocalDate launchDate;

    VanityNumberAllocator(
            VanityPoolRepository pool,
            Clock clock,
            @Value("${largata.vanity.launch-date:#{null}}") LocalDate launchDate) {
        this.pool = pool;
        this.clock = clock;
        this.launchDate = launchDate;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    VanityNumber allocate() {
        short cohort = VanityNumber.cohortAt(Instant.now(clock), launchDate);
        return new VanityNumber(cohort, claimFrom(cohort));
    }


    private int claimFrom(short cohort) {
        for (int attempt = 0; attempt < 3; attempt++) {
            if (pool.sizeOf(cohort) == 0) {
                pool.generate(cohort, 0, COHORT_SIZE - 1);
            }
            Integer drawn = pool.nextUnclaimed(cohort).orElse(null);
            if (drawn == null) {
                extend(cohort);
                drawn = pool.nextUnclaimed(cohort).orElse(null);
            }
            if (drawn != null && pool.markClaimed(cohort, drawn) == 1) {
                return drawn;
            }
        }
        throw new IdentityExceptions.VanityPoolUnavailableException();
    }


    private void extend(short cohort) {
        int from = pool.highestNumberIn(cohort) + 1;
        pool.generate(cohort, from, from + COHORT_SIZE - 1);
    }
}
