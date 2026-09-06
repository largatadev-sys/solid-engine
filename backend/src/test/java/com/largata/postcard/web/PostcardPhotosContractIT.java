package com.largata.postcard.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.util.MultiValueMap;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class PostcardPhotosContractIT extends ObjectStoreTestBase {

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
    void theOwnerAddsPhotosAndTheReadCarriesThem() {
        String author = rig.travelerWithHandle(handle());
        String postcard = postcardOf(author, 1);

        rest.post()
                .uri("/v1/postcards/" + postcard + "/photos")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(photoParts(2))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.photos.length()")
                .isEqualTo(3);

        rest.get()
                .uri("/v1/postcards/" + postcard)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.photos.length()")
                .isEqualTo(3);
    }


    @Test
    void aSixthPhotoAndAnEmptyAddAreEachRefusedByName() {
        String author = rig.travelerWithHandle(handle());
        String full = postcardOf(author, 5);

        rest.post()
                .uri("/v1/postcards/" + full + "/photos")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(photoParts(1))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("TOO_MANY_POSTCARD_PHOTOS");

        rest.post()
                .uri("/v1/postcards/" + full + "/photos")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(photoParts(0))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NEEDS_A_PHOTO");
    }


    @Test
    void theOwnerRemovesAPhotoButNeverTheLastOne() {
        String author = rig.travelerWithHandle(handle());
        String postcard = postcardOf(author, 2);
        List<String> photoIds = photoIdsOf(author, postcard);

        String remaining =
                new String(
                        rest.delete()
                                .uri("/v1/postcards/" + postcard + "/photos/" + photoIds.get(0))
                                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .jsonPath("$.photos.length()")
                                .isEqualTo(1)
                                .returnResult()
                                .getResponseBodyContent());
        assertThat(JsonPath.<List<String>>read(remaining, "$.photos[*].id"))
                .containsExactly(photoIds.get(1));

        rest.delete()
                .uri("/v1/postcards/" + postcard + "/photos/" + photoIds.get(1))
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NEEDS_A_PHOTO");
    }


    @Test
    void aPhotoOfAnotherPostcardCannotBeRemovedThroughThisOne() {
        String author = rig.travelerWithHandle(handle());
        String mine = postcardOf(author, 2);
        String other = postcardOf(author, 2);
        String othersPhoto = photoIdsOf(author, other).get(0);

        rest.delete()
                .uri("/v1/postcards/" + mine + "/photos/" + othersPhoto)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                .exchange()
                .expectStatus()
                .isNotFound();

        assertThat(photoIdsOf(author, other)).hasSize(2);
    }


    @Test
    void anotherTravelersPhotoActsAnswerAsIfThePostcardDidNotExist() {
        String author = rig.travelerWithHandle(handle());
        String stranger = rig.travelerWithHandle(handle());
        String postcard = postcardOf(author, 2);
        String photo = photoIdsOf(author, postcard).get(0);

        rest.post()
                .uri("/v1/postcards/" + postcard + "/photos")
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(photoParts(1))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NOT_FOUND");

        rest.delete()
                .uri("/v1/postcards/" + postcard + "/photos/" + photo)
                .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(stranger))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("POSTCARD_NOT_FOUND");

        assertThat(photoIdsOf(author, postcard)).hasSize(2);
    }


    private String postcardOf(String author, int photoCount) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("postcard", "{\"caption\":\"Editable\"}").contentType(MediaType.APPLICATION_JSON);
        addPhotos(parts, photoCount);
        byte[] body =
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
                        .getResponseBodyContent();
        return JsonPath.read(new String(body), "$.id");
    }


    private List<String> photoIdsOf(String author, String postcard) {
        byte[] body =
                rest.get()
                        .uri("/v1/postcards/" + postcard)
                        .header(HttpHeaders.AUTHORIZATION, TripRig.bearer(author))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();
        return JsonPath.read(new String(body), "$.photos[*].id");
    }


    private static MultiValueMap<String, HttpEntity<?>> photoParts(int photoCount) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        addPhotos(parts, photoCount);
        return parts.build();
    }


    private static void addPhotos(MultipartBodyBuilder parts, int photoCount) {
        for (int ordinal = 0; ordinal < photoCount; ordinal++) {
            String filename = "later-" + ordinal + ".jpg";
            parts.part("photos", new ByteArrayResource(jpeg()) {
                        @Override
                        public String getFilename() {
                            return filename;
                        }
                    })
                    .contentType(MediaType.IMAGE_JPEG);
        }
    }


    private static String handle() {
        return "t" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }


    private static byte[] jpeg() {
        BufferedImage photo = new BufferedImage(320, 240, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < photo.getHeight(); y++) {
            for (int x = 0; x < photo.getWidth(); x++) {
                photo.setRGB(x, y, (x * 7 + y * 3) & 0xFFFFFF);
            }
        }
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(photo, "jpg", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
