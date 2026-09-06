package com.largata.diary.web;

import java.time.LocalDate;


public record DescribeDiaryRequest(
        String title, String destination, LocalDate startDate, LocalDate endDate) {}
