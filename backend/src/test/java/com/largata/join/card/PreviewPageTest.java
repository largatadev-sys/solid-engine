package com.largata.join.card;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;


class PreviewPageTest {

    private static final String IMAGE = "https://api.largata.test/v1/join/abc/card.png?v=3";

    private static final String LANDING = "https://largata.test/join/abc?v=3";

    private static final String APP = LANDING + "&app=1";

    private static final String APP_ESCAPED = "https://largata.test/join/abc?v=3&amp;app=1";


    @Test
    void theTitleCarriesTheInviteBecauseInstagramCropsTheImageToNothing() {
        assertThat(livePage("Island Hopping in El Nido"))
                .contains("<meta property=\"og:title\" content=\"You&#39;re invited: Island Hopping in El Nido\">");
    }


    @Test
    void theDescriptionIsTheSameMetaLineTheCardDraws() {
        assertThat(livePage("Trip"))
                .contains("<meta property=\"og:description\" content=\"El Nido · Mar 12–18\">");
    }


    @Test
    void theImageIsAbsoluteOrNoCrawlerWillEverFetchIt() {
        assertThat(livePage("Trip")).contains("<meta property=\"og:image\" content=\"" + IMAGE + "\">");
        assertThat(livePage("Trip")).contains("<meta name=\"twitter:image\" content=\"" + IMAGE + "\">");
    }


    @Test
    void itDeclaresTheDimensionsSoPlatformsLayOutBeforeFetching() {
        assertThat(livePage("Trip"))
                .contains("<meta property=\"og:image:width\" content=\"1200\">")
                .contains("<meta property=\"og:image:height\" content=\"630\">");
    }


    @Test
    void itAsksForTheLargeCardRatherThanTheThumbnail() {
        assertThat(livePage("Trip")).contains("<meta name=\"twitter:card\" content=\"summary_large_image\">");
    }


    @Test
    void itNamesTheSiteSoTheUnfurlFooterReadsLargata() {
        assertThat(livePage("Trip")).contains("<meta property=\"og:site_name\" content=\"Largata\">");
    }


    @Test
    void aDeadLinkSaysSoWithoutNamingTheTrip() {
        String page = PreviewPage.render(new PreviewSubject(null, null, IMAGE, LANDING, APP, false));

        assertThat(page)
                .contains("<meta property=\"og:title\" content=\"Largata\">")
                .contains("<meta property=\"og:description\" content=\"This invite link is no longer active.\">")
                .doesNotContain("You&#39;re invited");
    }


    @Test
    void theBodyHandsOffToTheAppUrlBecauseTheCleanLinkWouldReturnHereForever() {
        String page = livePage("Trip");

        assertThat(page).contains("href=\"" + APP_ESCAPED + "\"");
        assertThat(page).doesNotContain("href=\"" + LANDING + "\"");
    }


    @Test
    void theCanonicalUrlStaysTheCleanLinkSoNobodyEverSharesTheHandoffParam() {
        String page = livePage("Trip");

        assertThat(page).contains("<meta property=\"og:url\" content=\"" + LANDING + "\">");
    }


    @Test
    void theHandoffIsScriptOnlyBecauseSomeCrawlersFollowAMetaRefreshAndWouldMissTheTags() {
        assertThat(livePage("Trip")).doesNotContain("http-equiv=\"refresh\"");
    }


    @Test
    void theVisibleBodyIsATitleCardNamingNoTripSoTheCardCannotFlashBeforeTheHandoff() {
        String page = livePage("Island Hopping in El Nido");
        String body = page.substring(page.indexOf("<body>"));

        assertThat(body)
                .doesNotContain("Island Hopping")
                .doesNotContain("El Nido")
                .contains(">" + PreviewPage.SITE_NAME + "</p>");
    }


    @Test
    void thePageCarriesNoSpinnerOfItsOwnBecauseTheAppIsAboutToDrawOne() {
        String page = livePage("Trip");

        assertThat(page).doesNotContain("progressbar").doesNotContain("@keyframes");
    }


    @Test
    void theWordmarkSitsWhereTheAppsOwnSpinnerLandsSoNothingJumpsAcrossTheHandoff() {
        assertThat(livePage("Trip")).contains(".mark{margin:0;color:#EA580C;font-size:22px");
    }


    @Test
    void theHeadCarriesTheAppUrlSoTheRedirectNeedsNoBodyAtAll() {
        assertThat(livePage("Trip"))
                .contains(
                        "<meta name=\"" + PreviewPage.APP_URL_META + "\" content=\"" + APP_ESCAPED + "\">");
    }


    @Test
    void theScriptReadsTheUrlFromAMetaTagSoNoUrlIsEverInterpolatedIntoJavascript() {
        String page = livePage("Trip");

        String script = page.substring(page.indexOf("<script"), page.indexOf("</script>"));
        assertThat(script).contains(PreviewPage.APP_URL_META).doesNotContain("http");
    }


    @Test
    void aScriptlessBrowserIsNotStrandedBecauseTheAnchorSurvivesInsideNoscript() {
        String page = livePage("Trip");

        assertThat(page)
                .contains(
                        "<noscript><a href=\""
                                + APP_ESCAPED
                                + "\">"
                                + PreviewPage.OPEN_LABEL
                                + "</a></noscript>");
    }


    @Test
    void aDeadLinkStillHandsOffSoAClosedInviteExplainsItselfInTheAppRatherThanHere() {
        String page = PreviewPage.render(new PreviewSubject(null, null, IMAGE, LANDING, APP, false));

        assertThat(page).contains("href=\"" + APP_ESCAPED + "\"").contains("location.replace");
    }


    @Test
    void aTitleCarryingMarkupIsEscapedRatherThanRendered() {
        String page = livePage("<script>alert(1)</script>");

        assertThat(page).doesNotContain("<script>alert(1)</script>");
        assertThat(page).contains("&lt;script&gt;alert(1)&lt;/script&gt;");
    }


    @Test
    void aTitleCarryingAQuoteCannotBreakOutOfTheContentAttribute() {
        String page = livePage("The \" Trip");

        assertThat(page).contains("You&#39;re invited: The &quot; Trip");
    }


    @Test
    void anAmpersandIsEscapedFirstSoNothingIsDoubleEncoded() {
        assertThat(livePage("Tea & Temples")).contains("Tea &amp; Temples");
    }


    @Test
    void aTripWithNoMetaLineDescribesItselfWithoutAStrayEmptyTag() {
        String page =
                PreviewPage.render(new PreviewSubject("Trip", null, IMAGE, LANDING, APP, true));

        assertThat(page)
                .contains(
                        "<meta property=\"og:description\" content=\"You&#39;re invited to plan this trip together.\">");
    }


    @Test
    void theEmptyMetaLineIsReachableBecauseNotNullStillPermitsTheEmptyString() {
        assertThat(TripMetaLine.of("", null, null)).isNull();
    }


    @Test
    void thePagePaintsItselfFromTheCardsPaletteRatherThanItsOwnCopyOfIt() {
        String page = livePage("Trip");

        assertThat(page)
                .contains("background:#FFF7ED")
                .contains("color:#1C1917")
                .contains(".mark{margin:0;color:#EA580C");
        assertThat(CardArt.WELL.getRGB() & 0xFFFFFF).isEqualTo(0xFFF7ED);
        assertThat(CardArt.BRAND.getRGB() & 0xFFFFFF).isEqualTo(0xEA580C);
    }


    private static String livePage(String title) {
        return PreviewPage.render(
                new PreviewSubject(title, "El Nido · Mar 12–18", IMAGE, LANDING, APP, true));
    }
}
