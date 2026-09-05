package com.largata.identity.api;

import com.largata.identity.ProfileEdit;
import com.largata.identity.ProfileVisibility;
import jakarta.validation.constraints.Size;
import java.util.List;


public record UpdateProfileRequest(
        @Size(max = 40, message = "That handle is too long.") String handle,
        @Size(max = 100, message = "That name is too long.") String displayName,
        @Size(max = 500, message = "Keep your bio under 500 characters.") String bio,
        @Size(max = 2000, message = "That photo URL is too long.") String avatarUrl,
        @Size(max = 20, message = "That is more goals than exist.") List<@Size(max = 40) String> goals,
        @Size(max = 40, message = "That is more interests than exist.") List<@Size(max = 40) String> interests,
        @Size(max = 2, message = "Country is a two-letter ISO code.") String country,
        @Size(max = 3, message = "Currency is a three-letter ISO code.") String preferredCurrency,
        @Size(max = 100, message = "That city name is too long.") String homeCity,
        String profileVisibility) {

    public ProfileEdit toEdit() {
        return new ProfileEdit(
                handle,
                displayName,
                bio,
                avatarUrl,
                goals,
                interests,
                country,
                preferredCurrency,
                homeCity,
                ProfileVisibility.parse(profileVisibility).orElse(null));
    }
}
