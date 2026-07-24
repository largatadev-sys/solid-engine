package com.largata.common.config;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The application clock (S1.4, ADR-014). Time-dependent logic reads it rather than calling {@code
 * Instant.now()} directly, so a test can supply a clock it controls.
 *
 * <p><strong>Why this exists now.</strong> The edit lease is the first behaviour whose correctness
 * turns on <em>elapsed</em> time, not just a timestamp: a lease expires, and "did it expire yet"
 * cannot be tested honestly by sleeping past a real TTL without reintroducing the timing flakiness
 * the singleton-container discipline works to avoid. {@link com.largata.itinerary.EditLeaseService}
 * takes this {@link Clock}; its expiry and renewal ITs advance a mutable test clock instead of the
 * wall.
 *
 * <p>{@code @ConditionalOnMissingBean}: a test that wants a controllable clock supplies its own and
 * this steps aside. Production gets {@link Clock#systemUTC()} — the same instants {@code
 * Instant.now()} would have produced, now injectable.
 *
 * <p>Existing timestamp writers ({@code Instant.now()} in the create/edit paths) are deliberately
 * left as they are: they record "when did this happen", which needs no test control, and churning
 * them to route through the clock would be scope this story does not own.
 */
@Configuration
public class ClockConfig {

    @Bean
    @ConditionalOnMissingBean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
