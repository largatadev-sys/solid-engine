package com.largata.support;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Mints Firebase-shaped JWTs for integration tests, signed by a keypair this JVM generates.
 *
 * <p><strong>Why this is not a weaker test than the real thing.</strong> A resource server never
 * calls Firebase: it validates tokens offline against the issuer's published public key (JWKS).
 * Swapping that public key for a test one swaps the <em>trust anchor</em> and nothing else — the
 * production security config, filter chain, signature/expiry/issuer validation, principal
 * resolution and every downstream layer run exactly as they do against Google's tokens. The only
 * fiction is whose key signed the token, which is the one part that is Google's job rather than
 * ours. The real seam ("Google signs tokens we can validate") is exercised once, by the human
 * device AC on the dev-build — see the spec's ACs → proof map.
 *
 * <p><strong>Why the decoder bean lives here, in test scope.</strong> Production
 * {@link com.largata.common.security.SecurityConfig} builds its decoder from the issuer URI and
 * has no test-aware branch: a profile-gated "accept unsigned tokens" mode in production security
 * code is exactly the fork this project refuses (spec, decision 2). Tests override the bean
 * instead.
 *
 * <p><strong>Why {@link TestConfiguration} and not a second context.</strong> {@code @Import}ing
 * this into the existing {@code @SpringBootTest} classes keeps every integration test on the one
 * cached context that {@link PostgresTestBase} anchors. A separate context (a new profile, a new
 * set of properties) would leave an earlier context's datasource pointing at a container that is
 * gone — the 30-second-timeout failure mode recorded in CLAUDE.md's gotchas and hit for real at
 * S0.1.
 */
public final class TestJwtSupport {

    /** Matches the issuer the app is configured with in tests (see application-test.yml). */
    public static final String ISSUER = "https://securetoken.google.com/largata-test";

    private static final KeyPair KEY_PAIR = generateKeyPair();

    private TestJwtSupport() {}

    /** A valid token for a Firebase UID, with no {@code name} claim (the email sign-up shape). */
    public static String tokenFor(String firebaseUid, String email) {
        return token(claims(firebaseUid).claim("email", email));
    }

    /** A valid token carrying a {@code name} claim (the Google sign-in shape). */
    public static String tokenWithName(String firebaseUid, String email, String name) {
        return token(claims(firebaseUid).claim("email", email).claim("name", name));
    }

    /** Well-formed and correctly signed, but past its expiry. */
    public static String expiredToken(String firebaseUid) {
        Instant expiredAt = Instant.now().minusSeconds(3600);
        return token(
                new JWTClaimsSet.Builder()
                        .subject(firebaseUid)
                        .issuer(ISSUER)
                        .audience("largata-test")
                        .issueTime(Date.from(expiredAt.minusSeconds(3600)))
                        .expirationTime(Date.from(expiredAt)));
    }

    /** Structurally a JWT, signed by a key nobody trusts — the forgery case. */
    public static String foreignlySignedToken(String firebaseUid) {
        try {
            SignedJWT jwt =
                    new SignedJWT(
                            new JWSHeader(JWSAlgorithm.RS256),
                            claims(firebaseUid).claim("email", "forged@example.com").build());
            jwt.sign(new RSASSASigner((RSAPrivateKey) generateKeyPair().getPrivate()));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("could not mint a foreignly signed token", e);
        }
    }

    private static JWTClaimsSet.Builder claims(String firebaseUid) {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder()
                .subject(firebaseUid)
                .issuer(ISSUER)
                .audience("largata-test")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)));
    }

    private static String token(JWTClaimsSet.Builder claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims.build());
            jwt.sign(new RSASSASigner((RSAPrivateKey) KEY_PAIR.getPrivate()));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("could not mint a test token", e);
        }
    }

    private static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException("could not generate a test keypair", e);
        }
    }

    /**
     * Replaces the production decoder — which would fetch Google's JWKS over the network — with one
     * trusting this class's public key. Everything else about validation is the real code path.
     */
    @TestConfiguration
    public static class Config {

        @Bean
        JwtDecoder jwtDecoder() {
            NimbusJwtDecoder decoder =
                    NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEY_PAIR.getPublic()).build();
            // The same validator production uses (issuer + expiry + not-before), built by the same
            // Spring factory — only the key source differs.
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
            return decoder;
        }
    }
}
