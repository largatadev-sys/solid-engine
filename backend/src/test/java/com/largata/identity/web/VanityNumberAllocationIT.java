package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.identity.api.MeResponse;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class VanityNumberAllocationIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aFreshlyProvisionedTravelerIsServedABetaCohortNumber() {
        String uid = freshUid();

        String number = vanityNumberFor(TestJwtSupport.tokenFor(uid, uid + "@example.com"));

        assertThat(number)
                .as("the launch date is unset in every environment today, so every sign-up is beta")
                .matches("01\\d{4}");
    }


    @Test
    void theNumberIsAllocatedOnceAndNeverMovesAfterwards() {
        String token = TestJwtSupport.tokenFor(freshUid(), "stable@example.com");

        String first = vanityNumberFor(token);
        String second = vanityNumberFor(token);

        assertThat(second).as("immutable: the badge is worthless if it can change").isEqualTo(first);
    }


    @Test
    void aFounderRowRendersTheBareZero() {
        String uid = freshUid();
        vanityNumberFor(TestJwtSupport.tokenFor(uid, uid + "@example.com"));
        jdbc.update(
                "UPDATE traveler SET vanity_cohort = 0, vanity_pool_number = 0 WHERE firebase_uid = ?", uid);

        assertThat(vanityNumberFor(TestJwtSupport.tokenFor(uid, uid + "@example.com")))
                .as("V25 plants exactly this shape by UUID; the wire must render it as the bare 0")
                .isEqualTo("0");
    }


    @Test
    void concurrentSignUpsNeverShareANumber() throws Exception {
        int travelers = 12;
        List<String> tokens =
                java.util.stream.IntStream.range(0, travelers)
                        .mapToObj(i -> TestJwtSupport.tokenFor(freshUid(), "racer" + i + "@example.com"))
                        .toList();

        List<Callable<String>> calls = tokens.stream().map(t -> (Callable<String>) () -> vanityNumberFor(t)).toList();

        try (ExecutorService pool = Executors.newFixedThreadPool(travelers)) {
            List<Future<String>> results = pool.invokeAll(calls);
            List<String> numbers = new java.util.ArrayList<>();
            for (Future<String> result : results) {
                numbers.add(result.get());
            }

            assertThat(numbers)
                    .as("SKIP LOCKED hands each concurrent claim a different row")
                    .doesNotContainNull()
                    .doesNotHaveDuplicates()
                    .hasSize(travelers);
        }
    }


    @Test
    void aClaimedNumberIsMarkedRatherThanRemovedSoItCanNeverBeDrawnTwice() {
        String uid = freshUid();
        String number = vanityNumberFor(TestJwtSupport.tokenFor(uid, uid + "@example.com"));
        int drawn = Integer.parseInt(number.substring(2));

        Integer claimedRows =
                jdbc.queryForObject(
                        "SELECT count(*) FROM vanity_pool WHERE cohort = 1 AND pool_number = ? "
                                + "AND claimed_at IS NOT NULL",
                        Integer.class,
                        drawn);

        assertThat(claimedRows)
                .as("a tombstone, not a deletion: deleting would let a drained cohort regenerate "
                        + "numbers travelers already hold")
                .isEqualTo(1);
    }


    @Test
    void theCohortPoolIsGeneratedOnceAndShuffled() {
        vanityNumberFor(TestJwtSupport.tokenFor(freshUid(), "pool@example.com"));

        Integer size = jdbc.queryForObject("SELECT count(*) FROM vanity_pool WHERE cohort = 1", Integer.class);
        Integer inOrder =
                jdbc.queryForObject(
                        "SELECT count(*) FROM vanity_pool WHERE cohort = 1 AND pool_number = draw_order",
                        Integer.class);

        assertThat(size).isEqualTo(10_000);
        assertThat(inOrder)
                .as("a shuffled draw order: an unshuffled pool would leak signup volume, which is "
                        + "the only reason a pool exists rather than a sequence")
                .isLessThan(1_000);
    }


    private String vanityNumberFor(String token) {
        return rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(MeResponse.class)
                .returnResult()
                .getResponseBody()
                .vanityNumber();
    }


    private String freshUid() {
        return "uid-" + UUID.randomUUID();
    }
}
