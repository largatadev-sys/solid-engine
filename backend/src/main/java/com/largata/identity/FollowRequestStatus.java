package com.largata.identity;

public enum FollowRequestStatus {
    PENDING,
    APPROVED,
    DECLINED,
    CANCELLED;


    public boolean isPending() {
        return this == PENDING;
    }
}
