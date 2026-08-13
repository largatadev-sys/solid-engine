package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.identity.IdentityExceptions.HandleReservedException;
import com.largata.identity.IdentityExceptions.MalformedHandleException;
import org.junit.jupiter.api.Test;

class HandleTest {

    @Test
    void aHandleIsStoredLowercasedAndTrimmed() {
        assertThat(Handle.of("  AnaSilva  ").value()).isEqualTo("anasilva");
    }

    @Test
    void lettersDigitsAndUnderscoresAreTheWholeAlphabet() {
        assertThat(Handle.of("ana_silva_99").value()).isEqualTo("ana_silva_99");
    }

    @Test
    void anythingOutsideThatAlphabetIsRefused() {
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("ana.silva"));
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("ana silva"));
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("ana-silva"));
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("ana@silva"));
    }

    @Test
    void theLengthBoundsAreEnforcedAtBothEnds() {
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("a"));
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("ab"));
        assertThat(Handle.of("abc").value()).isEqualTo("abc");
        assertThat(Handle.of("a".repeat(20)).value()).hasSize(20);
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("a".repeat(21)));
    }

    @Test
    void reservedWordsAreRefusedRegardlessOfCasing() {
        assertThatExceptionOfType(HandleReservedException.class).isThrownBy(() -> Handle.of("admin"));
        assertThatExceptionOfType(HandleReservedException.class).isThrownBy(() -> Handle.of("Largata"));
        assertThatExceptionOfType(HandleReservedException.class).isThrownBy(() -> Handle.of("SETTINGS"));
    }

    @Test
    void aReservedWordAsPartOfALongerHandleIsFine() {
        assertThat(Handle.of("adminah").value()).isEqualTo("adminah");
    }

    @Test
    void nullAndBlankAreMalformedRatherThanExploding() {
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of(null));
        assertThatExceptionOfType(MalformedHandleException.class).isThrownBy(() -> Handle.of("   "));
    }

    @Test
    void theAvailabilityCheckReportsTheSameJudgementsWithoutThrowing() {
        assertThat(Handle.check("anasilva")).isEqualTo(Handle.Availability.FREE);
        assertThat(Handle.check("ANASILVA")).isEqualTo(Handle.Availability.FREE);
        assertThat(Handle.check("a")).isEqualTo(Handle.Availability.MALFORMED);
        assertThat(Handle.check("ab")).isEqualTo(Handle.Availability.MALFORMED);
        assertThat(Handle.check("abc")).isEqualTo(Handle.Availability.FREE);
        assertThat(Handle.check("ana silva")).isEqualTo(Handle.Availability.MALFORMED);
        assertThat(Handle.check("admin")).isEqualTo(Handle.Availability.RESERVED);
    }
}
