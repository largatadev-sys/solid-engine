package com.largata.postcard.dto;

import java.util.UUID;

public record FilePostcardRequest(String caption, UUID diaryId, UUID diaryDayId) {}
