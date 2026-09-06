package com.largata.diary.controller;

import static com.largata.diary.controller.DiaryContractIT.handle;
import static com.largata.diary.controller.DiaryContractIT.memoryBody;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
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
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class DiaryCoverContractIT extends ObjectStoreTestBase {

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
    void theAuthorUploadsReplacesAndRemovesTheCover() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);

        String first =
                TripRig.fieldIn(
                        uploadCover(author, diary)
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .jsonPath("$.cover.url")
                                .exists()
                                .returnResult()
                                .getResponseBodyContent(),
                        "id");
        assertThat(coverCount(diary)).as("a diary holds one cover").isEqualTo(1);

        uploadCover(author, diary).expectStatus().isOk();
        assertThat(coverCount(diary)).as("uploading again replaces rather than adds").isEqualTo(1);

        rest.delete()
                .uri("/v1/diaries/" + diary + "/cover")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.cover")
                .doesNotExist();
        assertThat(coverCount(diary)).isZero();
        assertThat(first).as("the cover acts answer the diary itself").isEqualTo(diary);
    }


    @Test
    void aDiaryWithNoCoverOfItsOwnRendersItsFirstPostcardPhoto() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String day = addDay(author, diary, LocalDate.of(2026, 3, 16));
        postOn(author, diary, day);

        rest.get()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.cover.url")
                .exists();
    }


    @Test
    void anotherTravelersCoverWriteAnswersTheMaskedNotFound() {
        String author = rig.travelerWithHandle(handle());
        String diary = memory(author);
        String other = rig.travelerWithHandle(handle());

        uploadCover(other, diary).expectStatus().isNotFound();
        rest.delete()
                .uri("/v1/diaries/" + diary + "/cover")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void aPrivateAuthorsCoverIsFencedByTheProfileVisibilityAndMaskedAsNotFound() {
        String author = onboarded();
        String follower = onboarded();
        String stranger = onboarded();
        follow(follower, rig.travelerIdOf(author));
        String diary = memory(author);
        String coverUrl =
                urlIn(
                        uploadCover(author, diary)
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .returnResult()
                                .getResponseBodyContent());
        goPrivate(author);

        rest.get()
                .uri(coverUrl)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound();
        for (String admitted : List.of(follower, author)) {
            rest.get()
                    .uri(coverUrl)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(admitted))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
    }


    private int coverCount(String diaryId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM photo WHERE subject_kind = 'DIARY_COVER' AND subject_id = ?",
                Integer.class,
                UUID.fromString(diaryId));
    }


    private static String urlIn(byte[] body) {
        String json = new String(body);
        int cover = json.indexOf("\"cover\":");
        String needle = "\"url\":\"";
        int start = json.indexOf(needle, cover) + needle.length();
        return json.substring(start, json.indexOf('"', start));
    }


    private RestTestClient.ResponseSpec uploadCover(String token, String diaryId) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("photo", TripRig.namedJpeg("cover.jpg")).contentType(MediaType.IMAGE_JPEG);
        return rest.put()
                .uri("/v1/diaries/" + diaryId + "/cover")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(token))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange();
    }


    private void postOn(String author, String diaryId, String dayId) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("postcard", "{\"caption\":\"First\"}").contentType(MediaType.APPLICATION_JSON);
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


    private String addDay(String author, String diaryId, LocalDate date) {
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/diaries/" + diaryId + "/days")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"date\":\"" + date + "\",\"place\":\"El Nido\"}")
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
                        .body(memoryBody("Palawan by boat", "Palawan", START, END))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
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
}
