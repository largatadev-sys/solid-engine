package com.largata.join;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class JoinUrlsTest {

    private static final String WEB = "https://largata.test";

    private static final String TOKEN = "abc123";


    @Test
    void theHandoffUrlIsTheSharedLinkPlusTheParamSoTheTwoCannotDriftApart() {
        assertThat(JoinUrls.appHandoffUrl(WEB, TOKEN, 4))
                .startsWith(JoinUrls.landingUrl(WEB, TOKEN, 4));
    }


    @Test
    void theHandoffUrlDiffersFromTheSharedLinkBecauseThatIsWhatBreaksTheRedirectLoop() {
        assertThat(JoinUrls.appHandoffUrl(WEB, TOKEN, 4))
                .isNotEqualTo(JoinUrls.landingUrl(WEB, TOKEN, 4));
    }


    @Test
    void theParamIsJoinedWithAnAmpersandBecauseTheVersionQueryIsAlwaysAlreadyThere() {
        assertThat(JoinUrls.appHandoffUrl(WEB, TOKEN, 4))
                .isEqualTo("https://largata.test/join/abc123?v=4&app=1");
    }


    @Test
    void aTrailingSlashOnTheBaseNeverDoublesUpInTheHandoff() {
        assertThat(JoinUrls.appHandoffUrl(WEB + "/", TOKEN, 1))
                .isEqualTo("https://largata.test/join/abc123?v=1&app=1");
    }
}
