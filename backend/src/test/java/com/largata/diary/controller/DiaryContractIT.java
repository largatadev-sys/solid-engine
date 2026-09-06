package com.largata.diary.controller;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DiaryContractIT extends PostgresTestBase {

    private static final LocalDate START = LocalDate.of(2026, 3, 15);
    private static final LocalDate END = LocalDate.of(2026, 3, 19);

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
    void aMemoryIsCreatedFromATitleAndItsDatesAndAnswersOneCandidateDayPerDate() {
        String author = rig.travelerWithHandle(handle());

        rest.post()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body(memoryBody("Palawan by boat", "Palawan", START, END))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.id")
                .exists()
                .jsonPath("$.title")
                .isEqualTo("Palawan by boat")
                .jsonPath("$.destination")
                .isEqualTo("Palawan")
                .jsonPath("$.startDate")
                .isEqualTo("2026-03-15")
                .jsonPath("$.endDate")
                .isEqualTo("2026-03-19")
                .jsonPath("$.tripId")
                .doesNotExist()
                .jsonPath("$.candidateDates.length()")
                .isEqualTo(5)
                .jsonPath("$.candidateDates[0]")
                .isEqualTo("2026-03-15")
                .jsonPath("$.candidateDates[4]")
                .isEqualTo("2026-03-19")
                .jsonPath("$.days.length()")
                .isEqualTo(0)
                .jsonPath("$.postcardCount")
                .isEqualTo(0);
    }


    @Test
    void theDestinationIsOptional() {
        String author = rig.travelerWithHandle(handle());

        rest.post()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body(memoryBody("Somewhere", null, START, END))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.destination")
                .doesNotExist();
    }


    @Test
    void aBlankTitleMissingDatesAndAReversedRangeAreEachRefusedByName() {
        String author = rig.travelerWithHandle(handle());

        refused(author, memoryBody("   ", null, START, END), "DIARY_NEEDS_A_TITLE");
        refused(author, memoryBody("No dates", null, null, null), "DIARY_NEEDS_ITS_DATES");
        refused(author, memoryBody("Backwards", null, END, START), "DIARY_ENDS_BEFORE_IT_STARTS");
        refused(
                author,
                memoryBody("Not yet", null, LocalDate.now().plusDays(3), LocalDate.now().plusDays(4)),
                "DIARY_HAS_NOT_HAPPENED_YET");
        refused(
                author,
                memoryBody("x".repeat(121), null, START, END),
                "DIARY_TITLE_TOO_LONG");
    }


    @Test
    void aDiaryReadsBackItsFieldsItsDaysInOrderAndItsCounts() {
        String author = rig.travelerWithHandle(handle());
        String diary = createMemory(author, "Palawan by boat", "Palawan", START, END);
        addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");
        addDay(author, diary, LocalDate.of(2026, 3, 15), "Coron");

        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days.length()")
                .isEqualTo(2)
                .jsonPath("$.days[0].ordinal")
                .isEqualTo(1)
                .jsonPath("$.days[0].place")
                .isEqualTo("Coron")
                .jsonPath("$.days[1].ordinal")
                .isEqualTo(2)
                .jsonPath("$.days[1].place")
                .isEqualTo("El Nido")
                .jsonPath("$.dayCount")
                .isEqualTo(2)
                .jsonPath("$.postcardCount")
                .isEqualTo(0);
    }


    @Test
    void aDiaryReadsBackTheDatesStillWithoutADayAsItsCandidates() {
        String author = rig.travelerWithHandle(handle());
        String diary = createMemory(author, "Palawan by boat", "Palawan", START, END);
        addDay(author, diary, START, "Coron");

        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.candidateDates.length()")
                .isEqualTo(4)
                .jsonPath("$.candidateDates[0]")
                .isEqualTo("2026-03-16")
                .jsonPath("$.candidateDates[3]")
                .isEqualTo("2026-03-19")
                .jsonPath("$.days.length()")
                .isEqualTo(1);
    }


    @Test
    void editingTheDatesNeitherCreatesNorDeletesADay() {
        String author = rig.travelerWithHandle(handle());
        String diary = createMemory(author, "Palawan by boat", "Palawan", START, END);
        addDay(author, diary, LocalDate.of(2026, 3, 19), "Coron");

        rest.patch()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body(memoryBody("Palawan, shortened", "Palawan", START, LocalDate.of(2026, 3, 16)))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Palawan, shortened")
                .jsonPath("$.endDate")
                .isEqualTo("2026-03-16")
                .jsonPath("$.days.length()")
                .isEqualTo(1)
                .jsonPath("$.days[0].date")
                .isEqualTo("2026-03-19");
    }


    @Test
    void anotherTravelersWriteAnswersAsIfTheDiaryDidNotExist() {
        String author = rig.travelerWithHandle(handle());
        String diary = createMemory(author, "Original", null, START, END);
        String other = rig.travelerWithHandle(handle());

        rest.patch()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .contentType(MediaType.APPLICATION_JSON)
                .body(memoryBody("Hijacked", null, START, END))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NOT_FOUND");
        rest.delete()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Original");
    }


    @Test
    void theAuthorListsTheirDiaries() {
        String author = rig.travelerWithHandle(handle());
        createMemory(author, "Coffee crawls", null, START, END);
        createMemory(author, "Night markets", null, START, END);

        rest.get()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(2);
    }


    @Test
    void deletingADiaryTakesItsDaysWithIt() {
        String author = rig.travelerWithHandle(handle());
        String diary = createMemory(author, "Palawan by boat", "Palawan", START, END);
        addDay(author, diary, START, "Coron");

        rest.delete()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();

        org.assertj.core.api.Assertions.assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM diary_day WHERE diary_id = ?",
                                Integer.class,
                                UUID.fromString(diary)))
                .as("the delete cascades downward at the storage seam, not only in the response")
                .isZero();
        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aPrivateAuthorsDiaryAnswersAStrangerByTheProfileFenceAndAFollowerInFull() {
        String author = onboarded();
        String follower = onboarded();
        String stranger = onboarded();
        follow(follower, rig.travelerIdOf(author));
        String diaryId = createMemory(author, "Ours alone", null, START, END);
        goPrivate(author);

        rest.get()
                .uri("/v1/diaries/" + diaryId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PROFILE_PRIVATE");
        for (String admitted : List.of(follower, author)) {
            rest.get()
                    .uri("/v1/diaries/" + diaryId)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(admitted))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private void refused(String author, String body, String code) {
        rest.post()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo(code);
    }


    private String createMemory(
            String author, String title, String destination, LocalDate start, LocalDate end) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(memoryBody(title, destination, start, end))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private void addDay(String author, String diaryId, LocalDate date, String place) {
        rest.post()
                .uri("/v1/diaries/" + diaryId + "/days")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"date\":\"" + date + "\",\"place\":\"" + place + "\"}")
                .exchange()
                .expectStatus()
                .isCreated();
    }


    static String memoryBody(String title, String destination, LocalDate start, LocalDate end) {
        return "{\"title\":"
                + quoted(title)
                + ",\"destination\":"
                + quoted(destination)
                + ",\"startDate\":"
                + quoted(start == null ? null : start.toString())
                + ",\"endDate\":"
                + quoted(end == null ? null : end.toString())
                + "}";
    }


    private static String quoted(String value) {
        return value == null ? "null" : "\"" + value + "\"";
    }


    private String onboarded() {
        String token = rig.travelerWithHandle(handle());
        rest.post()
                .uri("/v1/me/onboarding-completion")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .exchange()
                .expectStatus()
                .isOk();
        return token;
    }


    private void follow(String follower, UUID followeeId) {
        rest.post()
                .uri("/v1/travelers/" + followeeId + "/follow")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(follower))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void goPrivate(String token) {
        rest.patch()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"profileVisibility\":\"private\"}")
                .exchange()
                .expectStatus()
                .isOk();
    }


    static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
