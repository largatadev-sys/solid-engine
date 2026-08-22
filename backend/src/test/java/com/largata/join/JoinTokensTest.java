package com.largata.join;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class JoinTokensTest {

    private static final String MINTED = "Ab3-_9xKq7Z";


    @Test
    void itLeavesMostOfTheTokenOutOfTheLog() {
        assertThat(JoinTokens.logPrefixOf(MINTED)).isEqualTo("Ab3-");
    }


    @Test
    void whatItRevealsStaysAMinorityOfAnEightByteToken() {
        assertThat(MINTED).hasSize(11);
        assertThat(JoinTokens.logPrefixOf(MINTED).length() * 2).isLessThan(MINTED.length());
    }


    @Test
    void aShorterStringThanThePrefixDoesNotBlowUp() {
        assertThat(JoinTokens.logPrefixOf("ab")).isEqualTo("ab");
        assertThat(JoinTokens.logPrefixOf("")).isEmpty();
        assertThat(JoinTokens.logPrefixOf(null)).isEmpty();
    }
}
