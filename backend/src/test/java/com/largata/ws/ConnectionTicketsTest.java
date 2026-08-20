package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.MutableClock;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ConnectionTicketsTest {

    private static final Instant T0 = Instant.parse("2026-08-20T10:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final ConnectionTickets tickets = new ConnectionTickets(clock);

    @Test
    void aMintedTicketRedeemsToTheTravelerItWasMintedFor() {
        UUID traveler = UUID.randomUUID();

        String ticket = tickets.mint(traveler);

        assertThat(tickets.redeem(ticket)).contains(traveler);
    }

    @Test
    void aTicketRedeemsExactlyOnce() {
        String ticket = tickets.mint(UUID.randomUUID());

        assertThat(tickets.redeem(ticket)).isPresent();
        assertThat(tickets.redeem(ticket)).isEmpty();
    }

    @Test
    void aTicketPastItsTtlIsRefused() {
        String ticket = tickets.mint(UUID.randomUUID());

        clock.advance(ConnectionTickets.TTL.plusSeconds(1));

        assertThat(tickets.redeem(ticket)).isEmpty();
    }

    @Test
    void aTicketOnItsExpiryInstantIsStillGood() {
        String ticket = tickets.mint(UUID.randomUUID());

        clock.advance(ConnectionTickets.TTL);

        assertThat(tickets.redeem(ticket)).isPresent();
    }

    @Test
    void garbageAndAbsenceAreRefusedRatherThanThrowing() {
        assertThat(tickets.redeem("not-a-ticket")).isEmpty();
        assertThat(tickets.redeem("")).isEmpty();
        assertThat(tickets.redeem(null)).isEmpty();
    }

    @Test
    void ticketsAreUnguessablyDistinct() {
        assertThat(IntStream.range(0, 500).mapToObj(i -> tickets.mint(UUID.randomUUID())).distinct().count())
                .isEqualTo(500);
    }

    @Test
    void aMintedTicketDoesNotContainTheTravelerId() {
        UUID traveler = UUID.randomUUID();

        assertThat(tickets.mint(traveler)).doesNotContain(traveler.toString());
    }

    @Test
    void sweepingDropsExpiredTicketsSoTheStoreDoesNotGrowForever() {
        IntStream.range(0, 10).forEach(i -> tickets.mint(UUID.randomUUID()));
        String live;

        clock.advance(ConnectionTickets.TTL.plusSeconds(1));
        live = tickets.mint(UUID.randomUUID());
        tickets.sweep();

        assertThat(tickets.size()).isEqualTo(1);
        assertThat(tickets.redeem(live)).isPresent();
    }
}
