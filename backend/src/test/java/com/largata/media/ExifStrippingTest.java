package com.largata.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
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
