package com.largata.identity.api;

import com.largata.identity.Traveler;
import java.util.UUID;


public record MeResponse(UUID id, String displayName, String email) {

    public static MeResponse of(Traveler traveler) {
        return new MeResponse(traveler.id(), traveler.displayName(), traveler.email());
    }
}
