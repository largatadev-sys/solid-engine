package com.largata.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Real Postgres for integration tests (06b §7). Version pinned to match the local stack — the
 * compatibility floor while the prod major stays undecided (spec Q5; re-pin at S0.4).
 *
 * <p><strong>Singleton-container pattern, deliberately not {@code @Testcontainers}/{@code
 * @Container}.</strong> Those annotations manage the container's lifecycle <em>per test class</em>,
 * which silently breaks once more than one Spring context exists: Spring caches contexts by
 * configuration, so a context built by an earlier class keeps a datasource pointing at a container
 * that JUnit has since stopped. The symptom is not an obvious error — it is 30-second JDBC timeouts
 * and health returning 503 in a class that passed yesterday. (Hit for real at S0.1 when the CORS
 * profile tests added a second context.)
 *
 * <p>Here the container is started once, by hand, in a static initializer and never stopped —
 * Ryuk, Testcontainers' reaper sidecar, removes it when the JVM exits. Every context in the run
 * therefore points at the same live database.
 *
 * <p>Note the package: Testcontainers 2.x moved each module's container into its own package
 * ({@code org.testcontainers.postgresql}); the old {@code org.testcontainers.containers} home is a
 * deprecated 1.x shim, and the class is no longer generic.
 */
public abstract class PostgresTestBase {

    protected static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    /**
     * {@code @ServiceConnection} works off the annotation-driven lifecycle; with a hand-started
     * singleton the connection details are published explicitly instead.
     */
    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
