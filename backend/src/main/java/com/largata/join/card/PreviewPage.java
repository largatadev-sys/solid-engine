package com.largata.join.card;

import java.awt.Color;


public final class PreviewPage {

    public static final String SITE_NAME = "Largata";

    public static final String INVITE_PREFIX = "You're invited: ";

    public static final String DEAD_DESCRIPTION = "This invite link is no longer active.";

    public static final String FALLBACK_DESCRIPTION = "You're invited to plan this trip together.";

    public static final String OPEN_LABEL = "Open this invite";

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
                <style>
                body{margin:0;background:%s;color:%s;font-family:system-ui,sans-serif;\
                display:flex;min-height:100vh;align-items:center;justify-content:center}
                main{text-align:center;padding:32px}
                h1{font-size:28px;margin:0 0 8px}
                p{color:%s;margin:0 0 24px}
                a{display:inline-block;background:%s;color:#fff;text-decoration:none;\
                padding:14px 28px;border-radius:999px;font-weight:700}
                </style>
                </head>
                <body>
                <main>
                <h1>%s</h1>
                <p>%s</p>
                <a href="%s">%s</a>
                </main>
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
                        hex(CardArt.WELL),
                        hex(CardArt.INK),
                        hex(CardArt.MUTED),
                        hex(CardArt.BRAND),
                        escape(title),
                        escape(description),
                        escape(subject.landingUrl()),
                        escape(OPEN_LABEL));
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
