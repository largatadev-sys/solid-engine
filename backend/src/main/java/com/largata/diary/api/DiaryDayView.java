package com.largata.diary.api;

import java.util.UUID;

public record DiaryDayView(UUID id, int ordinal, String place, String tripDayTitle) {}
