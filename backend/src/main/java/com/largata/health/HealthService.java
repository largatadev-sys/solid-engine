package com.largata.health;

import com.largata.common.error.DependencyUnavailableException;
import com.largata.health.api.HealthResponse;
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

    public HealthResponse checkDatastore() {
        try {
            healthRepository.ping();
        } catch (DataAccessException e) {
            // Translate, do not log: P2's floor is "never log the same error twice", and the
            // global handler logs every DomainException. Catch-log-and-rethrow here would emit
            // two lines for one outage — the exact pattern P2's check greps for. The cause rides
            // on the exception so the handler can log it once, with the traceId attached.
            throw new DependencyUnavailableException("The service is temporarily unavailable.", e);
        }
        log.info("Health check passed");
        return new HealthResponse("ok");
    }
}
