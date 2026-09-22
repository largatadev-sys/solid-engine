package com.largata.trip.plan.controller;

import static com.largata.trip.room.Door.Rule.EDITABLE;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.plan.service.PlanSaveService;
import com.largata.trip.trip.dto.TripResponse;
import com.largata.trip.plan.dto.SavePlanRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.trip.service.TripService;


@RestController
@RequestMapping("/v1/trips/{itineraryId}/plan")
class PlanController {

    private final PlanSaveService plans;
    private final TripService itineraries;

    PlanController(PlanSaveService plans, TripService itineraries) {
        this.plans = plans;
        this.itineraries = itineraries;
    }

    @PutMapping
    @Door(EDITABLE)
    TripResponse save(@CurrentMember Membership member, @Valid @RequestBody SavePlanRequest request) {
        plans.save(member, request);
        return TripResponse.of(itineraries.viewPlan(member));
    }
}
