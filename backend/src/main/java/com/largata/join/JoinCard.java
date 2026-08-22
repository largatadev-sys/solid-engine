package com.largata.join;

import com.largata.join.card.CardSubject;


public record JoinCard(
        boolean live, String tripTitle, String metaLine, long version, CardSubject subject) {

    static JoinCard live(String tripTitle, String metaLine, long version, CardSubject subject) {
        return new JoinCard(true, tripTitle, metaLine, version, subject);
    }


    static JoinCard dead(long version) {
        return new JoinCard(false, null, null, version, CardSubject.dead());
    }
}
