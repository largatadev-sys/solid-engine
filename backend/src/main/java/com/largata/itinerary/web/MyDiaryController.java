package com.largata.itinerary.web;

import com.largata.common.api.Page;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.DiaryService;
import com.largata.itinerary.api.DiaryTripResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/me/diary")
class MyDiaryController {

    private final DiaryService diary;

    MyDiaryController(DiaryService diary) {
        this.diary = diary;
    }


    @GetMapping("/trips")
    Page<DiaryTripResponse> trips(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return diary.myTrips(traveler.id(), cursor, limit);
    }
}
