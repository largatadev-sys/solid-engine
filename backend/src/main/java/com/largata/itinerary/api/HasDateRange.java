package com.largata.itinerary.api;

import java.time.LocalDate;


interface HasDateRange {

    LocalDate rangeStart();

    LocalDate rangeEnd();
}
