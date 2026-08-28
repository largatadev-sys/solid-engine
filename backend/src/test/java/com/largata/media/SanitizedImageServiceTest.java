package com.largata.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.media.MediaExceptions.NotAnImageException;
import com.largata.media.MediaExceptions.PhotoTooLargeException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;


class SanitizedImageServiceTest {

    private final SanitizedImageService sanitizer = new SanitizedImageService(new ImageIngest());


    @Test
    void anOversizedPhotoComesBackWithinTheDisplayBound() throws IOException {
        SanitizedImage sanitized = sanitizer.sanitizeForDisplay(photo(4000, 3000));

        assertThat(widthOf(sanitized.bytes())).isEqualTo(ImageIngest.DISPLAY_MAX_EDGE);
        assertThat(sanitized.contentType()).isEqualTo("image/jpeg");
    }


    @Test
    void theTallEdgeGovernsAPortraitPhoto() throws IOException {
        SanitizedImage sanitized = sanitizer.sanitizeForDisplay(photo(1500, 4000));

        assertThat(heightOf(sanitized.bytes())).isEqualTo(ImageIngest.DISPLAY_MAX_EDGE);
    }


    @Test
    void aSmallScreenshotIsNeverUpscaled() throws IOException {
        SanitizedImage sanitized = sanitizer.sanitizeForDisplay(photo(320, 240));

        assertThat(widthOf(sanitized.bytes())).isEqualTo(320);
        assertThat(heightOf(sanitized.bytes())).isEqualTo(240);
    }


    @Test
    void aPngScreenshotComesBackAsJpeg() throws IOException {
        SanitizedImage sanitized = sanitizer.sanitizeForDisplay(png(600, 400));

        assertThat(sanitized.contentType()).isEqualTo("image/jpeg");
        assertThat(ImageIO.read(new ByteArrayInputStream(sanitized.bytes()))).isNotNull();
    }


    @Test
    void exifDoesNotSurviveSanitization() throws IOException {
        byte[] tagged = photoCarryingExif();
        assertThat(containsExifMarker(tagged)).as("the fixture must actually carry EXIF").isTrue();

        SanitizedImage sanitized = sanitizer.sanitizeForDisplay(tagged);

        assertThat(containsExifMarker(sanitized.bytes())).isFalse();
    }


    @Test
    void theSanitizedBytesDifferFromAnOversizedOriginal() throws IOException {
        byte[] original = photo(4000, 3000);

        SanitizedImage sanitized = sanitizer.sanitizeForDisplay(original);

        assertThat(sanitized.bytes()).isNotEqualTo(original);
    }


    @Test
    void bytesThatAreNotAnImageAreRefused() {
        byte[] notAnImage = "<html>a screenshot of nothing</html>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> sanitizer.sanitizeForDisplay(notAnImage))
                .isInstanceOf(NotAnImageException.class);
    }


    @Test
    void anUploadOverTheIngestCapIsRefused() {
        byte[] tooBig = new byte[ImageIngest.MAX_UPLOAD_BYTES + 1];

        assertThatThrownBy(() -> sanitizer.sanitizeForDisplay(tooBig))
                .isInstanceOf(PhotoTooLargeException.class);
    }


    private static byte[] photo(int width, int height) throws IOException {
        return encoded(canvas(width, height), "jpeg");
    }


    private static byte[] png(int width, int height) throws IOException {
        return encoded(canvas(width, height), "png");
    }


    private static BufferedImage canvas(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.MAGENTA);
        pen.fillRect(0, 0, width, height);
        pen.dispose();
        return image;
    }


    private static byte[] encoded(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, format, bytes);
        return bytes.toByteArray();
    }


    private static byte[] photoCarryingExif() throws IOException {
        byte[] plain = photo(900, 600);
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

    private static final byte[] SENTINEL = "LARGATA-SCREENSHOT-EXIF".getBytes(StandardCharsets.US_ASCII);


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


    private static int widthOf(byte[] jpeg) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(jpeg)).getWidth();
    }


    private static int heightOf(byte[] jpeg) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(jpeg)).getHeight();
    }
}
