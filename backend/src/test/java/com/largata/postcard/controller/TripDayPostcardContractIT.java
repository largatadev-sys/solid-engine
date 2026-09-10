package com.largata.postcard.controller;

import static com.largata.postcard.controller.PostcardOnDayContractIT.handle;
import static com.largata.support.TripRig.namedJpeg;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
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
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripDayPostcardContractIT extends ObjectStoreTestBase {

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
    void aMemberPostsOnATripDayWithNoActivityAndTheDerivedDiaryAndDayMint() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 3);
        String member = rig.joinAsMember(owner, trip, handle());
        start(owner, trip);
        UUID day = rig.dayAt(trip, 2);

        byte[] created =
                postOnTripDay(member, trip, day, "{\"caption\":\"Just the day\"}", 1)
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .jsonPath("$.tripId")
                        .isEqualTo(trip)
                        .jsonPath("$.activityId")
                        .doesNotExist()
                        .jsonPath("$.dayLabel")
                        .isEqualTo("Day 2")
                        .jsonPath("$.diaryId")
                        .exists()
                        .jsonPath("$.diaryDayId")
                        .exists()
                        .returnResult()
                        .getResponseBodyContent();
        String diaryId = TripRig.fieldIn(created, "diaryId");

        rest.get()
                .uri("/v1/diaries/" + diaryId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(member))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.tripId")
                .isEqualTo(trip)
                .jsonPath("$.title")
                .isEqualTo("Trip")
                .jsonPath("$.destination")
                .isEqualTo("Palawan")
                .jsonPath("$.days.length()")
                .isEqualTo(1)
                .jsonPath("$.days[0].ordinal")
                .isEqualTo(2)
                .jsonPath("$.days[0].tripDayId")
                .isEqualTo(day.toString());
    }


    @Test
    void aSecondPostcardOnTheSameTripDayReusesItsDay() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 3);
        start(owner, trip);
        UUID day = rig.dayAt(trip, 1);

        String first =
                TripRig.fieldIn(
                        postOnTripDay(owner, trip, day, "{\"caption\":\"One\"}", 1)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "diaryDayId");
        String second =
                TripRig.fieldIn(
                        postOnTripDay(owner, trip, day, "{\"caption\":\"Two\"}", 1)
                                .expectStatus()
                                .isCreated()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent(),
                        "diaryDayId");

        assertThat(second)
                .as("day-bound postcards without an activity are unlimited and share one day")
                .isEqualTo(first);
    }


    @Test
    void aNonMemberAnswersTheMaskedNotFoundAndADayOutsideTheTripIsNotFound() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        start(owner, trip);
        String stranger = rig.travelerWithHandle(handle());

        postOnTripDay(stranger, trip, rig.dayAt(trip, 1), "{\"caption\":\"Not mine\"}", 1)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_FOUND");

        String otherTrip = rig.createTrip(owner, 2);
        postOnTripDay(owner, trip, rig.dayAt(otherTrip, 1), "{\"caption\":\"Elsewhere\"}", 1)
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DAY_NOT_FOUND");
    }


    @Test
    void aTripThatHasNotStartedRefusesTheDayPostcardByName() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);

        postOnTripDay(owner, trip, rig.dayAt(trip, 1), "{\"caption\":\"Too early\"}", 1)
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_NOT_STARTED");
    }


    @Test
    void anArchivedTripFreezesTheDayPostcardForItsOwner() {
        String owner = rig.travelerWithHandle(handle());
        String trip = rig.createTrip(owner, 2);
        start(owner, trip);
        archive(owner, trip);

        postOnTripDay(owner, trip, rig.dayAt(trip, 1), "{\"caption\":\"Frozen\"}", 1)
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TRIP_ARCHIVED");
    }


    private RestTestClient.ResponseSpec postOnTripDay(
            String token, String trip, UUID day, String postcardJson, int photoCount) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("postcard", postcardJson).contentType(MediaType.APPLICATION_JSON);
        for (int i = 0; i < photoCount; i++) {
            body.part("photos", namedJpeg("photo" + i + ".jpg")).contentType(MediaType.IMAGE_JPEG);
        }
        return rest.post()
                .uri("/v1/trips/" + trip + "/days/" + day + "/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange();
    }


    private void start(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/start")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }


    private void archive(String owner, String trip) {
        rest.post()
                .uri("/v1/trips/" + trip + "/archive")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(owner))
                .exchange()
                .expectStatus()
                .isOk();
    }
}
