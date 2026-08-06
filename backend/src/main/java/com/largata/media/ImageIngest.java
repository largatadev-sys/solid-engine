package com.largata.media;

import com.largata.media.MediaExceptions.NotAnImageException;
import com.largata.media.MediaExceptions.PhotoTooLargeException;
import com.largata.media.MediaExceptions.TooManyPixelsException;
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
        return accept(uploaded, Framing.AS_UPLOADED);
    }


    public IngestedImage accept(byte[] uploaded, Framing framing) {
        if (uploaded.length > MAX_UPLOAD_BYTES) {
            throw new PhotoTooLargeException(MAX_UPLOAD_BYTES);
        }

        refuseIfTooManyPixels(uploaded);
        BufferedImage upright = uprightPixelsOf(uploaded);
        BufferedImage framed = framing == Framing.SQUARE ? centreSquareOf(upright) : upright;

        return new IngestedImage(
                variant(framed, DISPLAY_MAX_EDGE),
                variant(framed, THUMBNAIL_MAX_EDGE),
                OUTPUT_CONTENT_TYPE,
                framed.getWidth(),
                framed.getHeight());
    }


    private static BufferedImage centreSquareOf(BufferedImage image) {
        int edge = Math.min(image.getWidth(), image.getHeight());
        return image.getSubimage(
                (image.getWidth() - edge) / 2, (image.getHeight() - edge) / 2, edge, edge);
    }


    public enum Framing {
        AS_UPLOADED,
        SQUARE
    }


    private static BufferedImage uprightPixelsOf(byte[] uploaded) {
        try {
            ByteArrayOutputStream rotated = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(uploaded))
                    .scale(1)
                    .useExifOrientation(true)
                    .outputFormat("jpeg")
                    .outputQuality(1.0)
                    .toOutputStream(rotated);
            return decode(rotated.toByteArray());
        } catch (IOException unreadable) {
            return decode(uploaded);
        }
    }


    private static void refuseIfTooManyPixels(byte[] uploaded) {
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
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_PIXELS) {
                    throw new TooManyPixelsException(MAX_PIXELS);
                }
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
            int bounded = neverUpscale(decoded, maxEdge);
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


    private static int neverUpscale(BufferedImage decoded, int maxEdge) {
        return Math.min(maxEdge, Math.max(decoded.getWidth(), decoded.getHeight()));
    }
}
