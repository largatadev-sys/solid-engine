package com.largata.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
import com.largata.support.TestJwtSupport;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.util.MultiValueMap;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class AvatarContractIT extends ObjectStoreTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void anUploadedAvatarBecomesAMediaUrlOnTheProfile() throws IOException {
        String token = tokenFor("avatar-upload");

        String avatarUrl = uploadAvatar(token, photo(800, 800));

        assertThat(avatarUrl).startsWith("/v1/media/");
        rest.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.avatarUrl")
                .isEqualTo(avatarUrl);
    }


    @Test
    void theStoredAvatarIsServedBackAsAnImage() throws IOException {
        String token = tokenFor("avatar-serve");
        String avatarUrl = uploadAvatar(token, photo(800, 800));

        byte[] served =
                rest.get()
                        .uri(avatarUrl)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectHeader()
                        .contentType(MediaType.IMAGE_JPEG)
                        .expectBody(byte[].class)
                        .returnResult()
                        .getResponseBody();

        assertThat(ImageIO.read(new java.io.ByteArrayInputStream(served))).isNotNull();
    }


    @Test
    void theThumbnailIsServedAndIsSmallerThanTheDisplayVariant() throws IOException {
        String token = tokenFor("avatar-thumb");
        String avatarUrl = uploadAvatar(token, photo(1600, 1600));

        byte[] display = fetch(avatarUrl, token);
        byte[] thumb = fetch(avatarUrl + "/thumb", token);

        assertThat(widthOf(thumb)).isLessThan(widthOf(display));
    }


    @Test
    void anyAuthenticatedTravelerMayReadAnAvatar() throws IOException {
        String owner = tokenFor("avatar-owner");
        String stranger = tokenFor("avatar-stranger");
        String avatarUrl = uploadAvatar(owner, photo(400, 400));

        rest.get()
                .uri(avatarUrl)
                .header(HttpHeaders.AUTHORIZATION, bearer(stranger))
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void aVisitorWithNoTokenIsRefused() throws IOException {
        String token = tokenFor("avatar-visitor");
        String avatarUrl = uploadAvatar(token, photo(400, 400));

        rest.get().uri(avatarUrl).exchange().expectStatus().isUnauthorized();
    }


    @Test
    void removingTheAvatarClearsTheProfileAndTheServedBytes() throws IOException {
        String token = tokenFor("avatar-remove");
        String avatarUrl = uploadAvatar(token, photo(400, 400));

        rest.delete()
                .uri("/v1/me/avatar")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.avatarUrl")
                .doesNotExist();

        rest.get()
                .uri(avatarUrl)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void replacingTheAvatarMintsANewUrlAndRetiresTheOldOne() throws IOException {
        String token = tokenFor("avatar-replace");
        String first = uploadAvatar(token, photo(400, 400));

        String second = uploadAvatar(token, photo(600, 600));

        assertThat(second).isNotEqualTo(first);
        rest.get()
                .uri(first)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isNotFound();
    }


    @Test
    void bytesThatAreNotAnImageAreRefusedInTheStandardEnvelope() {
        rest.post()
                .uri("/v1/me/avatar")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenFor("avatar-not-image")))
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(multipart("<html>not a photo</html>".getBytes(StandardCharsets.UTF_8)))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("NOT_AN_IMAGE");
    }


    private String uploadAvatar(String token, byte[] image) {
        MeBody body =
                rest.post()
                        .uri("/v1/me/avatar")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.MULTIPART_FORM_DATA)
                        .body(multipart(image))
                        .exchange()
                        .expectStatus()
                        .isOk()
                        .expectBody(MeBody.class)
                        .returnResult()
                        .getResponseBody();
        assertThat(body).isNotNull();
        assertThat(body.avatarUrl()).isNotNull();
        return body.avatarUrl();
    }


    private record MeBody(String avatarUrl) {}


    private byte[] fetch(String url, String token) {
        return rest.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(byte[].class)
                .returnResult()
                .getResponseBody();
    }


    private static MultiValueMap<String, org.springframework.http.HttpEntity<?>> multipart(byte[] image) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("photo", new ByteArrayResource(image) {
            @Override
            public String getFilename() {
                return "photo.jpg";
            }
        }).contentType(MediaType.IMAGE_JPEG);
        return builder.build();
    }


    private static byte[] photo(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.MAGENTA);
        pen.fillRect(0, 0, width, height);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static int widthOf(byte[] jpeg) throws IOException {
        return ImageIO.read(new java.io.ByteArrayInputStream(jpeg)).getWidth();
    }


    private static String tokenFor(String tag) {
        String uid = tag + "-" + UUID.randomUUID();
        return TestJwtSupport.verifiedToken(uid, uid + "@example.com");
    }


    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
