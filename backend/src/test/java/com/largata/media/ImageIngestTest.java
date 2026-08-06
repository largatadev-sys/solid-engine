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


class ImageIngestTest {

    private final ImageIngest ingest = new ImageIngest();


    @Test
    void aPhotoBecomesADisplayVariantAndAThumbnail() throws IOException {
        IngestedImage ingested = ingest.accept(photo(3000, 2000));

        assertThat(widthOf(ingested.display())).isEqualTo(ImageIngest.DISPLAY_MAX_EDGE);
        assertThat(widthOf(ingested.thumbnail())).isEqualTo(ImageIngest.THUMBNAIL_MAX_EDGE);
        assertThat(ingested.contentType()).isEqualTo("image/jpeg");
    }


    @Test
    void anImageSmallerThanTheVariantIsNotUpscaled() throws IOException {
        IngestedImage ingested = ingest.accept(photo(200, 150));

        assertThat(widthOf(ingested.display())).isEqualTo(200);
        assertThat(widthOf(ingested.thumbnail())).isEqualTo(200);
    }


    @Test
    void theTallEdgeGovernsAPortraitPhoto() throws IOException {
        IngestedImage ingested = ingest.accept(photo(2000, 3000));

        assertThat(heightOf(ingested.display())).isEqualTo(ImageIngest.DISPLAY_MAX_EDGE);
    }


    @Test
    void anAvatarIsSquaredSoTheCircleNeverCropsSurprises() throws IOException {
        IngestedImage ingested = ingest.accept(photo(1200, 400), ImageIngest.Framing.SQUARE);

        assertThat(widthOf(ingested.display())).isEqualTo(heightOf(ingested.display()));
        assertThat(widthOf(ingested.thumbnail())).isEqualTo(heightOf(ingested.thumbnail()));
    }


    @Test
    void theSquareIsTakenFromTheCentreRatherThanACorner() throws IOException {
        IngestedImage ingested = ingest.accept(photo(1000, 400), ImageIngest.Framing.SQUARE);

        assertThat(widthOf(ingested.display())).isEqualTo(400);
    }


    @Test
    void aCoverKeepsItsShapeBecauseItRendersAsABanner() throws IOException {
        IngestedImage ingested = ingest.accept(photo(1200, 400));

        assertThat(widthOf(ingested.display())).isGreaterThan(heightOf(ingested.display()));
    }


    @Test
    void bytesThatAreNotAnImageAreRefused() {
        byte[] notAnImage = "<html>definitely not a photo</html>".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> ingest.accept(notAnImage)).isInstanceOf(NotAnImageException.class);
    }


    @Test
    void anEmptyUploadIsRefused() {
        assertThatThrownBy(() -> ingest.accept(new byte[0])).isInstanceOf(NotAnImageException.class);
    }


    @Test
    void anOversizedUploadIsRefusedBeforeItIsDecoded() {
        byte[] tooBig = new byte[ImageIngest.MAX_UPLOAD_BYTES + 1];

        assertThatThrownBy(() -> ingest.accept(tooBig)).isInstanceOf(PhotoTooLargeException.class);
    }


    private static byte[] photo(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D pen = image.createGraphics();
        pen.setColor(Color.CYAN);
        pen.fillRect(0, 0, width, height);
        pen.dispose();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", bytes);
        return bytes.toByteArray();
    }


    private static int widthOf(byte[] jpeg) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(jpeg)).getWidth();
    }


    private static int heightOf(byte[] jpeg) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(jpeg)).getHeight();
    }
}
