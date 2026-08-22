package com.largata.join.card;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class CardArtTest {

    @Test
    void theCardIsTheSizeEveryPlatformIsToldToExpect() {
        assertThat(CardArt.WIDTH).isEqualTo(1200);
        assertThat(CardArt.HEIGHT).isEqualTo(630);
        assertThat(CardArt.PANEL_WIDTH).isEqualTo(552);
    }


    @Test
    void theTextColumnIsWhatIsLeftAfterTheMocksPadding() {
        assertThat(CardArt.PADDING_LEFT).isEqualTo(64);
        assertThat(CardArt.PADDING_RIGHT).isEqualTo(84);
        assertThat(CardArt.TEXT_WIDTH).isEqualTo(500);
    }


    @Test
    void theBigBlobSitsWhereTheMocksTopLeftOffsetsPutIt() {
        assertThat(CardArt.BLOB_LEFT).isEqualTo(-110);
        assertThat(CardArt.BLOB_TOP).isEqualTo(-120);
        assertThat(CardArt.BLOB_DIAMETER).isEqualTo(420);
    }


    @Test
    void theSecondCircleBLEEDSPastThePanelRatherThanInsettingFromIt() {
        assertThat(CardArt.DECOR_LEFT + CardArt.DECOR_DIAMETER)
                .isEqualTo(CardArt.PANEL_WIDTH + CardArt.DECOR_OVERHANG_RIGHT);
        assertThat(CardArt.DECOR_TOP + CardArt.DECOR_DIAMETER)
                .isEqualTo(CardArt.HEIGHT + CardArt.DECOR_OVERHANG_BOTTOM);
    }


    @Test
    void theSecondCirclesCornerIsTheMocksArithmeticSpeltOut() {
        assertThat(CardArt.DECOR_LEFT).isEqualTo(312);
        assertThat(CardArt.DECOR_TOP).isEqualTo(420);
    }


    @Test
    void thePaletteIsTheMocksPaletteToTheHex() {
        assertThat(hex(CardArt.WELL)).isEqualTo("FFF7ED");
        assertThat(hex(CardArt.COVER_BACKGROUND)).isEqualTo("FFEDD5");
        assertThat(hex(CardArt.DIVIDER)).isEqualTo("FED7AA");
        assertThat(hex(CardArt.DECOR)).isEqualTo("FDBA74");
        assertThat(hex(CardArt.BRAND)).isEqualTo("EA580C");
        assertThat(hex(CardArt.KICKER)).isEqualTo("C2410C");
        assertThat(hex(CardArt.INK)).isEqualTo("1C1917");
        assertThat(hex(CardArt.MUTED)).isEqualTo("78716C");
    }


    @Test
    void theTypeScaleIsTheMocksTypeScale() {
        assertThat(CardArt.WORDMARK_SIZE).isEqualTo(34f);
        assertThat(CardArt.KICKER_SIZE).isEqualTo(22f);
        assertThat(CardArt.KICKER_TRACKING).isEqualTo(4f);
        assertThat(CardArt.META_SIZE).isEqualTo(28f);
        assertThat(CardArt.INITIALS_SIZE).isEqualTo(170f);
        assertThat(TitleBlock.LARGE).isEqualTo(58f);
        assertThat(TitleBlock.SMALL).isEqualTo(46f);
        assertThat(TitleBlock.LARGE_LINE_HEIGHT).isEqualTo(1.12f);
        assertThat(TitleBlock.SMALL_LINE_HEIGHT).isEqualTo(1.15f);
    }


    @Test
    void theSeamStartsWhereTheMocksGradientStarts() {
        assertThat(CardArt.SEAM_START).isEqualTo(0.82f);
    }


    @Test
    void theDividerAndBrandBarAreTheMocksRules() {
        assertThat(CardArt.DIVIDER_WIDTH).isEqualTo(64);
        assertThat(CardArt.DIVIDER_HEIGHT).isEqualTo(2);
        assertThat(CardArt.BRAND_BAR_HEIGHT).isEqualTo(10);
    }


    private static String hex(java.awt.Color color) {
        return String.format("%02X%02X%02X", color.getRed(), color.getGreen(), color.getBlue());
    }
}
