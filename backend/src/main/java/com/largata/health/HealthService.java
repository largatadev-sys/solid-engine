package com.largata.health;

import com.largata.common.error.DependencyUnavailableException;
import com.largata.health.api.HealthResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;


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
            throw new DependencyUnavailableException("The service is temporarily unavailable.", e);
        }
        log.info("Health check passed");
        return new HealthResponse("ok");
    }
}
