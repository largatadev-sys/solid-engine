package com.largata.place;

import com.largata.place.api.TooManySearchesException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;


@Component
class SearchRateLimiter {

    static final int PER_TRAVELER_PER_MINUTE = 30;

    static final int GLOBAL_PER_MINUTE = 300;

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private static final Logger log = LoggerFactory.getLogger(SearchRateLimiter.class);

    private final Clock clock;

    private final Map<String, Deque<Instant>> searchesByTraveler = new HashMap<>();

    private final Deque<Instant> allSearches = new ArrayDeque<>();

    SearchRateLimiter(Clock clock) {
        this.clock = clock;
    }


    synchronized void admit(String traveler) {
        Instant now = Instant.now(clock);
        forgetExpired(now);

        if (allSearches.size() >= GLOBAL_PER_MINUTE) {
            log.warn("Place search refused, the whole app has spent its allowance: cap={}", GLOBAL_PER_MINUTE);
            throw new TooManySearchesException("Place search is busy right now. Try again in a moment.");
        }
        Deque<Instant> mine = searchesByTraveler.computeIfAbsent(traveler, unseen -> new ArrayDeque<>());
        if (mine.size() >= PER_TRAVELER_PER_MINUTE) {
            log.warn("Place search refused, this traveler's allowance is spent: limit={}", PER_TRAVELER_PER_MINUTE);
            throw new TooManySearchesException("You are searching faster than we can ask. Try again in a moment.");
        }

        mine.addLast(now);
        allSearches.addLast(now);
    }


    private void forgetExpired(Instant now) {
        Instant cutoff = now.minus(WINDOW);
        Iterator<Map.Entry<String, Deque<Instant>>> travelers = searchesByTraveler.entrySet().iterator();
        while (travelers.hasNext()) {
            Deque<Instant> searches = travelers.next().getValue();
            while (!searches.isEmpty() && searches.peekFirst().isBefore(cutoff)) {
                searches.pollFirst();
            }
            if (searches.isEmpty()) {
                travelers.remove();
            }
        }

        while (!allSearches.isEmpty() && allSearches.peekFirst().isBefore(cutoff)) {
            allSearches.pollFirst();
        }
    }
}
