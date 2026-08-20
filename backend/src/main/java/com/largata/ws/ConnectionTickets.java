package com.largata.ws;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;


@Component
public class ConnectionTickets {

    public static final Duration TTL = Duration.ofSeconds(30);

    private static final int TICKET_BYTES = 32;

    private final ConcurrentMap<String, Issued> issued = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final Clock clock;

    public ConnectionTickets(Clock clock) {
        this.clock = clock;
    }


    public String mint(UUID travelerId) {
        byte[] bytes = new byte[TICKET_BYTES];
        random.nextBytes(bytes);
        String ticket = encoder.encodeToString(bytes);
        issued.put(ticket, new Issued(travelerId, clock.instant().plus(TTL)));
        return ticket;
    }


    public Optional<UUID> redeem(String ticket) {
        if (ticket == null || ticket.isEmpty()) {
            return Optional.empty();
        }
        Issued burned = issued.remove(ticket);
        if (burned == null || burned.hasExpiredAt(clock.instant())) {
            return Optional.empty();
        }
        return Optional.of(burned.travelerId());
    }


    public void sweep() {
        Instant now = clock.instant();
        issued.values().removeIf(entry -> entry.hasExpiredAt(now));
    }


    int size() {
        return issued.size();
    }

    private record Issued(UUID travelerId, Instant expiresAt) {

        private boolean hasExpiredAt(Instant now) {
            return now.isAfter(expiresAt);
        }
    }
}
