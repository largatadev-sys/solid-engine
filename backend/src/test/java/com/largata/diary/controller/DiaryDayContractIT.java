package com.largata.diary.controller;

import static com.largata.diary.controller.DiaryContractIT.handle;
import static com.largata.diary.controller.DiaryContractIT.memoryBody;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.time.LocalDate;
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
class DiaryDayContractIT extends PostgresTestBase {

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
    void theOrdinalIsTheDatesDistanceFromTheStartSoASkippedDayLeavesAGap() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);

        assertThat(ordinalOf(author, diary, LocalDate.of(2026, 3, 15))).isEqualTo(1);
        assertThat(ordinalOf(author, diary, LocalDate.of(2026, 3, 16))).isEqualTo(2);
        assertThat(ordinalOf(author, diary, LocalDate.of(2026, 3, 19))).isEqualTo(5);

        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.days[0].ordinal")
                .isEqualTo(1)
                .jsonPath("$.days[1].ordinal")
                .isEqualTo(2)
                .jsonPath("$.days[2].ordinal")
                .isEqualTo(5);
    }


    @Test
    void aSecondDayOnTheSameDateIsRefusedByName() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        addDay(author, diary, LocalDate.of(2026, 3, 15), "Coron").expectStatus().isCreated();

        addDay(author, diary, LocalDate.of(2026, 3, 15), "Again")
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_DAY_ALREADY_EXISTS");
    }


    @Test
    void aDayOutsideTheRangeIsRefusedRatherThanWideningTheDiary() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);

        addDay(author, diary, LocalDate.of(2026, 3, 12), "Early")
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_DAY_OUTSIDE_RANGE");

        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.startDate")
                .isEqualTo("2026-03-15")
                .jsonPath("$.days.length()")
                .isEqualTo(0);
    }


    @Test
    void theAuthorEditsADaysPlace() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = dayIdOf(author, diary, LocalDate.of(2026, 3, 16), "Wrong");

        rest.patch()
                .uri("/v1/diaries/" + diary + "/days/" + day)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"place\":\"El Nido\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.place")
                .isEqualTo("El Nido")
                .jsonPath("$.ordinal")
                .isEqualTo(2);
    }


    @Test
    void deletingADayLeavesTheOthersOrdinalsAlone() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        dayIdOf(author, diary, LocalDate.of(2026, 3, 15), "One");
        String second = dayIdOf(author, diary, LocalDate.of(2026, 3, 16), "Two");
        dayIdOf(author, diary, LocalDate.of(2026, 3, 19), "Five");

        rest.delete()
                .uri("/v1/diaries/" + diary + "/days/" + second)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();

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
                .jsonPath("$.days[1].ordinal")
                .isEqualTo(5);
    }


    @Test
    void anotherTravelersDayWriteAnswersTheMaskedNotFound() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = dayIdOf(author, diary, LocalDate.of(2026, 3, 15), "Mine");
        String other = rig.travelerWithHandle(handle());

        rest.patch()
                .uri("/v1/diaries/" + diary + "/days/" + day)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"place\":\"Hijacked\"}")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NOT_FOUND");
        addDay(other, diary, LocalDate.of(2026, 3, 17), "Theirs").expectStatus().isNotFound();
        rest.delete()
                .uri("/v1/diaries/" + diary + "/days/" + day)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aCandidateDayIsNeverStoredUntilItHoldsSomething() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM diary_day WHERE diary_id = ?",
                                Integer.class,
                                UUID.fromString(diary)))
                .as("the create answers five candidate days and stores none of them")
                .isZero();
    }


    @Test
    void aDayNeedsADate() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);

        rest.post()
                .uri("/v1/diaries/" + diary + "/days")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"place\":\"Nowhere\"}")
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_DAY_NEEDS_A_DATE");
    }


    private int ordinalOf(String author, String diaryId, LocalDate date) {
        return Integer.parseInt(
                TripRig.numberIn(
                        addDay(author, diaryId, date, "Somewhere")
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "ordinal"));
    }


    private String dayIdOf(String author, String diaryId, LocalDate date, String place) {
        return TripRig.fieldIn(
                addDay(author, diaryId, date, place)
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private RestTestClient.ResponseSpec addDay(
            String author, String diaryId, LocalDate date, String place) {
        return rest.post()
                .uri("/v1/diaries/" + diaryId + "/days")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"date\":\"" + date + "\",\"place\":\"" + place + "\"}")
                .exchange();
    }


    private String memory(String author) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(memoryBody("Palawan by boat", "Palawan", START, END))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }
}
