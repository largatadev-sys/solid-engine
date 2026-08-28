package com.largata.report;

import com.largata.report.ReportExceptions.TooManyReportsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;


@Component
public class ReportRateLimiter {

    public static final int PER_IP_PER_HOUR = 5;
    public static final int GLOBAL_PER_DAY = 100;

    private static final Duration IP_WINDOW = Duration.ofHours(1);
    private static final Logger log = LoggerFactory.getLogger(ReportRateLimiter.class);

    private final Clock clock;
    private final Map<String, Deque<Instant>> acceptsByCaller = new HashMap<>();
    private final Deque<Instant> globalAccepts = new ArrayDeque<>();

    ReportRateLimiter(Clock clock) {
        this.clock = clock;
    }


    public synchronized void admit(String caller) {
        Instant now = Instant.now(clock);
        forgetExpired(now);

        if (globalAccepts.size() >= GLOBAL_PER_DAY) {
            log.warn("Report refused, the global daily cap is spent: cap={}", GLOBAL_PER_DAY);
            throw new TooManyReportsException();
        }
        Deque<Instant> mine = acceptsByCaller.computeIfAbsent(caller, unseen -> new ArrayDeque<>());
        if (mine.size() >= PER_IP_PER_HOUR) {
            log.warn("Report refused, this caller's hourly allowance is spent: limit={}", PER_IP_PER_HOUR);
            throw new TooManyReportsException();
        }

        mine.addLast(now);
        globalAccepts.addLast(now);
    }


    private void forgetExpired(Instant now) {
        Instant ipCutoff = now.minus(IP_WINDOW);
        Iterator<Map.Entry<String, Deque<Instant>>> callers = acceptsByCaller.entrySet().iterator();
        while (callers.hasNext()) {
            Deque<Instant> accepts = callers.next().getValue();
            while (!accepts.isEmpty() && accepts.peekFirst().isBefore(ipCutoff)) {
                accepts.pollFirst();
            }
            if (accepts.isEmpty()) {
                callers.remove();
            }
        }

        Instant dayStart = now.truncatedTo(ChronoUnit.DAYS);
        while (!globalAccepts.isEmpty() && globalAccepts.peekFirst().isBefore(dayStart)) {
            globalAccepts.pollFirst();
        }
    }
}
