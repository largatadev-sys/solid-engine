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


public final class TestJwtSupport {


    public static final String ISSUER = "https://securetoken.google.com/largata-test";

    private static final KeyPair KEY_PAIR = generateKeyPair();

    private TestJwtSupport() {}


    public static String tokenFor(String firebaseUid, String email) {
        return token(claims(firebaseUid).claim("email", email));
    }


    public static String tokenWithName(String firebaseUid, String email, String name) {
        return token(claims(firebaseUid).claim("email", email).claim("name", name));
    }


    public static String verifiedToken(String firebaseUid, String email) {
        return token(claims(firebaseUid).claim("email", email).claim("email_verified", true));
    }


    public static String unverifiedToken(String firebaseUid, String email) {
        return token(claims(firebaseUid).claim("email", email).claim("email_verified", false));
    }


    public static String verifiedTokenWithName(String firebaseUid, String email, String name) {
        return token(claims(firebaseUid).claim("email", email).claim("email_verified", true).claim("name", name));
    }


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


    @TestConfiguration
    public static class Config {

        @Bean
        JwtDecoder jwtDecoder() {
            NimbusJwtDecoder decoder =
                    NimbusJwtDecoder.withPublicKey((RSAPublicKey) KEY_PAIR.getPublic()).build();
            decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
            return decoder;
        }
    }
}
