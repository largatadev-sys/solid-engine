package com.largata.join.join.service;


public enum ViewerJoinState {
    SIGNED_OUT,
    CAN_REQUEST,
    PENDING,
    MEMBER,
    DEAD;


    public String wireName() {
        return switch (this) {
            case SIGNED_OUT -> "signedOut";
            case CAN_REQUEST -> "canRequest";
            case PENDING -> "pending";
            case MEMBER -> "member";
            case DEAD -> "dead";
        };
    }
}
