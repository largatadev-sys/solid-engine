package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;

class HandleSuggestionTest {

    private static final Set<String> NOTHING_TAKEN = Set.of();

    @Test
    void aGoogleDisplayNameBecomesAHandle() {
        assertThat(suggest("Ana Silva", "ana@example.com", NOTHING_TAKEN)).isEqualTo("anasilva");
    }

    @Test
    void anEmailSignUpFallsBackToTheLocalPart() {
        assertThat(suggest(null, "ana.silva@example.com", NOTHING_TAKEN)).isEqualTo("anasilva");
    }

    @Test
    void aNameTooShortToBeAHandleFallsThroughToTheEmail() {
        assertThat(suggest("Jo", "joanna@example.com", NOTHING_TAKEN)).isEqualTo("joanna");
    }

    @Test
    void aNameWithNoUsableCharactersAtAllStillYieldsSomething() {
        assertThat(suggest("!!!", "!!@example.com", NOTHING_TAKEN)).isEqualTo("wanderer");
    }

    @Test
    void theFallbackStemIsItselfALegalHandleRatherThanAReservedWordNeedingASuffix() {
        assertThat(Handle.check(suggest("!!!", "!!@example.com", NOTHING_TAKEN)))
                .isEqualTo(Handle.Availability.FREE);
    }

    @Test
    void aTakenStemGetsANumericSuffixRatherThanCollidingOnSubmit() {
        assertThat(suggest("Ana Silva", "ana@example.com", Set.of("anasilva"))).isEqualTo("anasilva1");
        assertThat(suggest("Ana Silva", "ana@example.com", Set.of("anasilva", "anasilva1")))
                .isEqualTo("anasilva2");
    }

    @Test
    void aReservedStemIsTreatedAsUnavailableRatherThanSuggestedAndThenRejected() {
        assertThat(suggest("admin", "admin@example.com", NOTHING_TAKEN)).isEqualTo("admin1");
    }

    @Test
    void aSuffixNeverPushesTheHandlePastItsMaximumLength() {
        String twentyChars = "a".repeat(20);

        String suggestion = suggest(twentyChars, "x@example.com", Set.of(twentyChars));

        assertThat(suggestion).hasSizeLessThanOrEqualTo(Handle.MAX_LENGTH);
        assertThat(Handle.check(suggestion)).isEqualTo(Handle.Availability.FREE);
    }

    @Test
    void everySuggestionIsItselfALegalHandle() {
        assertThat(Handle.check(suggest("Ana Silva", "ana@example.com", NOTHING_TAKEN)))
                .isEqualTo(Handle.Availability.FREE);
        assertThat(Handle.check(suggest(null, "a@example.com", NOTHING_TAKEN)))
                .isEqualTo(Handle.Availability.FREE);
    }

    private static String suggest(String displayName, String email, Set<String> taken) {
        return HandleSuggestion.from(displayName, email, taken::contains);
    }
}
