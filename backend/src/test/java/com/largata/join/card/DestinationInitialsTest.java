package com.largata.join.card;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class DestinationInitialsTest {

    @Test
    void itTakesTheFirstLetterOfTheFirstTwoWords() {
        assertThat(DestinationInitials.of("Ana Silva")).isEqualTo("AS");
        assertThat(DestinationInitials.of("Ana")).isEqualTo("A");
    }


    @Test
    void itSplitsOnTheSamePunctuationTheClientSplitsOn() {
        assertThat(DestinationInitials.of("ana.silva")).isEqualTo("AS");
        assertThat(DestinationInitials.of("largata.dev+t1")).isEqualTo("LD");
    }


    @Test
    void itDrawsNothingRatherThanAQuestionMarkWhenNoLetterQualifies() {
        assertThat(DestinationInitials.of(null)).isEmpty();
        assertThat(DestinationInitials.of("   ")).isEmpty();
        assertThat(DestinationInitials.of("!!!")).isEmpty();
    }


    @Test
    void aRealDestinationReadsAsItsInitials() {
        assertThat(DestinationInitials.of("El Nido, Palawan")).isEqualTo("EN");
        assertThat(DestinationInitials.of("Kyoto")).isEqualTo("K");
    }


    @Test
    void aWordStartingWithPunctuationContributesNothingRatherThanItsNextLetter() {
        assertThat(DestinationInitials.of("¡Buenos Aires")).isEqualTo("A");
    }


    @Test
    void digitsCountAsInitialsJustAsTheyDoOnTheClient() {
        assertThat(DestinationInitials.of("7 Sisters")).isEqualTo("7S");
    }


    @Test
    void itStopsAtTwoHoweverManyWordsThereAre() {
        assertThat(DestinationInitials.of("Rio de Janeiro Brazil")).isEqualTo("RD");
    }
}
