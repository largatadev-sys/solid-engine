package com.largata.join.card;


public record CardSubject(
        String kicker, String title, String destination, String metaLine, byte[] coverBytes) {

    public static CardSubject invitation(
            String title, String destination, String metaLine, byte[] coverBytes) {
        return new CardSubject(CardArt.KICKER_TEXT, title, destination, metaLine, coverBytes);
    }


    public static CardSubject dead() {
        return new CardSubject(CardArt.DEAD_KICKER, CardArt.DEAD_TITLE, null, null, null);
    }
}
