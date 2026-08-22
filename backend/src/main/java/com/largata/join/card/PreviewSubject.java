package com.largata.join.card;


public record PreviewSubject(
        String tripTitle, String metaLine, String imageUrl, String landingUrl, boolean live) {

    public static PreviewSubject dead(String imageUrl, String landingUrl) {
        return new PreviewSubject(null, null, imageUrl, landingUrl, false);
    }
}
