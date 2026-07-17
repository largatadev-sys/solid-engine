package com.largata.health;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Persistence layer (06b §2): queries only, zero business decisions.
 *
 * <p>The round-trip is what makes {@code /v1/health} a real vertical slice rather than a
 * constant: a green check proves container → Spring → config → DB → migrations → all layers.
 */
@Repository
public class HealthRepository {

    private final JdbcTemplate jdbcTemplate;

    HealthRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void ping() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    }
}
