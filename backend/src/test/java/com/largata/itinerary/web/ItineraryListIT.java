package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Ticket 03's pagination ACs: the reference implementation of Artifact 05's one pagination shape.
 *
 * <p>These tests matter beyond this story — every later list (E4's discovery feed, workspace
 * activity) copies what they pin down, so what passes here becomes the house style whether or not
 * anyone re-reads Artifact 05.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ItineraryListIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void anEmptyListIsAResultNotAnAbsence() {
        // Artifact 05: collections never 404. A new traveler's list is a legitimate empty list, and
        // the mobile empty state depends on this being a 200.
        rest.get()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items")
                .isArray()
                .jsonPath("$.items.length()")
                .isEqualTo(0)
                // Exhausted: absent, not a sentinel. Absence needs no interpretation.
                .jsonPath("$.nextCursor")
                .doesNotExist();
    }

    @Test
    void theListIsNewestFirst() {
        String token = freshTraveler();
        create(token, "first");
        create(token, "second");
        create(token, "third");

        rest.get()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items[0].title")
                .isEqualTo("third")
                .jsonPath("$.items[1].title")
                .isEqualTo("second")
                .jsonPath("$.items[2].title")
                .isEqualTo("first");
    }

    @Test
    void aCursorWalksTheWholeListWithoutDuplicatesOrSkips() {
        // The AC that justifies cursors at all. Seven rows at two per page: the traversal must yield
        // each row exactly once. An off-by-one in the "one row more than asked for" probe shows up
        // here as a duplicate or a hole, not as a compile error.
        String token = freshTraveler();
        int total = 7;
        for (int i = 0; i < total; i++) {
            create(token, "trip-" + i);
        }

        List<String> seen = new ArrayList<>();
        String cursor = null;
        int guard = 0;
        do {
            byte[] page = fetchPage(token, cursor, 2);
            seen.addAll(titlesIn(page));
            cursor = cursorIn(page);
            assertThat(++guard).as("the traversal terminates").isLessThan(10);
        } while (cursor != null);

        assertThat(seen).hasSize(total).doesNotHaveDuplicates();
        assertThat(seen).containsExactly("trip-6", "trip-5", "trip-4", "trip-3", "trip-2", "trip-1", "trip-0");
    }

    @Test
    void theLastPageSaysSoByOmittingTheCursor() {
        String token = freshTraveler();
        create(token, "only");

        assertThat(cursorIn(fetchPage(token, null, 20))).isNull();
    }

    @Test
    void aFullPageWithNothingBeyondItStillEndsTheTraversal() {
        // The boundary the "+1 probe" exists for: exactly `limit` rows remain. Returning a cursor
        // here would send the client after an empty page — harmless but wrong, and the kind of thing
        // only a test at the exact boundary catches.
        String token = freshTraveler();
        create(token, "a");
        create(token, "b");

        assertThat(cursorIn(fetchPage(token, null, 2))).isNull();
    }

    @Test
    void anOversizedLimitIsClampedRatherThanRejected() {
        // Spec: a clamped list is still a correct list. 101 rows, limit=500 → 100 returned, and a
        // cursor, because a 101st row exists.
        String token = freshTraveler();
        for (int i = 0; i < 101; i++) {
            create(token, "bulk-" + i);
        }

        byte[] page = fetchPage(token, null, 500);

        assertThat(titlesIn(page)).hasSize(100);
        assertThat(cursorIn(page)).isNotNull();
    }

    @Test
    void theDefaultPageIsTwentyWhenNoLimitIsAsked() {
        String token = freshTraveler();
        for (int i = 0; i < 21; i++) {
            create(token, "default-" + i);
        }

        byte[] page =
                rest.get()
                        .uri("/v1/itineraries")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        assertThat(titlesIn(page)).hasSize(20);
    }

    @Test
    void theListShowsOnlyTheCallersOwnItineraries() {
        // The list's authorization: the owner filter is inside the query, so a stranger's itinerary
        // cannot enter the result at all. No guard call is involved — and that is the point.
        String mine = freshTraveler();
        String theirs = freshTraveler();
        create(mine, "mine");
        create(theirs, "theirs");

        assertThat(titlesIn(fetchPage(mine, null, 20))).containsExactly("mine");
        assertThat(titlesIn(fetchPage(theirs, null, 20))).containsExactly("theirs");
    }

    @Test
    void aCursorThisApiDidNotIssueIsABadRequestNotAServerError() {
        // A cursor arrives from outside, so a mangled one is a client error. Left unmapped it is an
        // IllegalArgumentException → 500 logged at ERROR: the wrong answer, plus a page for the
        // operator about someone else's typo.
        rest.get()
                .uri("/v1/itineraries?cursor=not-a-real-cursor")
                .header(HttpHeaders.AUTHORIZATION, bearer(freshTraveler()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("MALFORMED_CURSOR");
    }

    private byte[] fetchPage(String token, String cursor, int limit) {
        String uri = "/v1/itineraries?limit=" + limit + (cursor == null ? "" : "&cursor=" + cursor);
        return rest.get()
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
    }

    private void create(String token, String title) {
        rest.post()
                .uri("/v1/itineraries")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("""
                        {"title":"%s","destinations":["Somewhere"]}
                        """.formatted(title))
                .exchange()
                .expectStatus()
                .isCreated();
    }

    /** Titles in page order — enough to prove ordering, membership and page size. */
    private static List<String> titlesIn(byte[] body) {
        List<String> titles = new ArrayList<>();
        String json = new String(body);
        String needle = "\"title\":\"";
        int at = json.indexOf(needle);
        while (at >= 0) {
            int start = at + needle.length();
            titles.add(json.substring(start, json.indexOf('"', start)));
            at = json.indexOf(needle, start);
        }
        return titles;
    }

    private static String cursorIn(byte[] body) {
        String json = new String(body);
        String needle = "\"nextCursor\":\"";
        int at = json.indexOf(needle);
        if (at < 0) {
            return null;
        }
        int start = at + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }

    private static String freshTraveler() {
        return TestJwtSupport.tokenFor("uid-" + UUID.randomUUID(), "lister@example.com");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
