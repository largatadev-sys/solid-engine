package com.largata.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;


public abstract class PostgresTestBase {

    protected static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    static {
        POSTGRES.start();
    }


    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> POOL_SIZE_PER_CONTEXT);
        registry.add("largata.auth.jwks.uri", TestJwtSupport::jwksUrl);
        registry.add(
                "spring.security.oauth2.resourceserver.jwt.issuer-uri",
                () -> TestJwtSupport.ISSUER);
    }


    private static final int POOL_SIZE_PER_CONTEXT = 4;
}
