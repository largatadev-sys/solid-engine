package com.largata.postcard.web;

import com.largata.common.geo.PinPayload;
import jakarta.validation.Valid;
import java.util.UUID;


public record CreatePostcardRequest(
        String caption, String place, @Valid PinPayload pin, UUID diaryId) {}
