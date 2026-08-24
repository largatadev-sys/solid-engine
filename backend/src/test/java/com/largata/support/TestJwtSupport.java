package com.largata.support;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import org.springframework.boot.test.context.TestConfiguration;


public final class TestJwtSupport {


    public static final String ISSUER = "https://securetoken.google.com/largata-test";

    private static final KeyPair KEY_PAIR = generateKeyPair();
    private static final HttpServer JWKS_SERVER = startJwksServer();

    private TestJwtSupport() {}


    public static String jwksUrl() {
        return "http://localhost:" + JWKS_SERVER.getAddress().getPort() + "/jwks";
    }


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


    public static String googleToken(String firebaseUid, String email, String name, String picture) {
        return token(
                claims(firebaseUid)
                        .claim("email", email)
                        .claim("email_verified", true)
                        .claim("name", name)
                        .claim("picture", picture));
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

    private static HttpServer startJwksServer() {
        try {
            RSAKey key = new RSAKey.Builder((RSAPublicKey) KEY_PAIR.getPublic()).build();
            byte[] body = new JWKSet(key).toString().getBytes(StandardCharsets.UTF_8);

            HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
            server.createContext(
                    "/jwks",
                    exchange -> {
                        exchange.getResponseHeaders().add("Content-Type", "application/json");
                        exchange.sendResponseHeaders(200, body.length);
                        exchange.getResponseBody().write(body);
                        exchange.close();
                    });
            server.start();
            return server;
        } catch (Exception e) {
            throw new IllegalStateException("could not start the test JWKS server", e);
        }
    }


    @TestConfiguration
    public static class Config {}
}
