package com.largata.postcard.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
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
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PostcardOnDayContractIT extends ObjectStoreTestBase {

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
    void aPostcardLandsOnADiaryDayAndReadsBackThere() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");

        String postcard =
                TripRig.fieldIn(
                        postOn(author, diary, day, "{\"caption\":\"The lagoon\"}", 2)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .jsonPath("$.diaryId")
                                .isEqualTo(diary)
                                .jsonPath("$.diaryDayId")
                                .isEqualTo(day)
                                .jsonPath("$.dayOrdinal")
                                .isEqualTo(2)
                                .jsonPath("$.photos.length()")
                                .isEqualTo(2)
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.postcardCount")
                .isEqualTo(1)
                .jsonPath("$.days[0].postcardCount")
                .isEqualTo(1)
                .jsonPath("$.days[0].postcards[0].id")
                .isEqualTo(postcard);
    }


    @Test
    void aPostcardWithNoPlaceOfItsOwnRendersItsDaysPlace() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");
        String postcard =
                TripRig.fieldIn(
                        postOn(author, diary, day, "{\"caption\":\"No place given\"}", 1)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.get()
                .uri("/v1/postcards/" + postcard)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.place")
                .isEqualTo("El Nido");
    }


    @Test
    void aPostcardKeepsItsOwnPlaceOverTheDays() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");

        postOn(author, diary, day, "{\"caption\":\"Mine\",\"place\":\"Big Lagoon\"}", 1)
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.place")
                .isEqualTo("Big Lagoon");
    }


    @Test
    void postingOntoSomeoneElsesDayAnswersTheMaskedNotFound() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");
        String other = rig.travelerWithHandle(handle());

        postOn(other, diary, day, "{\"caption\":\"Not mine\"}", 1)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NOT_FOUND");
    }


    @Test
    void aPostcardNeedsAtLeastOnePhotoAndAtMostFive() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");

        postOn(author, diary, day, "{\"caption\":\"None\"}", 0)
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NEEDS_A_PHOTO");
        postOn(author, diary, day, "{\"caption\":\"Six\"}", 6)
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TOO_MANY_POSTCARD_PHOTOS");
    }


    @Test
    void aLoosePostcardIsFiledOntoADayOnceAndNeverMovedAgain() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");
        String loose = loosePostcard(author);

        rest.patch()
                .uri("/v1/postcards/" + loose)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"diaryId\":\"" + diary + "\",\"diaryDayId\":\"" + day + "\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.diaryDayId")
                .isEqualTo(day)
                .jsonPath("$.dayOrdinal")
                .isEqualTo(2);

        String secondDay = addDay(author, diary, LocalDate.of(2026, 3, 17), "Coron");
        rest.patch()
                .uri("/v1/postcards/" + loose)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"diaryId\":\"" + diary + "\",\"diaryDayId\":\"" + secondDay + "\"}")
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_ALREADY_FILED");
    }


    @Test
    void filingOntoSomeoneElsesDiaryAnswersTheMaskedNotFound() {
        String author = rig.travelerWithHandle(handle());
        String loose = loosePostcard(author);
        String other = rig.travelerWithHandle(handle());
        String theirDiary = memory(other);
        String theirDay = addDay(other, theirDiary, LocalDate.of(2026, 3, 16), "Theirs");

        rest.patch()
                .uri("/v1/postcards/" + loose)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"diaryId\":\"" + theirDiary + "\",\"diaryDayId\":\"" + theirDay + "\"}")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NOT_FOUND");
    }


    @Test
    void deletingAPostcardLeavesItsDayStanding() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");
        String postcard =
                TripRig.fieldIn(
                        postOn(author, diary, day, "{\"caption\":\"Doomed\"}", 1)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.delete()
                .uri("/v1/postcards/" + postcard)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();

        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM diary_day WHERE id = ?",
                                Integer.class,
                                UUID.fromString(day)))
                .as("delete cascades downward and never upward")
                .isEqualTo(1);
    }


    @Test
    void deletingADayTakesItsPostcardsWithIt() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16), "El Nido");
        String postcard =
                TripRig.fieldIn(
                        postOn(author, diary, day, "{\"caption\":\"Doomed\"}", 1)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");

        rest.delete()
                .uri("/v1/diaries/" + diary + "/days/" + day)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/postcards/" + postcard)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    private RestTestClient.ResponseSpec postOn(
            String author, String diaryId, String dayId, String postcardJson, int photoCount) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("postcard", postcardJson).contentType(MediaType.APPLICATION_JSON);
        for (int i = 0; i < photoCount; i++) {
            body.part("photos", TripRig.namedJpeg("photo" + i + ".jpg")).contentType(MediaType.IMAGE_JPEG);
        }
        return rest.post()
                .uri("/v1/diaries/" + diaryId + "/days/" + dayId + "/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange();
    }


    private String loosePostcard(String author) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("postcard", "{\"caption\":\"From nowhere\"}").contentType(MediaType.APPLICATION_JSON);
        body.part("photos", TripRig.namedJpeg("loose.jpg")).contentType(MediaType.IMAGE_JPEG);
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/postcards")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(body.build())
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private String addDay(String author, String diaryId, LocalDate date, String place) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries/" + diaryId + "/days")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"date\":\"" + date + "\",\"place\":\"" + place + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private String memory(String author) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(
                                "{\"title\":\"Palawan by boat\",\"destination\":\"Palawan\","
                                        + "\"startDate\":\""
                                        + START
                                        + "\",\"endDate\":\""
                                        + END
                                        + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
