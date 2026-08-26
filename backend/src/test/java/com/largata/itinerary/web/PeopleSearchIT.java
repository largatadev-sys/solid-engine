package com.largata.itinerary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PeopleSearchIT extends PostgresTestBase {

    private static final Pattern JSON_KEY = Pattern.compile("\"([A-Za-z][A-Za-z0-9]*)\"[ ]*:");

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aPrefixOfTheHandleFindsTheTraveler() {
        String prefix = uniquePrefix();
        String subject = onboarded(prefix + "santos", "Someone Else");
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(handlesIn(peopleResults(viewer, prefix)))
                .as("the handle half of the match rule")
                .contains(prefix + "santos");
    }


    @Test
    void aPrefixOfTheDisplayNameFindsTheTravelerWhoseHandleLooksNothingLikeIt() {
        String name = "Zephyrine " + uniquePrefix();
        onboarded(uniquePrefix() + "unrelated", name);
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(namesIn(peopleResults(viewer, "zephyrine")))
                .as("the display-name half — case-insensitive, and not a handle match")
                .contains(name);
    }


    @Test
    void aQueryUnderTwoCharactersReturnsNobodyFromEitherRead() {
        String prefix = uniquePrefix();
        onboarded(prefix + "santos", "Maya Santos");
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(handlesIn(peopleResults(viewer, prefix.substring(0, 1))))
                .as("the fence is the server's, not the client gate's")
                .isEmpty();

        rest.get()
                .uri("/v1/discovery/suggestions?q=" + prefix.substring(0, 1))
                .header(HttpHeaders.AUTHORIZATION, bearer(viewer))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("QUERY_TOO_SHORT");
    }


    @Test
    void anAbsentOrEmptyQueryNeverEnumeratesTheTravelerList() {
        onboarded(uniquePrefix() + "santos", "Maya Santos");
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(handlesIn(read("/v1/discovery/people", viewer)))
                .as("no query, no people — there is no browse-all-people anywhere")
                .isEmpty();
        assertThat(handlesIn(peopleResults(viewer, ""))).isEmpty();
        assertThat(handlesIn(suggestions(viewer, ""))).isEmpty();
    }


    @Test
    void anEmailShapedQueryFindsNobodyEvenWhenItIsExactlyThatTravelersStoredEmail() {
        String handle = uniquePrefix() + "santos";
        String email = "found-" + UUID.randomUUID() + "@example.com";
        onboardedWithEmail(handle, "Maya Santos", email);
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(handlesIn(peopleResults(viewer, email)))
                .as("knowing someone's email must never unlock their presence here")
                .isEmpty();
        assertThat(handlesIn(suggestions(viewer, email))).isEmpty();
    }


    @Test
    void anUnonboardedTravelerNeverAppearsEvenOnAnExactDisplayNameMatch() {
        String name = "Ghostly " + uniquePrefix();
        String handle = uniquePrefix() + "ghost";
        claimHandleWithoutOnboarding(handle, name);
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(handlesIn(peopleResults(viewer, handle)))
                .as("an un-onboarded account has no profile, so it has no presence in search")
                .isEmpty();
        assertThat(namesIn(peopleResults(viewer, "ghostly"))).doesNotContain(name);
    }


    @Test
    void theSearchingTravelerNeverAppearsInTheirOwnResultsEvenOnTheirExactHandle() {
        String handle = uniquePrefix() + "self";
        String viewer = onboarded(handle, "The Viewer");

        assertThat(handlesIn(peopleResults(viewer, handle)))
                .as("an exact handle match that would otherwise rank first — excluded server-side")
                .isEmpty();
        assertThat(handlesIn(suggestions(viewer, handle))).isEmpty();
    }


    @Test
    void suggestionsAreCappedAtThreeWhileTheResultsReadCarriesTheRest() {
        String prefix = uniquePrefix();
        List<String> planted = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            planted.add(onboardedHandle(prefix + "person" + i, "Person " + i));
        }
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(handlesIn(suggestions(viewer, prefix)))
                .as("the suggestions group is capped so people never crowd out trips")
                .hasSize(3);
        assertThat(handlesIn(peopleResults(viewer, prefix)))
                .as("and the dedicated results screen carries all of them")
                .containsExactlyInAnyOrderElementsOf(planted);
    }


    @Test
    void theExactHandleOutranksAPrefixMatchWhichOutranksADisplayNameMatch() {
        String prefix = uniquePrefix();
        onboarded(prefix, "Zed Last");
        onboarded(prefix + "longer", "Also Ranked");
        onboarded(uniquePrefix() + "nothandle", prefix + " By Name");
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        List<String> ranked = handlesIn(peopleResults(viewer, prefix));

        assertThat(ranked.getFirst())
                .as("exact handle first, whatever its display name sorts like")
                .isEqualTo(prefix);
        assertThat(ranked.get(1)).as("then the handle prefix").isEqualTo(prefix + "longer");
        assertThat(ranked).as("and the display-name match brings up the rear").hasSize(3);
    }


    @Test
    void theResultsWalkTheirCursorExactlyOnce() {
        String prefix = uniquePrefix();
        List<String> planted = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            planted.add(onboardedHandle(prefix + "person" + i, "Person " + i));
        }
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        List<String> walked = new ArrayList<>();
        String cursor = null;
        int pages = 0;
        do {
            String uri =
                    "/v1/discovery/people?q=" + prefix + "&limit=2"
                            + (cursor == null ? "" : "&cursor=" + cursor);
            byte[] body = read(uri, viewer);
            walked.addAll(handlesIn(body));
            cursor = nextCursorIn(body);
            pages++;
        } while (cursor != null && pages < 10);

        assertThat(pages).as("five people at two per page").isEqualTo(3);
        assertThat(walked).containsExactlyInAnyOrderElementsOf(planted).doesNotHaveDuplicates();
    }
    @Test
    void theCountLineCountsEveryMatchRatherThanThePageInHand() {
        String prefix = uniquePrefix();
        for (int i = 0; i < 5; i++) {
            onboarded(prefix + "person" + i, "Person " + i);
        }
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        byte[] firstPage = read("/v1/discovery/people?q=" + prefix + "&limit=2", viewer);

        assertThat(handlesIn(firstPage)).hasSize(2);
        assertThat(totalCountIn(firstPage))
                .as("the count line is about the query, not about the page in hand")
                .isEqualTo(5);
    }


    @Test
    void suggestionsSaySoWhenMorePeopleMatchThanTheCapShows() {
        String prefix = uniquePrefix();
        for (int i = 0; i < 5; i++) {
            onboarded(prefix + "person" + i, "Person " + i);
        }
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(new String(suggestions(viewer, prefix)))
                .as("five match and three show, so See all people has somewhere to go")
                .contains("\"morePeople\":true");
    }


    @Test
    void suggestionsStaySilentWhenTheCapAlreadyShowsEverybody() {
        String prefix = uniquePrefix();
        onboarded(prefix + "only", "The Only One");
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        assertThat(new String(suggestions(viewer, prefix)))
                .as("one match, all of it shown — See all people would open a list of one")
                .contains("\"morePeople\":false");
    }


    @Test
    void theExclusionListIsAbsentFromThePeoplePayloadsThisStoryAdds() {
        String handle = uniquePrefix() + "santos";
        String email = "found-" + UUID.randomUUID() + "@example.com";
        onboardedWithEmail(handle, "Maya Santos", email);
        String viewer = onboarded(uniquePrefix() + "viewer", "The Viewer");

        for (byte[] body :
                List.of(peopleResults(viewer, handle), suggestions(viewer, handle))) {
            String served = new String(body);

            assertThat(keysIn(body))
                    .as("the named exclusion list, on the wire — the search payloads are part of"
                            + " \"never in any payload of this story\" too")
                    .doesNotContain(
                            "email", "country", "homeCity", "preferredCurrency", "goals", "interests");
            assertThat(served)
                    .as("and the address itself never appears, whatever a future card might carry")
                    .doesNotContain(email);
        }
    }


    void bothPeopleReadsRefuseAnUnauthenticatedCaller() {
        for (String uri : List.of("/v1/discovery/people?q=ma", "/v1/discovery/suggestions?q=ma")) {
            rest.get().uri(uri).exchange().expectStatus().isUnauthorized();
        }
    }


    private byte[] peopleResults(String token, String query) {
        return read("/v1/discovery/people?q=" + query, token);
    }


    private byte[] suggestions(String token, String query) {
        return read("/v1/discovery/suggestions?q=" + query, token);
    }


    private byte[] read(String uri, String token) {
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


    private String onboarded(String handle, String displayName) {
        return onboardedWithEmail(handle, displayName, "traveler-" + UUID.randomUUID() + "@example.com");
    }


    private String onboardedHandle(String handle, String displayName) {
        onboarded(handle, displayName);
        return handle;
    }


    private String onboardedWithEmail(String handle, String displayName, String email) {
        String token = claimHandleWithoutOnboarding(handle, displayName, email);
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    private String claimHandleWithoutOnboarding(String handle, String displayName) {
        return claimHandleWithoutOnboarding(
                handle, displayName, "traveler-" + UUID.randomUUID() + "@example.com");
    }


    private String claimHandleWithoutOnboarding(String handle, String displayName, String email) {
        String token = TestJwtSupport.verifiedTokenWithName("uid-" + UUID.randomUUID(), email, displayName);
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"handle\":\"" + handle + "\",\"displayName\":\"" + displayName + "\"}")
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    private static List<String> handlesIn(byte[] body) {
        return allMatchesOf("handle", body);
    }


    private static List<String> namesIn(byte[] body) {
        return allMatchesOf("displayName", body);
    }


    private static List<String> allMatchesOf(String field, byte[] body) {
        List<String> found = new ArrayList<>();
        Matcher hits =
                Pattern.compile("\"" + field + "\"\\s*:\\s*\"([^\"]*)\"").matcher(new String(body));
        while (hits.find()) {
            found.add(hits.group(1));
        }
        return found;
    }


    private static String nextCursorIn(byte[] body) {
        Matcher found = Pattern.compile("\"nextCursor\"\\s*:\\s*\"([^\"]+)\"").matcher(new String(body));
        return found.find() ? found.group(1) : null;
    }


    private static String uniquePrefix() {
        return "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }


    private static long totalCountIn(byte[] body) {
        Matcher found = Pattern.compile("totalCount.:([0-9]+)").matcher(new String(body));
        if (!found.find()) {
            throw new AssertionError("no totalCount in " + new String(body));
        }
        return Long.parseLong(found.group(1));
    }


    private static List<String> keysIn(byte[] body) {
        List<String> keys = new ArrayList<>();
        Matcher found = JSON_KEY.matcher(new String(body));
        while (found.find()) {
            keys.add(found.group(1));
        }
        return keys;
    }
}
