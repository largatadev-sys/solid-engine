package com.largata.common.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import java.net.URI;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;


@Configuration
public class JwtDecoderConfig {

    private static final Duration CACHE_REFRESH_TIMEOUT = Duration.ofSeconds(15);

    @Bean
    JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer,
            @Value("${largata.auth.jwks.uri}") String jwkSetUri,
            @Value("${largata.auth.jwks.cache-ttl:PT15M}") Duration cacheTtl,
            @Value("${largata.auth.jwks.refresh-ahead:PT30S}") Duration refreshAhead,
            @Value("${largata.auth.jwks.outage-tolerance:PT8H}") Duration outageTolerance)
            throws Exception {
        long rateLimit = Math.min(Duration.ofSeconds(30).toMillis(), cacheTtl.toMillis() / 2);
        long refreshTimeout = Math.min(CACHE_REFRESH_TIMEOUT.toMillis(), cacheTtl.toMillis() / 4);
        JWKSource<SecurityContext> keys =
                JWKSourceBuilder.<SecurityContext>create(URI.create(jwkSetUri).toURL())
                        .retrying(true)
                        .rateLimited(rateLimit)
                        .cache(cacheTtl.toMillis(), refreshTimeout)
                        .refreshAheadCache(refreshAhead.toMillis(), true)
                        .outageTolerant(outageTolerance.toMillis())
                        .build();

        DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keys));
        processor.setJWTClaimsSetVerifier((claims, context) -> {});

        NimbusJwtDecoder decoder = new NimbusJwtDecoder(processor);
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        return decoder;
    }
}
