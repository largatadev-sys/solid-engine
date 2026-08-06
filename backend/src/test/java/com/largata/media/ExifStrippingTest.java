package com.largata.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;


class ExifStrippingTest {

    private final ImageIngest ingest = new ImageIngest();


    @Test
    void gpsCoordinatesDoNotSurviveIngest() throws IOException {
        byte[] tagged = photoCarryingExifGps();
        assertThat(containsExifMarker(tagged)).as("the fixture must actually carry EXIF").isTrue();

        IngestedImage ingested = ingest.accept(tagged);

        assertThat(containsExifMarker(ingested.display())).isFalse();
        assertThat(containsExifMarker(ingested.thumbnail())).isFalse();
    }


    @Test
    void theGpsBytesThemselvesAreAbsentFromBothVariants() throws IOException {
        IngestedImage ingested = ingest.accept(photoCarryingExifGps());

        assertThat(indexOf(ingested.display(), GPS_SENTINEL)).isEqualTo(-1);
        assertThat(indexOf(ingested.thumbnail(), GPS_SENTINEL)).isEqualTo(-1);
    }


    @Test
    void aSidewaysPhonePhotoComesOutUpright() throws IOException {
        byte[] sideways = landscapeJpegTaggedAsRotated();

        IngestedImage ingested = ingest.accept(sideways);

        BufferedImage display = ImageIO.read(new ByteArrayInputStream(ingested.display()));
        assertThat(display.getHeight())
                .as("orientation 6 means the camera was turned: the wide edge becomes the tall one")
                .isGreaterThan(display.getWidth());
    }


    private static byte[] landscapeJpegTaggedAsRotated() throws IOException {
        return withExifSegment(landscapeJpeg(), orientationSixExif());
    }


    private static byte[] landscapeJpeg() throws IOException {
        BufferedImage image = new BufferedImage(600, 200, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.ORANGE);
        pen.fillRect(0, 0, 600, 200);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static byte[] orientationSixExif() throws IOException {
        ByteArrayOutputStream tiff = new ByteArrayOutputStream();
        tiff.write(new byte[] {'E', 'x', 'i', 'f', 0, 0});
        tiff.write(new byte[] {'M', 'M', 0, 42, 0, 0, 0, 8});
        tiff.write(new byte[] {0, 1});
        tiff.write(new byte[] {1, 18, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0});
        tiff.write(new byte[] {0, 0, 0, 0});
        return tiff.toByteArray();
    }


    private static byte[] withExifSegment(byte[] jpeg, byte[] payload) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        out.write(0xFF);
        out.write(0xE1);
        int segmentLength = payload.length + 2;
        out.write((segmentLength >> 8) & 0xFF);
        out.write(segmentLength & 0xFF);
        out.write(payload);
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }


    private static final byte[] GPS_SENTINEL = "LARGATA-HOME-COORDS".getBytes(StandardCharsets.US_ASCII);

    private static final byte[] EXIF_HEADER = {'E', 'x', 'i', 'f', 0, 0};


    private static byte[] photoCarryingExifGps() throws IOException {
        byte[] plain = plainJpeg();
        byte[] payload = new byte[EXIF_HEADER.length + GPS_SENTINEL.length];
        System.arraycopy(EXIF_HEADER, 0, payload, 0, EXIF_HEADER.length);
        System.arraycopy(GPS_SENTINEL, 0, payload, EXIF_HEADER.length, GPS_SENTINEL.length);

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


    private static byte[] plainJpeg() throws IOException {
        BufferedImage image = new BufferedImage(900, 600, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.ORANGE);
        pen.fillRect(0, 0, 900, 600);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static boolean containsExifMarker(byte[] jpeg) {
        return indexOf(jpeg, EXIF_HEADER) >= 0;
    }


    private static int indexOf(byte[] haystack, byte[] needle) {
        outer:
        for (int i = 0; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return i;
        }
        return -1;
    }
}
