package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Ticket 02's ACs at the service seam: provisioning happens once and only once, whatever the
 * concurrency, because the database says so.
 *
 * <p>The HTTP-level ACs (envelope shape, the /me contract) live in {@link
 * com.largata.identity.web.MeContractIT}; this class is about the invariant underneath them.
 */
@SpringBootTest
@Import(TestJwtSupport.Config.class)
class TravelerProvisioningIT extends PostgresTestBase {

    @Autowired private TravelerService travelers;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void firstContactProvisionsTheTraveler() {
        String uid = freshUid();

        Traveler provisioned = travelers.getOrProvision(TravelerClaims.of(uid, "ana@example.com", "Ana Silva"));

        assertThat(provisioned.id()).isNotNull();
        assertThat(provisioned.firebaseUid()).isEqualTo(uid);
        assertThat(provisioned.email()).isEqualTo("ana@example.com");
        assertThat(provisioned.displayName()).isEqualTo("Ana Silva");
        assertThat(rowCountFor(uid)).isEqualTo(1);
    }

    @Test
    void secondContactCreatesNothingAndReturnsTheSameTraveler() {
        String uid = freshUid();
        TravelerClaims claims = TravelerClaims.of(uid, "ana@example.com", "Ana Silva");

        UUID first = travelers.getOrProvision(claims).id();
        UUID second = travelers.getOrProvision(claims).id();

        assertThat(second).isEqualTo(first);
        assertThat(rowCountFor(uid)).isEqualTo(1);
    }

    /**
     * The race the UNIQUE constraint exists for (spec, decision 6b). Both threads read "missing"
     * and both try to insert; exactly one row must exist and both callers must get it.
     *
     * <p>Sixteen concurrent callers, not two: the interleaving that breaks a check-then-insert is
     * narrow, and two threads can miss it often enough to pass a broken implementation. This does
     * not prove the absence of a race — no test can — but it fails loudly against the naive version.
     */
    @Test
    void concurrentFirstContactsYieldExactlyOneTraveler() throws Exception {
        String uid = freshUid();
        TravelerClaims claims = TravelerClaims.of(uid, "race@example.com", "Race Condition");
        int callers = 16;

        List<Callable<UUID>> calls =
                java.util.stream.IntStream.range(0, callers)
                        .<Callable<UUID>>mapToObj(i -> () -> travelers.getOrProvision(claims).id())
                        .toList();

        try (ExecutorService pool = Executors.newFixedThreadPool(callers)) {
            List<Future<UUID>> results = pool.invokeAll(calls);

            List<UUID> ids = new java.util.ArrayList<>();
            for (Future<UUID> result : results) {
                ids.add(result.get());
            }

            assertThat(rowCountFor(uid)).as("the constraint elected exactly one winner").isEqualTo(1);
            assertThat(ids).as("every caller received the winner's traveler").containsOnly(ids.getFirst());
        }
    }

    @Test
    void googleSignInTakesItsDisplayNameFromTheNameClaim() {
        String uid = freshUid();

        Traveler traveler = travelers.getOrProvision(TravelerClaims.of(uid, "ana@example.com", "Ana Silva"));

        assertThat(traveler.displayName()).isEqualTo("Ana Silva");
    }

    @Test
    void emailSignUpFallsBackToTheEmailLocalPart() {
        // No name claim: the email sign-up shape (spec, decision 6c).
        String uid = freshUid();

        Traveler traveler = travelers.getOrProvision(TravelerClaims.of(uid, "ana.silva@example.com", null));

        assertThat(traveler.displayName()).isEqualTo("ana.silva");
    }

    @Test
    void displayNamesCollideAndThatIsAllowed() {
        // The fallback guarantees collisions — ana@gmail and ana@yahoo both yield "ana". If display
        // name were unique (the instinct this test exists to refute), the second traveler's very
        // first authenticated request would fail on a cosmetic field.
        Traveler first = travelers.getOrProvision(TravelerClaims.of(freshUid(), "ana@gmail.example", null));
        Traveler second = travelers.getOrProvision(TravelerClaims.of(freshUid(), "ana@yahoo.example", null));

        assertThat(first.displayName()).isEqualTo("ana");
        assertThat(second.displayName()).isEqualTo("ana");
        assertThat(second.id()).isNotEqualTo(first.id());
    }

    @Test
    void flywayRanTheTravelerMigration() {
        // The S0.1 lesson: every other test here would pass on a hand-created table. Only asserting
        // the history proves the migration pipeline is what built the schema.
        Integer applied =
                jdbc.queryForObject(
                        "SELECT count(*) FROM flyway_schema_history WHERE version = '2' AND success = true",
                        Integer.class);

        assertThat(applied).isEqualTo(1);
    }

    private String freshUid() {
        // Each test gets its own uid: the container is shared across the whole run (singleton
        // pattern), so tests that reused a uid would pass or fail depending on their order.
        return "uid-" + UUID.randomUUID();
    }

    private int rowCountFor(String firebaseUid) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM traveler WHERE firebase_uid = ?", Integer.class, firebaseUid);
    }
}
