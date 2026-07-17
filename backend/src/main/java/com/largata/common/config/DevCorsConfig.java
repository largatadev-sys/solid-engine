package com.largata.common.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS for browser clients of the <strong>dev environment only</strong> — the local Expo web
 * server, the locally-served web export, and (from S0.4) the founders' preview at its deployed
 * origin.
 *
 * <p>Why this exists: the mobile clients (dev-build, release) are native and do not enforce CORS at
 * all — this is dead weight for them. It exists so the app can be opened in a browser, which the
 * browser's same-origin policy otherwise blocks.
 *
 * <p><strong>{@code @Profile("dev")} is the point of this class.</strong> A permissive CORS policy
 * on the production API would let any website script call it with a traveler's credentials. Bound to
 * the dev profile, the rule cannot reach prod by accident — prod and preprod run no profile, so this
 * bean does not exist there, {@code SecurityConfig}'s {@code .cors()} finds no source, and no CORS
 * is applied at all. {@code ProdCorsAbsentIT} asserts that.
 *
 * <p><strong>Why a {@link CorsConfigurationSource} bean, not a {@code WebMvcConfigurer} (changed at
 * S0.4).</strong> The previous version registered CORS mappings at the MVC layer, which runs
 * <em>after</em> Spring Security. That works for a public endpoint, but a browser's preflight
 * {@code OPTIONS} to a <em>secured</em> endpoint carries no token — Spring Security rejects it 401
 * before the MVC layer is ever reached, so the 401 has no CORS header and the browser blocks the
 * real request. (The same class of bug as the S0.2 filter-ordering gotcha: a thing that must cover
 * auth failures has to run <em>inside</em>/ahead of the security chain, not behind it.) Exposing
 * CORS as a {@code CorsConfigurationSource} bean lets {@code SecurityConfig} wire it into the chain
 * via {@code .cors()}, where Spring Security's own CORS filter short-circuits preflight {@code
 * OPTIONS} with a 200 <em>before</em> authentication. Invisible until a browser hit a secured
 * endpoint — which only happened once the web preview existed.
 *
 * <p>Origins are an exact list, never a wildcard: {@code "*"} plus credentials is rejected by the
 * spec anyway, but the deeper reason is that "temporarily allow everything" is exactly the config
 * that outlives its temporariness.
 */
@Configuration
@Profile("dev")
public class DevCorsConfig {

    /**
     * The CORS policy Spring Security applies on the dev profile. Defaults cover Expo's local web
     * dev server and the locally-served export ({@code localhost:3000}), so a developer needs no
     * configuration; the deployed dev environment appends the preview's origin via {@code
     * largata.cors.allowed-origins} in Railway's UI, never in the repo.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value(
                            "${largata.cors.allowed-origins:http://localhost:8081,http://localhost:8082,http://localhost:3000,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:3000}")
                    List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        // OPTIONS is included so Spring Security's CORS filter answers the preflight itself.
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        // No allowCredentials: the client authenticates with a bearer token in a header, never a
        // cookie, so credentialed CORS (and the wildcard restrictions it brings) is unnecessary.

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/v1/**", config);
        return source;
    }
}
