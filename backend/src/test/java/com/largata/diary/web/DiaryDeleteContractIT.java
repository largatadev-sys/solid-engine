package com.largata.diary.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.common.storage.ObjectStore;
import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
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
class DiaryDeleteContractIT extends ObjectStoreTestBase {

    private RestTestClient rest;
    private TripRig rig;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ObjectStore store;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        rig = new TripRig(rest, jdbc);
    }


    @Test
    void deletingADiaryDestroysItsPostcardsWhileEverythingOutsideItStands() {
        String author = rig.travelerWithHandle(handle());
        String doomed = createDiary(author, "Doomed album");
        String surviving = createDiary(author, "Surviving album");
        String inDoomed = postInto(author, doomed);
        String inDoomedToo = postInto(author, doomed);
        String inSurviving = postInto(author, surviving);
        String loose = postInto(author, null);
        String doomedPhotoUrl = photoUrlOf(author, inDoomed);
        List<String> doomedKeys =
                jdbc.queryForList(
                        "SELECT storage_key FROM photo WHERE subject_kind = 'POSTCARD'"
                                + " AND subject_id IN (?, ?)",
                        String.class,
                        UUID.fromString(inDoomed),
                        UUID.fromString(inDoomedToo));
        assertThat(doomedKeys).hasSize(2);
        doomedKeys.forEach(key -> assertThat(store.get(key)).as("stored before the delete").isPresent());

        rest.delete()
                .uri("/v1/diaries/" + doomed)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();

        rest.get()
                .uri("/v1/diaries/" + doomed)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
        for (String gone : new String[] {inDoomed, inDoomedToo}) {
            rest.get()
                    .uri("/v1/postcards/" + gone)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                    .exchange()
                    .expectStatus()
                    .isNotFound();
            assertThat(
                            jdbc.queryForObject(
                                    "SELECT count(*) FROM photo WHERE subject_kind = 'POSTCARD'"
                                            + " AND subject_id = ?",
                                    Integer.class,
                                    UUID.fromString(gone)))
                    .as("the postcard's photo rows die with the diary")
                    .isZero();
        }
        rest.get()
                .uri(doomedPhotoUrl)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
        doomedKeys.forEach(
                key ->
                        assertThat(store.get(key))
                                .as("the stored objects die with the diary: " + key)
                                .isEmpty());
        for (String standing : new String[] {inSurviving, loose}) {
            rest.get()
                    .uri("/v1/postcards/" + standing)
                    .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                    .exchange()
                    .expectStatus()
                    .isOk();
        }
        rest.get()
                .uri("/v1/diaries/" + surviving)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void aNonAuthorsDeleteIsMaskedAndARepeatAnswersNotFound() {
        String author = rig.travelerWithHandle(handle());
        String diary = createDiary(author, "Contested");
        String other = rig.travelerWithHandle(handle());

        rest.delete()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(other))
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
                .isOk();

        rest.delete()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNoContent();
        rest.delete()
                .uri("/v1/diaries/" + diary)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();
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


    private String postInto(String author, String diaryId) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        String postcardJson =
                diaryId == null ? "{\"caption\":\"Loose\"}" : "{\"diaryId\":\"" + diaryId + "\"}";
        parts.part("postcard", postcardJson).contentType(MediaType.APPLICATION_JSON);
        parts.part("photos", new ByteArrayResource(jpeg()) {
                    @Override
                    public String getFilename() {
                        return "moment.jpg";
                    }
                })
                .contentType(MediaType.IMAGE_JPEG);
        return TripRig.fieldIn(
                rest.post()
                        .uri("/v1/postcards")
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(parts.build())
                        .exchange()
                        .expectStatus()
                        .isCreated()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "id");
    }


    private String photoUrlOf(String author, String postcardId) {
        return TripRig.fieldIn(
                rest.get()
                        .uri("/v1/postcards/" + postcardId)
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent(),
                "url");
    }


    private static byte[] jpeg() {
        BufferedImage photo = new BufferedImage(320, 240, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < photo.getHeight(); y++) {
            for (int x = 0; x < photo.getWidth(); x++) {
                photo.setRGB(x, y, (x * 13 + y * 7) & 0xFFFFFF);
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
