package com.largata.join.card;

import java.awt.Color;


public final class PreviewPage {

    public static final String SITE_NAME = "Largata";

    public static final String INVITE_PREFIX = "You're invited: ";

    public static final String DEAD_DESCRIPTION = "This invite link is no longer active.";

    public static final String FALLBACK_DESCRIPTION = "You're invited to plan this trip together.";

    public static final String OPEN_LABEL = "Open this invite";

    public static final String LOADING_LABEL = "Opening";

    public static final String APP_URL_META = "largata:app-url";

    private PreviewPage() {}


    public static String render(PreviewSubject subject) {
        String title = subject.live() ? INVITE_PREFIX + subject.tripTitle() : SITE_NAME;
        String description =
                subject.live()
                        ? (subject.metaLine() == null ? FALLBACK_DESCRIPTION : subject.metaLine())
                        : DEAD_DESCRIPTION;

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                <meta name="description" content="%s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="%s">
                <meta property="og:title" content="%s">
                <meta property="og:description" content="%s">
                <meta property="og:url" content="%s">
                <meta property="og:image" content="%s">
                <meta property="og:image:width" content="%d">
                <meta property="og:image:height" content="%d">
                <meta property="og:image:alt" content="%s">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="%s">
                <meta name="twitter:description" content="%s">
                <meta name="twitter:image" content="%s">
                <meta name="%s" content="%s">
                <style>
                body{margin:0;background:%s;color:%s;font-family:system-ui,sans-serif;\
                display:flex;min-height:100vh;align-items:center;justify-content:center}
                main{display:flex;flex-direction:column;align-items:center;gap:14px;padding:32px}
                .mark{margin:0;color:%s;font-size:15px;line-height:20px;font-weight:700}
                .ring{width:26px;height:26px;border-radius:999px;border:3px solid %s;\
                border-top-color:%s;animation:spin .8s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                @media (prefers-reduced-motion:reduce){.ring{animation-duration:2.4s}}
                a{color:%s;font-weight:700}
                </style>
                </head>
                <body>
                <main>
                <p class="mark">%s</p>
                <div class="ring" role="progressbar" aria-label="%s"></div>
                <noscript><a href="%s">%s</a></noscript>
                </main>
                <script>location.replace(document.head.querySelector('meta[name="%s"]').content)</script>
                </body>
                </html>
                """
                .formatted(
                        escape(title),
                        escape(description),
                        escape(SITE_NAME),
                        escape(title),
                        escape(description),
                        escape(subject.landingUrl()),
                        escape(subject.imageUrl()),
                        CardArt.WIDTH,
                        CardArt.HEIGHT,
                        escape(title),
                        escape(title),
                        escape(description),
                        escape(subject.imageUrl()),
                        APP_URL_META,
                        escape(subject.appUrl()),
                        hex(CardArt.WELL),
                        hex(CardArt.INK),
                        hex(CardArt.BRAND),
                        hex(CardArt.DIVIDER),
                        hex(CardArt.BRAND),
                        hex(CardArt.BRAND),
                        escape(SITE_NAME),
                        escape(LOADING_LABEL),
                        escape(subject.appUrl()),
                        escape(OPEN_LABEL),
                        APP_URL_META);
    }


    private static String hex(Color color) {
        return String.format("#%02X%02X%02X", color.getRed(), color.getGreen(), color.getBlue());
    }


    private static String escape(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
