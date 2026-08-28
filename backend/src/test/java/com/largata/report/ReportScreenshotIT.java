package com.largata.report;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.media.ImageIngest;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
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
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ReportScreenshotIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }


    @Test
    void aSingleScreenshotIsSanitizedAndStored() throws IOException {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of(jpeg(3000, 2000))).expectStatus().isCreated();

        List<byte[]> stored = screenshotsOf(reportId);
        assertThat(stored).hasSize(1);
        assertThat(widthOf(stored.getFirst())).isEqualTo(ImageIngest.DISPLAY_MAX_EDGE);
    }


    @Test
    void threeScreenshotsAreStoredInTheOrderTheyWereAttached() throws IOException {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of(jpeg(400, 300), jpeg(500, 300), jpeg(600, 300)))
                .expectStatus()
                .isCreated();

        List<byte[]> stored = screenshotsOf(reportId);
        assertThat(stored).hasSize(3);
        assertThat(widthOf(stored.get(0))).isEqualTo(400);
        assertThat(widthOf(stored.get(1))).isEqualTo(500);
        assertThat(widthOf(stored.get(2))).isEqualTo(600);
    }


    @Test
    void theStoredBytesDifferFromAnOversizedOriginal() throws IOException {
        UUID reportId = UUID.randomUUID();
        byte[] original = jpeg(3000, 2000);

        submit(reportId, List.of(original)).expectStatus().isCreated();

        assertThat(screenshotsOf(reportId).getFirst()).isNotEqualTo(original);
    }


    @Test
    void exifDoesNotSurviveIntoTheStoredScreenshot() throws IOException {
        UUID reportId = UUID.randomUUID();
        byte[] tagged = jpegCarryingExif();
        assertThat(containsExifMarker(tagged)).as("the fixture must actually carry EXIF").isTrue();

        submit(reportId, List.of(tagged)).expectStatus().isCreated();

        assertThat(containsExifMarker(screenshotsOf(reportId).getFirst())).isFalse();
    }


    @Test
    void aPngScreenshotIsStoredAsJpeg() throws IOException {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of(png(500, 400))).expectStatus().isCreated();

        assertThat(contentTypesOf(reportId)).containsExactly("image/jpeg");
    }


    @Test
    void aFourthScreenshotIsRefusedAndNothingIsPersisted() throws IOException {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of(jpeg(300, 200), jpeg(300, 200), jpeg(300, 200), jpeg(300, 200)))
                .expectStatus()
                .isBadRequest();

        assertThat(reportCountOf(reportId)).isZero();
        assertThat(screenshotsOf(reportId)).isEmpty();
    }


    @Test
    void aPartThatIsNotAnImageIsRefusedAndNothingIsPersisted() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of("<html>not a screenshot</html>".getBytes(StandardCharsets.UTF_8)))
                .expectStatus()
                .isBadRequest();

        assertThat(reportCountOf(reportId)).isZero();
        assertThat(screenshotsOf(reportId)).isEmpty();
    }


    @Test
    void anImageOverTheIngestCapIsRefusedAndNothingIsPersisted() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of(new byte[ImageIngest.MAX_UPLOAD_BYTES + 1]))
                .expectStatus()
                .isBadRequest();

        assertThat(reportCountOf(reportId)).isZero();
    }


    @Test
    void aReplayStoresNoSecondCopyOfAnyScreenshot() throws IOException {
        UUID reportId = UUID.randomUUID();
        submit(reportId, List.of(jpeg(400, 300), jpeg(500, 300))).expectStatus().isCreated();

        submit(reportId, List.of(jpeg(400, 300), jpeg(500, 300))).expectStatus().isOk();

        assertThat(screenshotsOf(reportId)).hasSize(2);
    }


    @Test
    void aReportWithNoScreenshotsStoresNone() {
        UUID reportId = UUID.randomUUID();

        submit(reportId, List.of()).expectStatus().isCreated();

        assertThat(reportCountOf(reportId)).isEqualTo(1);
        assertThat(screenshotsOf(reportId)).isEmpty();
    }


    private RestTestClient.ResponseSpec submit(UUID reportId, List<byte[]> screenshots) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\""
                        + reportId
                        + "\",\"type\":\"problem\",\"description\":\"Look at this.\"}");
        int index = 0;
        for (byte[] screenshot : screenshots) {
            body.part("screenshot", named(screenshot, "shot" + index++ + ".jpg"))
                    .contentType(MediaType.IMAGE_JPEG);
        }
        return rest.post()
                .uri(ReportPaths.ANONYMOUS)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body.build())
                .exchange();
    }


    private static ByteArrayResource named(byte[] bytes, String filename) {
        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }


    private List<byte[]> screenshotsOf(UUID reportId) {
        return jdbc.queryForList(
                "SELECT bytes FROM report_screenshot WHERE report_id = ? ORDER BY ordinal",
                byte[].class,
                reportId);
    }


    private List<String> contentTypesOf(UUID reportId) {
        return jdbc.queryForList(
                "SELECT content_type FROM report_screenshot WHERE report_id = ? ORDER BY ordinal",
                String.class,
                reportId);
    }


    private int reportCountOf(UUID reportId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM report_outbox WHERE id = ?", Integer.class, reportId);
    }


    private static byte[] jpeg(int width, int height) throws IOException {
        return encoded(canvas(width, height), "jpeg");
    }


    private static byte[] png(int width, int height) throws IOException {
        return encoded(canvas(width, height), "png");
    }


    private static BufferedImage canvas(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.CYAN);
        pen.fillRect(0, 0, width, height);
        pen.dispose();
        return image;
    }


    private static byte[] encoded(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, format, bytes);
        return bytes.toByteArray();
    }


    private static byte[] jpegCarryingExif() throws IOException {
        byte[] plain = jpeg(900, 600);
        byte[] payload = new byte[EXIF_HEADER.length + SENTINEL.length];
        System.arraycopy(EXIF_HEADER, 0, payload, 0, EXIF_HEADER.length);
        System.arraycopy(SENTINEL, 0, payload, EXIF_HEADER.length, SENTINEL.length);

        ByteArrayOutputStream withExif = new ByteArrayOutputStream();
        withExif.write(plain, 0, 2);
        withExif.write(0xFF);
        withExif.write(0xE1);
        int segmentLength = payload.length + 2;
        withExif.write((segmentLength >> 8) & 0xFF);
        withExif.write(segmentLength & 0xFF);
        withExif.write(payload);
        withExif.write(plain, 2, plain.length - 2);
        return withExif.toByteArray();
    }


    private static final byte[] EXIF_HEADER = {'E', 'x', 'i', 'f', 0, 0};

    private static final byte[] SENTINEL = "LARGATA-REPORT-EXIF".getBytes(StandardCharsets.US_ASCII);


    private static boolean containsExifMarker(byte[] jpeg) {
        outer:
        for (int i = 0; i <= jpeg.length - EXIF_HEADER.length; i++) {
            for (int j = 0; j < EXIF_HEADER.length; j++) {
                if (jpeg[i + j] != EXIF_HEADER[j]) {
                    continue outer;
                }
            }
            return true;
        }
        return false;
    }


    private static int widthOf(byte[] jpeg) {
        try {
            return ImageIO.read(new ByteArrayInputStream(jpeg)).getWidth();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }
}
