package com.largata.health;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


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
