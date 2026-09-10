package com.largata.diary.controller;

import static com.largata.diary.controller.DiaryContractIT.handle;
import static com.largata.diary.controller.DiaryContractIT.memoryBody;

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
class ProfileDiariesContractIT extends ObjectStoreTestBase {

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
    void theSectionsReadAnswersDiariesNewestFirstWithTheirDaysAndPostcardsInside() {
        String author = onboarded();
        String handle = handleOf(author);
        String older = memory(author, "Coron first");
        String newer = memory(author, "El Nido after");
        String day = addDay(author, newer, LocalDate.of(2026, 3, 16), "El Nido");
        postOn(author, newer, day);

        rest.get()
                .uri("/v1/travelers/" + handle + "/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.diaryCount")
                .isEqualTo(2)
                .jsonPath("$.diaries.length()")
                .isEqualTo(2)
                .jsonPath("$.diaries[0].id")
                .isEqualTo(newer)
                .jsonPath("$.diaries[0].title")
                .isEqualTo("El Nido after")
                .jsonPath("$.diaries[0].destination")
                .isEqualTo("Palawan")
                .jsonPath("$.diaries[0].postcardCount")
                .isEqualTo(1)
                .jsonPath("$.diaries[0].dayCount")
                .isEqualTo(1)
                .jsonPath("$.diaries[0].days[0].ordinal")
                .isEqualTo(2)
                .jsonPath("$.diaries[0].days[0].postcards.length()")
                .isEqualTo(1)
                .jsonPath("$.diaries[0].cover.url")
                .exists()
                .jsonPath("$.diaries[1].id")
                .isEqualTo(older)
                .jsonPath("$.diaries[1].itineraryId")
                .doesNotExist();
    }


    @Test
    void looseCardsAreSeparatedFromTheDiariesNewestFirst() {
        String author = onboarded();
        String handle = handleOf(author);
        memory(author, "A memory");
        String loose = loosePostcard(author);

        rest.get()
                .uri("/v1/travelers/" + handle + "/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.loosePostcards.length()")
                .isEqualTo(1)
                .jsonPath("$.loosePostcards[0].id")
                .isEqualTo(loose)
                .jsonPath("$.loosePostcards[0].diaryId")
                .doesNotExist()
                .jsonPath("$.diaryCount")
                .isEqualTo(1);
    }


    @Test
    void aDerivedSectionCarriesTheItineraryLinkOnlyOnceItsTripIsPublished() {
        String owner = onboarded();
        String handle = handleOf(owner);
        String trip = rig.createTrip(owner, 2);
        start(owner, trip);
        postOnTripDay(owner, trip, rig.dayAt(trip, 1));

        rest.get()
                .uri("/v1/travelers/" + handle + "/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.diaries[0].tripId")
                .isEqualTo(trip)
                .jsonPath("$.diaries[0].itineraryId")
                .doesNotExist();

        complete(owner, trip);
        publish(owner, trip);

        rest.get()
                .uri("/v1/travelers/" + handle + "/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.diaries[0].itineraryId")
                .exists();
    }


    @Test
    void aPrivateAuthorsSectionsAnswerAStrangerByTheFenceAndAFollowerInFull() {
        String author = onboarded();
        String handle = handleOf(author);
        String follower = onboarded();
        String stranger = onboarded();
        follow(follower, rig.travelerIdOf(author));
        memory(author, "Ours alone");
        goPrivate(author);

        rest.get()
                .uri("/v1/travelers/" + handle + "/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isForbidden()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("PROFILE_PRIVATE");
        rest.get()
                .uri("/v1/travelers/" + handle + "/diaries")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(follower))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.diaries.length()")
                .isEqualTo(1);
    }


    private void postOnTripDay(String token, String trip, UUID day) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("postcard", "{\"caption\":\"On the day\"}").contentType(MediaType.APPLICATION_JSON);
        body.part("photos", TripRig.namedJpeg("photo.jpg")).contentType(MediaType.IMAGE_JPEG);
        rest.post()
                .uri("/v1/trips/" + trip + "/days/" + day + "/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isCreated();
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


    private void postOn(String author, String diaryId, String dayId) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("postcard", "{\"caption\":\"On a day\"}").contentType(MediaType.APPLICATION_JSON);
        body.part("photos", TripRig.namedJpeg("photo.jpg")).contentType(MediaType.IMAGE_JPEG);
        rest.post()
                .uri("/v1/diaries/" + diaryId + "/days/" + dayId + "/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange()
                .expectStatus()
                .isCreated();
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


    private String memory(String author, String title) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(memoryBody(title, "Palawan", START, END))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private String handleOf(String token) {
        return TripRig.fieldIn(
                rest.get()
                        .uri("/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "handle");
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


    private void start(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/start")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void complete(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/complete")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void publish(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/publish")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
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
}
