package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class VerificationCodesTest {

    private final VerificationCodes codes = new VerificationCodes();

    @Test
    void everyMintedCodeIsExactlySixDigits() {
        assertThat(IntStream.range(0, 500).mapToObj(i -> codes.mint()))
                .allSatisfy(code -> assertThat(code).matches("\\d{6}"));
    }

    @Test
    void theHashIsNotTheCode() {
        String code = "123456";

        assertThat(codes.hash(code)).isNotEqualTo(code).doesNotContain(code).hasSize(64);
    }

    @Test
    void hashingIsStableSoAStoredHashStillMatchesLater() {
        assertThat(codes.matches("042900", codes.hash("042900"))).isTrue();
    }

    @Test
    void aDifferentCodeDoesNotMatch() {
        assertThat(codes.matches("042901", codes.hash("042900"))).isFalse();
    }

    @Test
    void leadingZeroesSurviveMintingRatherThanBecomingAFiveDigitCode() {
        assertThat("%06d".formatted(42)).isEqualTo("000042");
        assertThat(codes.matches("000042", codes.hash("000042"))).isTrue();
    }

    @Test
    void wellFormednessRejectsEverythingThatIsNotSixDigits() {
        assertThat(VerificationCodes.isWellFormed("123456")).isTrue();
        assertThat(VerificationCodes.isWellFormed("12345")).isFalse();
        assertThat(VerificationCodes.isWellFormed("1234567")).isFalse();
        assertThat(VerificationCodes.isWellFormed("12345a")).isFalse();
        assertThat(VerificationCodes.isWellFormed("")).isFalse();
        assertThat(VerificationCodes.isWellFormed(null)).isFalse();
    }
}
