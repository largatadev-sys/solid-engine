package com.largata.identity;


public record FollowStanding(
        long followersCount,
        long followingCount,
        boolean followedByViewer,
        boolean followsViewer,
        ViewerRelation viewerRelation) {}
