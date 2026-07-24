package com.largata.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

/**
 * A {@link Clock} a test controls (S1.4): it holds a fixed instant until the test advances it.
 *
 * <p><strong>Why this exists.</strong> The edit lease is the first behaviour whose correctness turns
 * on <em>elapsed</em> time — a lease expires — and "did it expire yet" cannot be proven by sleeping
 * past a real TTL without the timing flakiness the singleton-container discipline exists to avoid.
 * Injecting this in place of {@code Clock.systemUTC()} lets the expiry and renewal ITs step time
 * forward deterministically: acquire, {@code advance(ttl.plusSeconds(1))}, assert the lease is free.
 *
 * <p>Provided to a Spring context by {@link Config} as a {@code @Primary} bean, which wins over the
 * production {@code @ConditionalOnMissingBean} clock. Not thread-safe, and does not need to be — a
 * single test drives it on one thread.
 */
public final class MutableClock extends Clock {

    private Instant now;
    private final ZoneId zone;

    public MutableClock(Instant start) {
        this(start, ZoneId.of("UTC"));
    }

    private MutableClock(Instant now, ZoneId zone) {
        this.now = now;
        this.zone = zone;
    }

    /** Steps the clock forward by a duration — the test's way of "letting time pass". */
    public void advance(Duration by) {
        this.now = this.now.plus(by);
    }

    @Override
    public Instant instant() {
        return now;
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return new MutableClock(now, zone);
    }
}
