package com.largata.identity;

import java.util.UUID;


public record TravelerSummary(UUID id, String displayName, String handle, String avatarUrl) {}
