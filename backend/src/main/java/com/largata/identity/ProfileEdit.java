package com.largata.identity;

import java.util.List;


public record ProfileEdit(
        String handle,
        String displayName,
        String bio,
        String avatarUrl,
        List<String> goals,
        List<String> interests,
        String country,
        String preferredCurrency,
        String homeCity,
        ProfileVisibility profileVisibility) {}
