package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class PeopleQueryTest {

    @Test
    void aQueryShorterThanTheMinimumIsNotAQuery() {
        assertThat(PeopleQuery.of("m")).isEmpty();
        assertThat(PeopleQuery.of(" a ")).isEmpty();
    }


    @Test
    void anAbsentOrEmptyQueryNeverBecomesABrowseOfEverybody() {
        assertThat(PeopleQuery.of(null)).isEmpty();
        assertThat(PeopleQuery.of("")).isEmpty();
        assertThat(PeopleQuery.of("   ")).isEmpty();
    }


    @Test
    void anEmailShapedQueryMatchesNobodyEvenWhenItIsSomebodysRealAddress() {
        assertThat(PeopleQuery.of("maya@example.com")).isEmpty();
        assertThat(PeopleQuery.of("  largata.dev+t1@gmail.com  ")).isEmpty();
    }


    @Test
    void theSearchIsCaseInsensitiveSoTheStoredPrefixIsLowercased() {
        assertThat(PeopleQuery.of("MaYa")).contains(new PeopleQuery("maya"));
    }


    @Test
    void aLeadingAtIsHowTravelersTypeAHandleSoItIsNotPartOfThePrefix() {
        assertThat(PeopleQuery.of("@mayasantos")).contains(new PeopleQuery("mayasantos"));
    }


    @Test
    void aQueryThatIsNothingButAnAtSignAsksForNobody() {
        assertThat(PeopleQuery.of("@")).isEmpty();
        assertThat(PeopleQuery.of("@ ")).isEmpty();
    }


    @Test
    void anOverlongQueryIsTruncatedRatherThanRefused() {
        String tooLong = "m".repeat(PeopleQuery.MAX_LENGTH + 40);

        assertThat(PeopleQuery.of(tooLong))
                .contains(new PeopleQuery("m".repeat(PeopleQuery.MAX_LENGTH)));
    }
}
