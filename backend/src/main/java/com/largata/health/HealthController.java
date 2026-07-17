package com.largata.health;

import com.largata.health.api.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Boundary layer (06b §2): parses/validates shape, calls the service, zero business branching.
 *
 * <p>Public by design (spec Q7): a health check that needs auth cannot distinguish "auth is
 * broken" from "everything is broken". The response is deliberately minimal — no version,
 * commit, uptime or component detail, which would be reconnaissance material.
 */
@RestController
@RequestMapping("/v1/health")
public class HealthController {

    private final HealthService healthService;

    HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    HealthResponse health() {
        // The service owns the rule and its result; the controller does no business branching
        // and does not invent the response (06b §2).
        return healthService.checkDatastore();
    }
}
