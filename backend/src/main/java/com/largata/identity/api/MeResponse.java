package com.largata.identity.api;

import com.largata.identity.Traveler;
import java.util.List;
import java.util.UUID;


public record MeResponse(
        UUID id,
        String displayName,
        String email,
        String handle,
        String suggestedHandle,
        String avatarUrl,
        String bio,
        List<String> goals,
        List<String> interests,
        String country,
        String preferredCurrency,
        String homeCity,
        boolean onboardingCompleted,
        String vanityNumber) {

    public static MeResponse of(Traveler traveler, String suggestedHandle) {
        return new MeResponse(
                traveler.id(),
                traveler.displayName(),
                traveler.email(),
                traveler.handle(),
                suggestedHandle,
                traveler.avatarUrl(),
                traveler.bio(),
                traveler.goals(),
                traveler.interests(),
                traveler.country(),
                traveler.preferredCurrency(),
                traveler.homeCity(),
                traveler.onboardingCompleted(),
                traveler.vanityNumber());
    }
}
