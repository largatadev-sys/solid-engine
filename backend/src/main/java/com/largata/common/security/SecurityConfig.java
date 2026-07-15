package com.largata.common.security;

import com.largata.common.logging.LogContextFilter;
import com.largata.common.logging.UserContextFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * The app as an OAuth2 resource server (ADR-006): Firebase owns credentials and signs tokens; we
 * validate them offline and own the domain identity behind them.
 *
 * <p><strong>The decoder is Boot's, built from config.</strong> {@code
 * spring.security.oauth2.resourceserver.jwt.issuer-uri} (an env-var per Artifact 04 — the
 * largata-dev Firebase project now, a prod project at S0.4) is enough for Boot to autoconfigure a
 * {@link JwtDecoder} that fetches and caches the issuer's JWKS and validates signature, expiry and
 * issuer on every request. Hand-rolling that bean here would duplicate it for no gain.
 *
 * <p><strong>One code path, no test-aware branches.</strong> There is no profile-gated "accept
 * unsigned tokens" mode and there must never be one — that fork would live in the security config
 * whose correctness this whole story exists to establish. Tests override the {@link JwtDecoder}
 * bean with one trusting a test keypair (see {@code TestJwtSupport}); everything else here is the
 * code that runs in production.
 *
 * <p><strong>Filter ordering is load-bearing.</strong> {@link LogContextFilter} must run before this
 * chain so that a rejected request still carries a {@code traceId} when {@link
 * EnvelopeAuthenticationEntryPoint} renders its envelope. Boot orders {@code @Component}-registered
 * servlet filters ahead of the security chain by default; {@code UnauthenticatedContractIT} asserts
 * the observable consequence (a non-blank traceId in the 401 body) rather than trusting the
 * default, because the failure would otherwise be silent — a null traceId in an error the client
 * can no longer correlate to a log line.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(
            HttpSecurity http, EnvelopeAuthenticationEntryPoint entryPoint) throws Exception {
        return http
                // No browser session, no login form, no CSRF token: the client is a native app
                // holding a bearer token, and every request stands alone. CSRF protects
                // cookie-authenticated flows; there are none here, and leaving it on would reject
                // every POST from the mobile client for a threat that cannot exist.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .authorizeHttpRequests(
                        auth ->
                                auth
                                        // S0.1's contract: health is public. The CI stack-smoke job
                                        // and any future platform probe reach it without a token.
                                        .requestMatchers(HttpMethod.GET, "/v1/health")
                                        .permitAll()
                                        // Default-deny. Every endpoint added from S0.3 onward is
                                        // authenticated unless it is explicitly listed above —
                                        // forgetting to secure a new route is impossible, the way
                                        // forgetting the guard is impossible (Artifact 03).
                                        .anyRequest()
                                        .authenticated())
                // The entry point is set here as well as in exceptionHandling() and that is not
                // redundant: the resource-server DSL installs its own BearerTokenAuthenticationEntryPoint
                // for failures raised inside its filter — a rejected token answers through that one,
                // never through the global hook. Set in only one place, "no token" renders our
                // envelope while "expired token" renders Spring's empty 401 with a WWW-Authenticate
                // header, and the client gets two different shapes for one situation.
                .oauth2ResourceServer(
                        oauth2 -> oauth2.authenticationEntryPoint(entryPoint).jwt(Customizer.withDefaults()))
                // Inside the chain, after the bearer-token filter: userId is only knowable once a
                // token has been verified. Registered as a @Component it would run ahead of the
                // chain, find an empty security context, and silently log nothing forever.
                .addFilterAfter(new UserContextFilter(), BearerTokenAuthenticationFilter.class)
                // Both hooks, deliberately: the entry point answers "no/!bad credentials" (401),
                // the deny handler answers "valid credentials, insufficient rights" (403). Only the
                // first can fire today — nothing grants authorities yet — but wiring the second now
                // means the first 403-producing rule cannot silently emit a non-envelope body.
                .exceptionHandling(
                        e ->
                                e.authenticationEntryPoint(entryPoint)
                                        .accessDeniedHandler(
                                                (request, response, denied) ->
                                                        entryPoint.commence(request, response, null)))
                .build();
    }
}
