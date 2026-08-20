package com.largata.ws;

import java.util.List;
import java.util.Set;


public final class OriginPolicy {

    private final Set<String> allowed;

    private OriginPolicy(Set<String> allowed) {
        this.allowed = allowed;
    }

    public static OriginPolicy allowing(List<String> origins) {
        return new OriginPolicy(Set.copyOf(origins));
    }


    public static OriginPolicy browsersRefused() {
        return new OriginPolicy(Set.of());
    }


    public boolean admits(String origin) {
        if (origin == null || origin.isBlank()) {
            return true;
        }
        return allowed.contains(origin);
    }
}
