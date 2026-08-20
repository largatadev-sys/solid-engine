package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import com.largata.support.WsTestClient;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestJwtSupport.Config.class, ConnectionTicketIT.SteerableClock.class})
@ActiveProfiles("dev")
class ConnectionTicketIT extends PostgresTestBase {

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private MutableClock clock;

    private RestTestClient rest;
    private TripRig tripRig;
    private WsRig rig;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        tripRig = new TripRig(rest, jdbc);
        rig = new WsRig(rest, port);
    }

    @Test
    void aValidTicketAdmitsTheUpgrade() throws Exception {
        try (WsTestClient client = rig.connectAs(tripRig.travelerWithHandle("wstk1" + WsRig.tag()))) {
            client.send("{\"action\":\"nonsense\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_ACTION);
        }
    }

    @Test
    void aTicketIsBurnedOnUseSoTheSameOneCannotOpenASecondSocket() {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("wstk2" + WsRig.tag()));

        try (WsTestClient ignoredButHoldingTheBurnedTicket = WsTestClient.connect(rig.urlFor(ticket), null)) {
            assertThat(ignoredButHoldingTheBurnedTicket).isNotNull();
            assertThat(WsTestClient.refusedStatus(rig.urlFor(ticket), null)).isEqualTo(401);
        }
    }

    @Test
    void aTicketPastItsTtlIsRefusedAtTheHandshakeAndNotOnlyInTheStore() {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("wstk3" + WsRig.tag()));

        clock.advance(ConnectionTickets.TTL.plusSeconds(1));

        assertThat(WsTestClient.refusedStatus(rig.urlFor(ticket), null))
                .as("Expiry is enforced at redemption, so only a real handshake can prove it. A unit"
                        + " test with a fake clock proves the store forgets the ticket; it cannot"
                        + " prove the upgrade is refused.")
                .isEqualTo(401);
    }

    @Test
    void aTicketOnItsExpiryInstantStillAdmitsSoTheBoundaryIsNotOffByOne() throws Exception {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("wstk4" + WsRig.tag()));

        clock.advance(ConnectionTickets.TTL);

        try (WsTestClient client = WsTestClient.connect(rig.urlFor(ticket), null)) {
            client.send("{\"action\":\"teleport\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_ACTION);
        }
    }

    @Test
    void anAbsentTicketIsRefused() {
        assertThat(WsTestClient.refusedStatus(rig.bareUrl(), null)).isEqualTo(401);
    }

    @Test
    void aGarbageTicketIsRefused() {
        assertThat(WsTestClient.refusedStatus(rig.urlFor("not-a-real-ticket"), null)).isEqualTo(401);
    }

    @Test
    void mintingATicketRequiresAuthentication() {
        rest.post().uri("/v1/ws-ticket").exchange().expectStatus().isUnauthorized();
    }

    @Test
    void theMintedTicketNeverCarriesTheTravelerIdSoAnAccessLogLeaksNothing() {
        String token = tripRig.travelerWithHandle("wstk5" + WsRig.tag());

        assertThat(rig.mintTicket(token)).doesNotContain(tripRig.travelerIdOf(token).toString());
    }

    @TestConfiguration
    static class SteerableClock {

        @Bean
        @Primary
        MutableClock connectionTicketTestClock() {
            return new MutableClock(Instant.parse("2026-08-20T10:00:00Z"));
        }
    }
}
