package com.largata.itinerary.api;

import java.time.LocalDate;


interface HasDateRange {

    LocalDate startDate();

    LocalDate endDate();
}
