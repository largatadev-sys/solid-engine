package com.largata.support;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real Postgres for integration tests (06b §7). Version pinned to match the local stack — the
 * compatibility floor while the prod major stays undecided (spec Q5; re-pin at S0.4).
 *
 * <p>The container is static: one Postgres shared by every test class that extends this base,
 * rather than one per class.
 *
 * <p>Note the package: Testcontainers 2.x moved each module's container into its own package
 * ({@code org.testcontainers.postgresql}); the old {@code org.testcontainers.containers} home is a
 * deprecated 1.x shim, and the class is no longer generic.
 */
@Testcontainers
public abstract class PostgresTestBase {

    @Container @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");
}
