package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;


@SpringBootTest
@TestPropertySource(properties = "largata.vanity.launch-date=2026-09-15")
@Import(VanityLaunchDateIT.FrozenClock.class)
class VanityLaunchDateIT extends PostgresTestBase {

    private static final Instant TWO_MONTHS_AFTER_LAUNCH = Instant.parse("2026-11-03T10:00:00Z");

    @Autowired private TravelerService travelers;


    @Test
    void aSignUpAfterLaunchDrawsFromItsOwnCalendarMonthCohort() {
        Traveler provisioned = travelers.getOrProvision(claimsFor(freshUid()));

        assertThat(provisioned.vanityNumber())
                .as("launch month is 02 and each calendar month adds one, so November to a "
                        + "September launch is 04 - the config alone moves it, with no code change")
                .matches("04\\d{4}");
    }


    private static TravelerClaims claimsFor(String uid) {
        return new TravelerClaims(uid, uid + "@example.com", "Launched", null);
    }

    private static String freshUid() {
        return "uid-" + UUID.randomUUID();
    }


    @TestConfiguration
    static class FrozenClock {

        @Bean
        Clock clock() {
            return Clock.fixed(TWO_MONTHS_AFTER_LAUNCH, ZoneOffset.UTC);
        }
    }
}
