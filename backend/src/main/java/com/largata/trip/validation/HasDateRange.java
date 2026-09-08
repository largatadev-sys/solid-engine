package com.largata.trip.validation;

import java.time.LocalDate;


public interface HasDateRange {

    LocalDate rangeStart();

    LocalDate rangeEnd();
}
