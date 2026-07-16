package com.largata.common.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS for browser clients of the <strong>dev environment only</strong> — the local Expo web server,
 * and (from S0.4) the founders' preview at its deployed origin.
 *
 * <p>Why this exists: the mobile clients (dev-build, release) are native and do not enforce CORS at
 * all — this is dead weight for them. It exists so the app can be opened in a browser via React
 * Native Web, which the browser's same-origin policy otherwise blocks.
 *
 * <p><strong>{@code @Profile("dev")} is the point of this class.</strong> It is not a convenience:
 * a permissive CORS policy on the production API would let any website script call it with a
 * traveler's credentials. Bound to the dev profile, the rule cannot reach prod by accident — prod
 * and preprod run no profile and therefore have no CORS configuration at all, which is correct for
 * a native-only client and is asserted by {@code CorsPolicyIT}.
 *
 * <p><strong>What changed at S0.4, and what deliberately did not.</strong> This class's previous
 * javadoc said the real web surface "will need a real, origin-pinned CORS policy for its actual
 * domain — decided then, as an ADR. This class is not that, and must not be promoted into it." That
 * stands. The founders' preview is not that surface: it is an interim demo on the dev environment
 * (S0.4 spec), and it lands here — inside the dev-only profile — precisely so it inherits the
 * containment rather than earning an exemption from it. The only change is *how* the origins arrive:
 * an env-var, because the preview's origin is deployment config and this file cannot know it. The
 * blast radius is unchanged; a hardcoded list and a configured list are equally dev-only when the
 * profile is what gates them.
 *
 * <p>The env-var is a list of exact origins and is never read as a wildcard: {@code allowedOrigins}
 * with {@code "*"} plus credentials is rejected by Spring anyway, but the deeper reason is that
 * "temporarily allow everything" is exactly the config that outlives its temporariness.
 */
@Configuration
@Profile("dev")
public class DevCorsConfig implements WebMvcConfigurer {

    /**
     * Exact browser origins allowed against the dev environment.
     *
     * <p>Defaults cover Expo's local web dev server, so a developer's {@code docker compose up}
     * needs no configuration. The deployed dev environment appends the preview's origin
     * ({@code https://preview.largata.com}) via this var — set in Railway's UI, never in the repo.
     */
    private final List<String> allowedOrigins;

    public DevCorsConfig(
            @Value("${largata.cors.allowed-origins:http://localhost:8081,http://localhost:8082,http://127.0.0.1:8081,http://127.0.0.1:8082}")
                    List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/v1/**")
                // Explicit origins, never "*": even in dev, a wildcard is a habit worth not forming.
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                .allowedHeaders("*");
    }
}
