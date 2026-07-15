package com.largata.health;

import com.largata.common.error.DependencyUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * Logic layer (06b §2): owns the rules. Here the only rule is "the datastore must answer".
 *
 * <p>Infrastructure exceptions are translated to domain errors <em>in the service layer</em>
 * (06b §3) — nothing raw ever reaches a controller or the client.
 */
@Service
public class HealthService {

    private static final Logger log = LoggerFactory.getLogger(HealthService.class);

    private final HealthRepository healthRepository;

    HealthService(HealthRepository healthRepository) {
        this.healthRepository = healthRepository;
    }

    public void verifyDependencies() {
        try {
            healthRepository.ping();
        } catch (DataAccessException e) {
            // Warn (not error): the global handler owns error-severity logging (06b §4).
            // The cause is logged for the operator; the client sees only the envelope.
            log.warn("Health check failed: datastore unreachable", e);
            throw new DependencyUnavailableException("The service is temporarily unavailable.");
        }
        log.info("Health check passed");
    }
}
