package com.largata.postcard.web;

import java.util.UUID;


public record FilePostcardRequest(String caption, UUID diaryId, UUID diaryDayId) {}
