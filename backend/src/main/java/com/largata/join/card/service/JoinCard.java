package com.largata.join.card.service;



public record JoinCard(
        boolean live, String tripTitle, String metaLine, long version, CardSubject subject) {

    static JoinCard live(String tripTitle, String metaLine, long version, CardSubject subject) {
        return new JoinCard(true, tripTitle, metaLine, version, subject);
    }


    static JoinCard dead(long version) {
        return new JoinCard(false, null, null, version, CardSubject.dead());
    }
}
