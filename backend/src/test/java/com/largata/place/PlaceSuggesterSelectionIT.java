package com.largata.place;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.place.api.PlaceSuggester;
import com.largata.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.boot.test.context.SpringBootTest;


@SpringBootTest
class PlaceSuggesterSelectionIT extends PostgresTestBase {

    @Autowired private PlaceSuggester suggester;

    @Autowired private ApplicationContext beans;

    @Test
    void withNoPhotonUrlConfiguredTheFixtureIsSelected_soNoTestEverCallsKomoot() {
        assertThat(suggester)
                .as("the suite must never spend a stranger's free quota, nor go red when their service is down")
                .isInstanceOf(FixturePlaceSuggester.class);
    }


    @Test
    void exactlyOneSuggesterExists_becauseTheTwoBeansAreAMutuallyExclusivePair() {
        assertThat(beans.getBeanNamesForType(PlaceSuggester.class))
                .as("a @ConditionalOnMissingBean pair would let both register where both apply — the WS-1 finding")
                .hasSize(1);
    }
}
