package com.largata.common.security;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A route no traveler can reach: authenticated, but requiring an authority nothing grants.
 *
 * <p>Exists only in test sources, for the same reason as {@link
 * com.largata.common.error.ThrowingTestController} — the production jar ships no endpoint whose job
 * is to be forbidden. It makes the 403 path reachable *now*, a story before any real rule produces
 * one (Artifact 03's guard, S0.3).
 *
 * <p>That gap is exactly how the bug this guards against survived: the deny handler was wired to
 * the 401 entry point, so every 403 would have rendered {@code 401 UNAUTHENTICATED}, and no test
 * could notice because no route could produce a 403. Untestable-by-absence is not the same as
 * correct.
 */
@RestController
public class ForbiddenTestController {

    static final String PATH = "/v1/test-forbidden";

    @TestConfiguration
    @EnableMethodSecurity
    public static class Config {
        @Bean
        ForbiddenTestController forbiddenTestController() {
            return new ForbiddenTestController();
        }
    }

    @GetMapping(PATH)
    @PreAuthorize("hasAuthority('NOBODY_HAS_THIS')")
    void forbidden() {
        // Never reached: @PreAuthorize rejects first, which is the point.
    }
}
