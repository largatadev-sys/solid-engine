package com.largata.diary.web;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
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
    void aTravelerCreatesADiaryWithNothingButATitle() {
        String author = rig.travelerWithHandle(handle());

        rest.post()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Street food finds\"}")
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.id")
                .exists()
                .jsonPath("$.title")
                .isEqualTo("Street food finds")
                .jsonPath("$.tripId")
                .doesNotExist()
                .jsonPath("$.createdAt")
                .exists();
    }


    @Test
    void aBlankTitleIsRefusedByName() {
        String author = rig.travelerWithHandle(handle());

        rest.post()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"   \"}")
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NEEDS_A_TITLE");
    }


    @Test
    void theAuthorListsTheirManyDiariesAndReadsOneById() {
        String author = rig.travelerWithHandle(handle());
        String first = createDiary(author, "Coffee crawls");
        String second = createDiary(author, "Night markets");

        rest.get()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(2)
                .jsonPath("$.items[0].id")
                .isEqualTo(first)
                .jsonPath("$.items[1].id")
                .isEqualTo(second);
        rest.get()
                .uri("/v1/diaries/" + first)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Coffee crawls");
    }


    @Test
    void theListingIsMineAloneButAReadIsPublicAtPosting() {
        String author = rig.travelerWithHandle(handle());
        String diary = createDiary(author, "Coastal drives");
        String other = rig.travelerWithHandle(handle());

        rest.get()
                .uri("/v1/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.items.length()")
                .isEqualTo(0);
        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("Coastal drives");
    }


    @Test
    void anotherTravelersWriteAnswersAsIfTheDiaryDidNotExist() {
        String author = rig.travelerWithHandle(handle());
        String diary = createDiary(author, "Original");
        String other = rig.travelerWithHandle(handle());

        rest.patch()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"Hijacked\"}")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NOT_FOUND");
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
    void theAuthorRetitlesTheirDiary() {
        String author = rig.travelerWithHandle(handle());
        String diary = createDiary(author, "Working title");

        rest.patch()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"title\":\"The real title\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.title")
                .isEqualTo("The real title");
    }


    private String createDiary(String author, String title) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"title\":\"" + title + "\"}")
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
