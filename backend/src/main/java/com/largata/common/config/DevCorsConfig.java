package com.largata.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS for local browser-based development only.
 *
 * <p>Why this exists: the mobile clients (Expo Go, dev-build, release) are native and do not
 * enforce CORS at all — this is dead weight for them. It exists so the app can be opened in a
 * browser via React Native Web during development, which is otherwise blocked by the browser's
 * same-origin policy.
 *
 * <p><strong>{@code @Profile("dev")} is the point of this class.</strong> It is not a convenience:
 * a permissive CORS policy on the production API would let any website script call it with a
 * traveler's credentials. Bound to the dev profile, the rule cannot reach prod by accident —
 * prod simply has no CORS configuration, which is correct for a native-only client.
 *
 * <p>When the read-only web surface arrives (a backlog epic), it will need a real, origin-pinned
 * CORS policy for its actual domain — decided then, as an ADR. This class is not that, and must
 * not be promoted into it.
 */
@Configuration
@Profile("dev")
public class DevCorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/v1/**")
                // Expo's web dev server. Explicit origins, not "*": even in dev, a wildcard is a
                // habit worth not forming.
                .allowedOrigins(
                        "http://localhost:8081",
                        "http://localhost:8082",
                        "http://127.0.0.1:8081",
                        "http://127.0.0.1:8082")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("*");
    }
}
