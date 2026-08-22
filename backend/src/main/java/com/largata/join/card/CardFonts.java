package com.largata.join.card;

import java.awt.Font;
import java.awt.FontFormatException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import org.springframework.stereotype.Component;


@Component
public class CardFonts {

    private static final String PATH = "/fonts/";

    private final Font outfit700;
    private final Font outfit800;
    private final Font notoSans400;
    private final Font notoSans700;

    CardFonts() {
        this.outfit700 = load("Outfit-700.ttf");
        this.outfit800 = load("Outfit-800.ttf");
        this.notoSans400 = load("NotoSans-400.ttf");
        this.notoSans700 = load("NotoSans-700.ttf");
    }


    public Font title(float size) {
        return outfit700.deriveFont(size);
    }


    public Font display(float size) {
        return outfit800.deriveFont(size);
    }


    public Font body(float size) {
        return notoSans400.deriveFont(size);
    }


    public Font kicker(float size) {
        return notoSans700.deriveFont(size);
    }


    public Font covering(Font preferred, String text) {
        if (preferred.canDisplayUpTo(text) < 0) {
            return preferred;
        }
        Font fallback = notoSans400.deriveFont(preferred.getSize2D());
        return fallback.canDisplayUpTo(text) < 0 ? fallback : preferred;
    }


    private static Font load(String file) {
        try (InputStream bytes = CardFonts.class.getResourceAsStream(PATH + file)) {
            if (bytes == null) {
                throw new IllegalStateException("Card font missing from the jar: " + PATH + file);
            }
            return Font.createFont(Font.TRUETYPE_FONT, bytes);
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        } catch (FontFormatException malformed) {
            throw new IllegalStateException("Card font is not a valid TrueType file: " + file, malformed);
        }
    }
}
