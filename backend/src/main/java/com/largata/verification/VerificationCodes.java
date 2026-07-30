package com.largata.verification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import org.springframework.stereotype.Component;


@Component
class VerificationCodes {

    static final int DIGITS = 6;

    private static final int UPPER_BOUND = 1_000_000;

    private final SecureRandom random = new SecureRandom();


    String mint() {
        return "%06d".formatted(random.nextInt(UPPER_BOUND));
    }


    String hash(String code) {
        return HexFormat.of().formatHex(digest().digest(code.getBytes(StandardCharsets.UTF_8)));
    }


    boolean matches(String submitted, String storedHash) {
        return MessageDigest.isEqual(
                hash(submitted).getBytes(StandardCharsets.UTF_8), storedHash.getBytes(StandardCharsets.UTF_8));
    }


    static boolean isWellFormed(String submitted) {
        if (submitted == null || submitted.length() != DIGITS) {
            return false;
        }
        return submitted.chars().allMatch(Character::isDigit);
    }

    private static MessageDigest digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException everyJvmHasIt) {
            throw new IllegalStateException("SHA-256 is missing from this JVM", everyJvmHasIt);
        }
    }
}
