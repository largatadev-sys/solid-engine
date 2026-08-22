package com.largata.join.card;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import org.springframework.stereotype.Component;


@Component
public class GenericCard {

    private static final String PATH = "/card/generic-card.png";

    private final byte[] bytes;

    GenericCard() {
        this.bytes = load();
    }


    public byte[] bytes() {
        return bytes.clone();
    }


    private static byte[] load() {
        try (InputStream png = GenericCard.class.getResourceAsStream(PATH)) {
            if (png == null) {
                throw new IllegalStateException("Generic card missing from the jar: " + PATH);
            }
            return png.readAllBytes();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }
}
