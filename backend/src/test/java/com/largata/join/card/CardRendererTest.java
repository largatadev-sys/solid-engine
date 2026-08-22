package com.largata.join.card;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;


class CardRendererTest {

    private static final String TITLE = "Island Hopping in El Nido";

    private static final String DESTINATION = "El Nido, Palawan";

    private final CardRenderer renderer = new CardRenderer(new CardFonts());


    @BeforeAll
    static void headless() {
        System.setProperty("java.awt.headless", "true");
    }


    @Test
    void aCardIsAPngOfExactlyTheDimensionsPlatformsAreToldToExpect() throws Exception {
        BufferedImage card = decode(renderer.render(withCover()));

        assertThat(card.getWidth()).isEqualTo(1200);
        assertThat(card.getHeight()).isEqualTo(630);
    }


    @Test
    void theBytesAreAPngRatherThanWhateverImageIoFeltLike() {
        byte[] png = renderer.render(withCover());

        assertThat(png).startsWith((byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G');
    }


    @Test
    void theBrandBarRunsTheFullWidthAlongTheBottom() throws Exception {
        BufferedImage card = decode(renderer.render(withCover()));

        assertThat(pixel(card, 5, 625)).isEqualTo(CardArt.BRAND);
        assertThat(pixel(card, 1195, 625)).isEqualTo(CardArt.BRAND);
    }


    @Test
    void theTextPanelSitsOnTheWarmWellRatherThanOnTheCover() throws Exception {
        BufferedImage card = decode(renderer.render(withCover()));

        assertThat(pixel(card, 1150, 40)).isEqualTo(CardArt.WELL);
    }


    @Test
    void aCoverTripAndACoverlessTripDoNotRenderTheSameCard() {
        assertThat(renderer.render(withCover())).isNotEqualTo(renderer.render(withoutCover()));
    }


    @Test
    void aDeadLinkDoesNotRenderTheSameCardAsALiveOne() {
        assertThat(renderer.render(CardSubject.dead())).isNotEqualTo(renderer.render(withoutCover()));
        assertThat(renderer.render(CardSubject.dead())).isNotEqualTo(renderer.render(withCover()));
    }


    @Test
    void twoTripsWithDifferentTitlesRenderDifferentCards() {
        CardSubject other =
                CardSubject.invitation("Kyoto in Autumn", DESTINATION, metaLine(), coverBytes());

        assertThat(renderer.render(withCover())).isNotEqualTo(renderer.render(other));
    }


    @Test
    void anUndecodableCoverFallsBackToThePanelRatherThanFailing() {
        CardSubject corrupt =
                CardSubject.invitation(TITLE, DESTINATION, metaLine(), new byte[] {1, 2, 3, 4});

        assertThat(renderer.render(corrupt)).isEqualTo(renderer.render(withoutCover()));
    }


    @Test
    void aTripWithNoMetaLineStillRendersRatherThanThrowing() {
        CardSubject bare = CardSubject.invitation(TITLE, DESTINATION, null, null);

        assertThat(renderer.render(bare)).isNotEmpty();
    }


    @Test
    void aTitleWithGlyphsOutfitCannotDrawStillRenders() {
        CardSubject japanese = CardSubject.invitation("京都の秋", "京都", null, null);

        assertThat(renderer.render(japanese)).isNotEmpty();
    }


    @Test
    void aVeryLongTitleRendersWithoutOverflowingTheCard() throws Exception {
        CardSubject verbose =
                CardSubject.invitation(
                        "Autumn Temples, Tea Houses and Night Markets of Kyoto and Osaka and Nara",
                        DESTINATION,
                        metaLine(),
                        null);

        BufferedImage card = decode(renderer.render(verbose));

        assertThat(card.getHeight()).isEqualTo(630);
        assertThat(pixel(card, 1195, 5)).isEqualTo(CardArt.WELL);
    }


    private static CardSubject withCover() {
        return CardSubject.invitation(TITLE, DESTINATION, metaLine(), coverBytes());
    }


    private static CardSubject withoutCover() {
        return CardSubject.invitation(TITLE, DESTINATION, metaLine(), null);
    }


    private static String metaLine() {
        return TripMetaLine.of(
                DESTINATION, LocalDate.parse("2026-03-12"), LocalDate.parse("2026-03-18"));
    }


    private static byte[] coverBytes() {
        BufferedImage photo = new BufferedImage(1600, 1200, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < photo.getHeight(); y++) {
            for (int x = 0; x < photo.getWidth(); x++) {
                photo.setRGB(x, y, new Color(x % 256, y % 256, 128).getRGB());
            }
        }
        ByteArrayOutputStream jpeg = new ByteArrayOutputStream();
        try {
            ImageIO.write(photo, "jpg", jpeg);
        } catch (Exception unwritable) {
            throw new IllegalStateException(unwritable);
        }
        return jpeg.toByteArray();
    }


    private static BufferedImage decode(byte[] png) throws Exception {
        return ImageIO.read(new ByteArrayInputStream(png));
    }


    private static Color pixel(BufferedImage card, int x, int y) {
        return new Color(card.getRGB(x, y));
    }
}
