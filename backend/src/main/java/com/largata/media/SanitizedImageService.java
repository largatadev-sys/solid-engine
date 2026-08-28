package com.largata.media;

import com.largata.media.MediaExceptions.NotAnImageException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;


@Service
public class SanitizedImageService {

    private final ImageIngest ingest;

    SanitizedImageService(ImageIngest ingest) {
        this.ingest = ingest;
    }


    public SanitizedImage sanitizeForDisplay(byte[] uploaded) {
        IngestedImage ingested = ingest.accept(uploaded);
        BufferedImage display = decode(ingested.display());
        return new SanitizedImage(
                ingested.display(), ingested.contentType(), display.getWidth(), display.getHeight());
    }


    private static BufferedImage decode(byte[] jpeg) {
        try {
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(jpeg));
            if (decoded == null) {
                throw new NotAnImageException();
            }
            return decoded;
        } catch (IOException unreadable) {
            throw new NotAnImageException();
        }
    }
}
