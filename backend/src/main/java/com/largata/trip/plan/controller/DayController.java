package com.largata.trip.plan.controller;

import static com.largata.trip.room.Door.Rule.EDITABLE;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.Owner;
import com.largata.trip.exception.NotTheTripOwnerException;
import com.largata.trip.plan.dto.DayRequest;
import com.largata.trip.plan.dto.DayResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.plan.service.DayService;


@RestController
@RequestMapping("/v1/trips/{itineraryId}/days")
class DayController {

    private final DayService days;

    DayController(DayService days) {
        this.days = days;
    }

    @PostMapping
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.CREATED)
    DayResponse append(@CurrentMember Membership member, @Valid @RequestBody DayRequest request) {
        return DayResponse.of(days.appendDay(theOwner(member), request.title()));
    }

    @PatchMapping("/{dayId}")
    @Door(EDITABLE)
    DayResponse rename(
            @CurrentMember Membership member, @PathVariable UUID dayId, @Valid @RequestBody DayRequest request) {
        return DayResponse.of(days.renameDay(member, dayId, request.title()));
    }

    @DeleteMapping("/{dayId}")
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentMember Membership member, @PathVariable UUID dayId) {
        days.deleteDay(theOwner(member), dayId);
    }


    private static Owner theOwner(Membership member) {
        return Owner.of(member, NotTheTripOwnerException::toAddOrRemoveDays);
    }
}
