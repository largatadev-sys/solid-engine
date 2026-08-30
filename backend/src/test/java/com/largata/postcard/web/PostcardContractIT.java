package com.largata.postcard.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PostcardContractIT extends ObjectStoreTestBase {

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
    void aTravelerPostsALooseMomentAndAnyTravelerReadsIt() {
        String author = rig.travelerWithHandle(handle());

        byte[] created =
                rest.post()
                        .uri("/v1/postcards")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(postcardParts("{\"caption\":\"Golden hour\",\"place\":\"Malapascua\"}", 2))
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .jsonPath("$.caption")
                        .isEqualTo("Golden hour")
                        .jsonPath("$.place")
                        .isEqualTo("Malapascua")
                        .jsonPath("$.diaryId")
                        .doesNotExist()
                        .jsonPath("$.tripId")
                        .doesNotExist()
                        .jsonPath("$.photos.length()")
                        .isEqualTo(2)
                        .returnResult()
                        .getResponseBodyContent();
        String postcardId = TripRig.fieldIn(created, "id");
        String photoUrl = TripRig.fieldIn(created, "url");

        String other = rig.travelerWithHandle(handle());
        rest.get()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.caption")
                .isEqualTo("Golden hour");
        rest.get()
                .uri(photoUrl)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void aPostcardLandsInOneOfTheAuthorsOwnDiariesOrNowhere() {
        String author = rig.travelerWithHandle(handle());
        String diary = createDiary(author, "Island life");

        rest.post()
                .uri("/v1/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(postcardParts("{\"caption\":\"Homed\",\"diaryId\":\"" + diary + "\"}", 1))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.diaryId")
                .isEqualTo(diary);
    }


    @Test
    void postingIntoSomeoneElsesDiaryAnswersAsIfItDidNotExist() {
        String author = rig.travelerWithHandle(handle());
        String diary = createDiary(author, "Mine alone");
        String intruder = rig.travelerWithHandle(handle());

        rest.post()
                .uri("/v1/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(intruder))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(postcardParts("{\"diaryId\":\"" + diary + "\"}", 1))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("DIARY_NOT_FOUND");
    }


    @Test
    void aPostcardNeedsAPhotoAndHoldsAtMostFive() {
        String author = rig.travelerWithHandle(handle());

        rest.post()
                .uri("/v1/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(postcardParts("{\"caption\":\"No proof\"}", 0))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NEEDS_A_PHOTO");
        rest.post()
                .uri("/v1/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(postcardParts("{\"caption\":\"Too much proof\"}", 6))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TOO_MANY_POSTCARD_PHOTOS");
    }


    @Test
    void theAuthorRecaptionsAndDeletesByThePostcardsOwnAddress() {
        String author = rig.travelerWithHandle(handle());
        byte[] created = post(author, "{\"caption\":\"Before\"}", 1);
        String postcardId = TripRig.fieldIn(created, "id");
        String photoId = TripRig.fieldIn(created, "url").replace("/v1/media/", "");

        rest.patch()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"caption\":\"After\"}")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.caption")
                .isEqualTo("After");

        rest.delete()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
        assertThat(
                        jdbc.queryForObject(
                                "SELECT count(*) FROM photo WHERE subject_kind = 'POSTCARD'"
                                        + " AND subject_id = ?",
                                Integer.class,
                                UUID.fromString(postcardId)))
                .as("the photo rows die with the postcard")
                .isZero();
        rest.get()
                .uri("/v1/media/" + photoId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.delete()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NOT_FOUND");
    }


    @Test
    void aNonAuthorsWriteAnswersTheMaskedNotFound() {
        String author = rig.travelerWithHandle(handle());
        String postcardId = TripRig.fieldIn(post(author, "{\"caption\":\"Untouchable\"}", 1), "id");
        String other = rig.travelerWithHandle(handle());

        rest.patch()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"caption\":\"Hijacked\"}")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NOT_FOUND");
        rest.delete()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
                .exchange()
                .expectStatus()
                .isNotFound();
        rest.get()
                .uri("/v1/postcards/" + postcardId)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.caption")
                .isEqualTo("Untouchable");
    }


    private byte[] post(String author, String postcardJson, int photoCount) {
        return rest.post()
                .uri("/v1/postcards")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(postcardParts(postcardJson, photoCount))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .returnResult()
                .getResponseBodyContent();
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


    private static org.springframework.util.MultiValueMap<String, org.springframework.http.HttpEntity<?>>
            postcardParts(String postcardJson, int photoCount) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("postcard", postcardJson).contentType(MediaType.APPLICATION_JSON);
        for (int ordinal = 0; ordinal < photoCount; ordinal++) {
            String filename = "moment-" + ordinal + ".jpg";
            parts.part("photos", new ByteArrayResource(jpeg()) {
                        @Override
                        public String getFilename() {
                            return filename;
                        }
                    })
                    .contentType(MediaType.IMAGE_JPEG);
        }
        return parts.build();
    }


    private static byte[] jpeg() {
        BufferedImage photo = new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < photo.getHeight(); y++) {
            for (int x = 0; x < photo.getWidth(); x++) {
                photo.setRGB(x, y, (x * 11 + y * 5) & 0xFFFFFF);
            }
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try {
            ImageIO.write(photo, "jpg", bytes);
        } catch (IOException unwritable) {
            throw new UncheckedIOException(unwritable);
        }
        return bytes.toByteArray();
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}
