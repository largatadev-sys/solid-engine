package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.largata.support.PostgresTestBase;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;


@SpringBootTest
@TestPropertySource(properties = "largata.vanity.launch-date=2026-09-15")
class VanityLaunchDateIT extends PostgresTestBase {

    private static final Instant TWO_MONTHS_AFTER_LAUNCH = Instant.parse("2026-11-03T10:00:00Z");

    @Autowired private TravelerService travelers;

    @MockitoBean private Clock clock;


    @BeforeEach
    void freezeTheClock() {
        when(clock.instant()).thenReturn(TWO_MONTHS_AFTER_LAUNCH);
        when(clock.getZone()).thenReturn(ZoneId.from(ZoneOffset.UTC));
    }


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
}
