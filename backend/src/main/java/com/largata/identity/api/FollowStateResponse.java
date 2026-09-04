package com.largata.identity.api;

import com.largata.identity.ViewerRelation;


public record FollowStateResponse(String state) {

    public static FollowStateResponse following() {
        return new FollowStateResponse(ViewerRelation.FOLLOWING.wireName());
    }


    public static FollowStateResponse requested() {
        return new FollowStateResponse(ViewerRelation.REQUESTED.wireName());
    }
}
