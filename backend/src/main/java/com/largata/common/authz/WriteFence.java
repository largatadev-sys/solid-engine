package com.largata.common.authz;

import org.springframework.stereotype.Component;


@Component
public class WriteFence {

    private final TripWritability writability;

    public WriteFence(TripWritability writability) {
        this.writability = writability;
    }


    public void requireWritable(Membership member) {
        if (writability.isFrozen(member.itineraryId())) {
            throw new TripArchivedException();
        }
    }
}
