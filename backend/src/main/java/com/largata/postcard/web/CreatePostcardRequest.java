package com.largata.postcard.web;

import java.util.UUID;


public record CreatePostcardRequest(String caption, String place, UUID diaryId) {}
