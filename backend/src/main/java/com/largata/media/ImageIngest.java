package com.largata.media;

import com.largata.media.MediaExceptions.NotAnImageException;
import com.largata.media.MediaExceptions.PhotoTooLargeException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Component;


@Component
public class ImageIngest {

    public static final int MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
    public static final int DISPLAY_MAX_EDGE = 2048;
    public static final int THUMBNAIL_MAX_EDGE = 400;

    static final String OUTPUT_CONTENT_TYPE = "image/jpeg";

    private static final long MAX_PIXELS = 50_000_000L;


    public IngestedImage accept(byte[] uploaded) {
        if (uploaded.length > MAX_UPLOAD_BYTES) {
            throw new PhotoTooLargeException(MAX_UPLOAD_BYTES);
        }

        Dimensions declared = readDimensions(uploaded);
        BufferedImage decoded = decode(uploaded);

        return new IngestedImage(
                variant(decoded, DISPLAY_MAX_EDGE),
                variant(decoded, THUMBNAIL_MAX_EDGE),
                OUTPUT_CONTENT_TYPE,
                declared.width(),
                declared.height());
    }


    private static Dimensions readDimensions(byte[] uploaded) {
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(uploaded))) {
            if (stream == null) {
                throw new NotAnImageException();
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) {
                throw new NotAnImageException();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream);
                long width = reader.getWidth(0);
                long height = reader.getHeight(0);
                if (width * height > MAX_PIXELS) {
                    throw new PhotoTooLargeException(MAX_UPLOAD_BYTES);
                }
                return new Dimensions((int) width, (int) height);
            } finally {
                reader.dispose();
            }
        } catch (IOException unreadable) {
            throw new NotAnImageException();
        }
    }


    private static BufferedImage decode(byte[] uploaded) {
        try {
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(uploaded));
            if (decoded == null) {
                throw new NotAnImageException();
            }
            return decoded;
        } catch (IOException unreadable) {
            throw new NotAnImageException();
        }
    }


    private static byte[] variant(BufferedImage decoded, int maxEdge) {
        try {
            // Cap the target at the source's own size. Thumbnailator upscales to fill the requested
            // box, so asking for 2048 from a 200px avatar returns a stretched 2048px image —
            // blurrier than the original and an order of magnitude more bytes to serve.
            int bounded = Math.min(maxEdge, Math.max(decoded.getWidth(), decoded.getHeight()));
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            Thumbnails.of(decoded)
                    .size(bounded, bounded)
                    .keepAspectRatio(true)
                    .outputFormat("jpeg")
                    .outputQuality(0.85)
                    .toOutputStream(bytes);
            return bytes.toByteArray();
        } catch (IOException failed) {
            throw new NotAnImageException();
        }
    }


    private record Dimensions(int width, int height) {}
}
