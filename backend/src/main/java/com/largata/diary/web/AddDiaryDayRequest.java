package com.largata.diary.web;

import java.time.LocalDate;


public record AddDiaryDayRequest(LocalDate date, String place) {}
