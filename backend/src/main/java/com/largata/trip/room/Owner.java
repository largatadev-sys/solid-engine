package com.largata.trip.room;

import java.util.Objects;
import java.util.function.Supplier;


public final class Owner {

    private final Membership membership;

    private Owner(Membership membership) {
        this.membership = membership;
    }


    public static Owner of(Membership membership, Supplier<? extends RuntimeException> refusal) {
        if (membership == null || refusal == null) {
            throw new IllegalArgumentException("An owner is a membership that owns, and a refusal if it does not");
        }
        if (!membership.isOwner()) {
            throw refusal.get();
        }
        return new Owner(membership);
    }


    public Membership membership() {
        return membership;
    }


    @Override
    public boolean equals(Object other) {
        return other instanceof Owner that && membership.equals(that.membership);
    }


    @Override
    public int hashCode() {
        return Objects.hash(membership);
    }


    @Override
    public String toString() {
        return "Owner[" + membership + "]";
    }
}
