package com.largata.poll.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PollContractIT extends PostgresTestBase {

    private static final ObjectMapper JSON = new ObjectMapper();

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void anyMemberStartsAPollAndEveryMemberSeesItOnTheBoard() {
        Fixture trip = tripWithAMember();

        String pollId = askAs(trip.member(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));

        assertThat(activeIdsOf(boardAs(trip.owner(), trip)))
                .as("creation is not owner-gated, and the board is shared")
                .containsExactly(pollId);
        assertThat(activeIdsOf(boardAs(trip.member(), trip))).containsExactly(pollId);
    }


    @Test
    void theActivePollsStackNewestFirst() {
        Fixture trip = tripWithAMember();

        String first = askAs(trip.owner(), trip, "First", List.of("A", "B"));
        String second = askAs(trip.owner(), trip, "Second", List.of("A", "B"));

        assertThat(activeIdsOf(boardAs(trip.owner(), trip)))
                .as("the canvas rule — newest-first, superseding the grilling's closing-soonest default")
                .containsExactly(second, first);
    }


    @Test
    void aVoteIsAttributedAndCountedOnTheOptionItNames() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        List<String> options = optionIdsOf(pollAs(trip.owner(), trip, pollId));

        JsonNode voted = voteAs(trip.member(), trip, pollId, options.getFirst());

        assertThat(voted.get("myVoteOptionId").asString()).isEqualTo(options.getFirst());
        assertThat(voteCountsOf(voted)).containsExactly(1, 0);
        assertThat(voterIdsOn(voted, 0))
                .as("attribution is visible from the moment the poll opens — the voter rides the option")
                .containsExactly(rig.travelerIdOf(trip.member()).toString());
        assertThat(voterIdsOn(voted, 1)).isEmpty();
    }


    @Test
    void reVotingMovesTheVoteRatherThanAddingASecondOne() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        List<String> options = optionIdsOf(pollAs(trip.owner(), trip, pollId));

        voteAs(trip.member(), trip, pollId, options.getFirst());
        JsonNode moved = voteAs(trip.member(), trip, pollId, options.get(1));

        assertThat(voteCountsOf(moved))
                .as("INV-10 is an upsert — a changed mind moves one vote, it never mints a second")
                .containsExactly(0, 1);
        assertThat(votesOnPoll(pollId)).isEqualTo(1);
    }


    @Test
    void theProgressDenominatorIsTheLiveMemberCount() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        List<String> options = optionIdsOf(pollAs(trip.owner(), trip, pollId));

        JsonNode afterOneVote = voteAs(trip.owner(), trip, pollId, options.getFirst());

        assertThat(afterOneVote.get("votedCount").asInt()).isEqualTo(1);
        assertThat(afterOneVote.get("memberCount").asInt())
                .as("M is the live member count, owner included")
                .isEqualTo(2);
    }


    @Test
    void aStrangerIsMaskedOnEveryOneOfTheFiveDoors() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        String optionId = optionIdsOf(pollAs(trip.owner(), trip, pollId)).getFirst();
        String stranger = rig.travelerWithHandle(handle());

        rig.send(HttpMethod.GET, pollsUri(trip), stranger, null).expectStatus().isNotFound();
        rig.send(HttpMethod.POST, pollsUri(trip), stranger, createBody("Theirs", List.of("A", "B"), inADay()))
                .expectStatus()
                .isNotFound();
        rig.send(
                        HttpMethod.PUT,
                        pollsUri(trip) + "/" + pollId + "/vote",
                        stranger,
                        "{\"optionId\":\"" + optionId + "\"}")
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.POST, pollsUri(trip) + "/" + pollId + "/close", stranger, null)
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.DELETE, pollsUri(trip) + "/" + pollId, stranger, null)
                .expectStatus()
                .isNotFound();
    }


    @Test
    void theCreatorClosesEarlyAndTheWinnerIsStarredWithNoFurtherWrite() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.member(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        List<String> options = optionIdsOf(pollAs(trip.member(), trip, pollId));
        voteAs(trip.owner(), trip, pollId, options.getFirst());

        JsonNode closed = closeAs(trip.member(), trip, pollId);

        assertThat(closed.get("status").asString()).isEqualTo("closed");
        assertThat(winnerIdsOf(closed)).containsExactly(options.getFirst());
        assertThat(completedIdsOf(boardAs(trip.owner(), trip))).containsExactly(pollId);
        assertThat(activeIdsOf(boardAs(trip.owner(), trip))).isEmpty();
    }


    @Test
    void theTripOwnerClosesAndDeletesAPollTheyDidNotStart() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.member(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));

        closeAs(trip.owner(), trip, pollId);
        rig.send(HttpMethod.DELETE, pollsUri(trip) + "/" + pollId, trip.owner(), null)
                .expectStatus()
                .isNoContent();

        assertThat(completedIdsOf(boardAs(trip.owner(), trip))).isEmpty();
    }


    @Test
    void aPlainMemberMayNeitherCloseNorDeleteSomebodyElsesPoll() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));

        rig.send(HttpMethod.POST, pollsUri(trip) + "/" + pollId + "/close", trip.member(), null)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
        rig.send(HttpMethod.DELETE, pollsUri(trip) + "/" + pollId, trip.member(), null)
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_PERMITTED");
    }


    @Test
    void votingOnAClosedPollIsRefusedByName() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        String optionId = optionIdsOf(pollAs(trip.owner(), trip, pollId)).getFirst();
        closeAs(trip.owner(), trip, pollId);

        rig.send(
                        HttpMethod.PUT,
                        pollsUri(trip) + "/" + pollId + "/vote",
                        trip.member(),
                        "{\"optionId\":\"" + optionId + "\"}")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POLL_CLOSED");
    }


    @Test
    void closingATwiceClosedPollIsRefusedByName() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        closeAs(trip.owner(), trip, pollId);

        rig.send(HttpMethod.POST, pollsUri(trip) + "/" + pollId + "/close", trip.owner(), null)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POLL_CLOSED");
    }


    @Test
    void anOptionFromAnotherPollIsNotAnOptionOnThisOne() {
        Fixture trip = tripWithAMember();
        String mine = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        String other = askAs(trip.owner(), trip, "Breakfast?", List.of("Eggs", "Toast"));
        String foreign = optionIdsOf(pollAs(trip.owner(), trip, other)).getFirst();

        rig.send(
                        HttpMethod.PUT,
                        pollsUri(trip) + "/" + mine + "/vote",
                        trip.owner(),
                        "{\"optionId\":\"" + foreign + "\"}")
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POLL_OPTION_NOT_FOUND");
    }


    @Test
    void aPollOfAnotherTripIsNotFoundThroughThisTripsDoor() {
        Fixture mine = tripWithAMember();
        Fixture theirs = tripWithAMember();
        String elsewhere = askAs(theirs.owner(), theirs, "Elsewhere", List.of("A", "B"));

        rig.send(HttpMethod.POST, pollsUri(mine) + "/" + elsewhere + "/close", mine.owner(), null)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POLL_NOT_FOUND");
    }


    @Test
    void everyCapIsRefusedByNameRatherThanByAConstraintViolation() {
        Fixture trip = tripWithAMember();

        refusal(trip, createBody("Q", List.of("only one"), inADay()), "POLL_OPTION_COUNT");
        refusal(trip, createBody("Q", eleven(), inADay()), "POLL_OPTION_COUNT");
        refusal(trip, createBody("x".repeat(121), List.of("A", "B"), inADay()), "POLL_QUESTION_TOO_LONG");
        refusal(trip, createBody("Q", List.of("x".repeat(81), "B"), inADay()), "POLL_OPTION_TOO_LONG");
        refusal(trip, createBody("   ", List.of("A", "B"), inADay()), "POLL_QUESTION_MISSING");
        refusal(
                trip,
                createBody("Q", List.of("A", "B"), Instant.now().minus(Duration.ofMinutes(1))),
                "POLL_DEADLINE_NOT_FUTURE");
    }


    @Test
    void aBlankOptionCannotSmuggleAnEleventhPastTheCap() {
        Fixture trip = tripWithAMember();
        List<String> elevenWithABlank = new ArrayList<>(eleven());
        elevenWithABlank.set(3, "   ");

        refusal(trip, createBody("Q", elevenWithABlank, inADay()), "POLL_OPTION_COUNT");
    }


    @Test
    void aBlankOptionCannotSmuggleAPollPastTheFloorEither() {
        Fixture trip = tripWithAMember();

        refusal(trip, createBody("Q", List.of("Only real one", "   "), inADay()), "POLL_OPTION_COUNT");
    }

    @Test
    void theTwentySixthOpenPollIsRefusedWhileAClosedOneFreesTheSlot() {
        Fixture trip = tripWithAMember();
        String first = null;
        for (int i = 0; i < 25; i++) {
            String created = askAs(trip.owner(), trip, "Poll " + i, List.of("A", "B"));
            if (first == null) {
                first = created;
            }
        }

        refusal(trip, createBody("One too many", List.of("A", "B"), inADay()), "TOO_MANY_OPEN_POLLS");

        closeAs(trip.owner(), trip, first);
        assertThat(askAs(trip.owner(), trip, "Now there is room", List.of("A", "B"))).isNotBlank();
    }


    @Test
    void anArchivedTripFreezesPollWritesForTheOwnerAndHidesTheBoardFromEveryoneElse() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        String optionId = optionIdsOf(pollAs(trip.owner(), trip, pollId)).getFirst();
        archive(trip);

        assertThat(activeIdsOf(boardAs(trip.owner(), trip)))
                .as("S4.23 posture: the owner still reads a frozen board")
                .containsExactly(pollId);
        rig.send(HttpMethod.GET, pollsUri(trip), trip.member(), null).expectStatus().isNotFound();

        rig.send(HttpMethod.POST, pollsUri(trip), trip.owner(), createBody("After", List.of("A", "B"), inADay()))
                .expectStatus()
                .isEqualTo(409);
        rig.send(
                        HttpMethod.PUT,
                        pollsUri(trip) + "/" + pollId + "/vote",
                        trip.owner(),
                        "{\"optionId\":\"" + optionId + "\"}")
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.POST, pollsUri(trip) + "/" + pollId + "/close", trip.owner(), null)
                .expectStatus()
                .isEqualTo(409);
        rig.send(HttpMethod.DELETE, pollsUri(trip) + "/" + pollId, trip.owner(), null)
                .expectStatus()
                .isEqualTo(409);
    }


    @Test
    void anArchivedTripsPollWritesAreNotFoundForANonOwnerMember() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.member(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        String optionId = optionIdsOf(pollAs(trip.member(), trip, pollId)).getFirst();
        archive(trip);

        rig.send(
                        HttpMethod.PUT,
                        pollsUri(trip) + "/" + pollId + "/vote",
                        trip.member(),
                        "{\"optionId\":\"" + optionId + "\"}")
                .expectStatus()
                .isNotFound();
        rig.send(HttpMethod.DELETE, pollsUri(trip) + "/" + pollId, trip.member(), null)
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aDepartedMembersVoteVanishesWithTheirMembershipAndTheDenominatorDrops() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.owner(), trip, "Dinner tonight?", List.of("Ramen", "Tacos"));
        List<String> options = optionIdsOf(pollAs(trip.owner(), trip, pollId));
        voteAs(trip.member(), trip, pollId, options.getFirst());
        voteAs(trip.owner(), trip, pollId, options.get(1));

        rig.send(
                        HttpMethod.DELETE,
                        "/v1/itineraries/" + trip.tripId() + "/members/" + rig.travelerIdOf(trip.member()),
                        trip.owner(),
                        null)
                .expectStatus()
                .isNoContent();

        JsonNode afterDeparture = onlyActive(boardAs(trip.owner(), trip));
        assertThat(voteCountsOf(afterDeparture))
                .as("the cascade is schema-level — no service code removes a departed member's vote")
                .containsExactly(0, 1);
        assertThat(voterIdsOn(afterDeparture, 0)).isEmpty();
        assertThat(afterDeparture.get("memberCount").asInt()).isEqualTo(1);
        assertThat(afterDeparture.get("votedCount").asInt()).isEqualTo(1);
        assertThat(votesOnPoll(pollId)).isEqualTo(1);
    }


    @Test
    void aPollOutlivesTheMemberWhoAskedIt_andTheOwnerCanStillCloseAndDeleteIt() {
        Fixture trip = tripWithAMember();
        String pollId = askAs(trip.member(), trip, "Asked by someone who leaves", List.of("A", "B"));
        List<String> options = optionIdsOf(pollAs(trip.owner(), trip, pollId));
        voteAs(trip.owner(), trip, pollId, options.getFirst());

        rig.send(
                        HttpMethod.DELETE,
                        "/v1/itineraries/" + trip.tripId() + "/members/" + rig.travelerIdOf(trip.member()),
                        trip.owner(),
                        null)
                .expectStatus()
                .isNoContent();

        JsonNode survivor = onlyActive(boardAs(trip.owner(), trip));
        assertThat(survivor.get("id").asString())
                .as("the poll is the group's question once asked — only the VOTE dies with the membership")
                .isEqualTo(pollId);
        assertThat(voteCountsOf(survivor)).containsExactly(1, 0);

        closeAs(trip.owner(), trip, pollId);
        rig.send(HttpMethod.DELETE, pollsUri(trip) + "/" + pollId, trip.owner(), null)
                .expectStatus()
                .isNoContent();
    }

    private Fixture tripWithAMember() {
        String owner = rig.travelerWithHandle(handle());
        String tripId = rig.createTrip(owner, 3);
        String member = rig.joinAsMember(owner, tripId, handle());
        return new Fixture(tripId, owner, member);
    }


    private String askAs(String token, Fixture trip, String question, List<String> options) {
        byte[] created =
                rig.send(HttpMethod.POST, pollsUri(trip), token, createBody(question, options, inADay()))
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return parse(new String(created)).get("id").asString();
    }


    private JsonNode voteAs(String token, Fixture trip, String pollId, String optionId) {
        return parse(new String(
                rig.send(
                                HttpMethod.PUT,
                                pollsUri(trip) + "/" + pollId + "/vote",
                                token,
                                "{\"optionId\":\"" + optionId + "\"}")
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent()));
    }


    private JsonNode closeAs(String token, Fixture trip, String pollId) {
        return parse(
                new String(
                        rig.send(HttpMethod.POST, pollsUri(trip) + "/" + pollId + "/close", token, null)
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent()));
    }


    private String boardAs(String token, Fixture trip) {
        return new String(
                rig.send(HttpMethod.GET, pollsUri(trip), token, null)
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent());
    }


    private JsonNode pollAs(String token, Fixture trip, String pollId) {
        JsonNode board = parse(boardAs(token, trip));
        for (JsonNode section : List.of(board.get("active"), board.get("completed"))) {
            for (JsonNode poll : section) {
                if (poll.get("id").asString().equals(pollId)) {
                    return poll;
                }
            }
        }
        throw new AssertionError("No poll " + pollId + " on the board");
    }


    private void refusal(Fixture trip, String body, String code) {
        rig.send(HttpMethod.POST, pollsUri(trip), trip.owner(), body)
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(code);
    }


    private static String pollsUri(Fixture trip) {
        return "/v1/itineraries/" + trip.tripId() + "/polls";
    }


    private void archive(Fixture trip) {
        rest.post()
                .uri("/v1/itineraries/" + trip.tripId() + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(trip.owner()))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private long votesOnPoll(String pollId) {
        Long count =
                jdbc.queryForObject(
                        "SELECT COUNT(*) FROM poll_vote WHERE poll_id = ?", Long.class, UUID.fromString(pollId));
        return count == null ? 0L : count;
    }


    static String createBody(String question, List<String> options, Instant closesAt) {
        String rendered =
                options.stream().map(option -> "\"" + option + "\"").reduce((a, b) -> a + "," + b).orElse("");
        return "{\"question\":\""
                + question
                + "\",\"options\":["
                + rendered
                + "],\"closesAt\":\""
                + closesAt
                + "\"}";
    }


    static Instant inADay() {
        return Instant.now().plus(Duration.ofDays(1));
    }


    private static List<String> eleven() {
        return List.of("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k");
    }


    private static JsonNode parse(String json) {
        return JSON.readTree(json);
    }


    static List<String> activeIdsOf(String board) {
        return idsIn(parse(board).get("active"));
    }


    static List<String> completedIdsOf(String board) {
        return idsIn(parse(board).get("completed"));
    }


    static JsonNode onlyActive(String board) {
        JsonNode active = parse(board).get("active");
        assertThat(active).hasSize(1);
        return active.get(0);
    }


    private static List<String> idsIn(JsonNode polls) {
        List<String> ids = new ArrayList<>();
        polls.forEach(poll -> ids.add(poll.get("id").asString()));
        return ids;
    }


    static List<String> optionIdsOf(JsonNode poll) {
        List<String> ids = new ArrayList<>();
        poll.get("options").forEach(option -> ids.add(option.get("id").asString()));
        return ids;
    }


    static List<Integer> voteCountsOf(JsonNode poll) {
        List<Integer> counts = new ArrayList<>();
        poll.get("options").forEach(option -> counts.add(option.get("voteCount").asInt()));
        return counts;
    }


    static List<String> voterIdsOn(JsonNode poll, int optionIndex) {
        List<String> ids = new ArrayList<>();
        poll.get("options")
                .get(optionIndex)
                .get("voters")
                .forEach(voter -> ids.add(voter.get("travelerId").asString()));
        return ids;
    }


    static List<String> winnerIdsOf(JsonNode poll) {
        List<String> ids = new ArrayList<>();
        poll.get("winningOptionIds").forEach(id -> ids.add(id.asString()));
        return ids;
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private record Fixture(String tripId, String owner, String member) {}
}
