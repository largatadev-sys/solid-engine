package com.largata.identity.api;

public record FollowStateResponse(String state) {

    public static final String FOLLOWING = "following";
    public static final String REQUESTED = "requested";


    public static FollowStateResponse following() {
        return new FollowStateResponse(FOLLOWING);
    }


    public static FollowStateResponse requested() {
        return new FollowStateResponse(REQUESTED);
    }
}
