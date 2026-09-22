package com.largata.trip.plan.controller;

import static com.largata.trip.room.Door.Rule.EDITABLE;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.plan.dto.ActivityRequest;
import com.largata.trip.plan.dto.ActivityResponse;
import com.largata.trip.plan.dto.DayResponse;
import com.largata.trip.plan.dto.MoveActivityRequest;
import com.largata.trip.plan.dto.ReorderActivitiesRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.largata.trip.plan.service.ActivityService;
import com.largata.trip.plan.service.ActivityPhotoService;


@RestController
@RequestMapping("/v1/trips/{itineraryId}/days/{dayId}/activities")
class ActivityController {

    private final ActivityService activities;
    private final ActivityPhotoService activityPhotos;

    ActivityController(ActivityService activities, ActivityPhotoService activityPhotos) {
        this.activities = activities;
        this.activityPhotos = activityPhotos;
    }

    @PostMapping
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.CREATED)
    ActivityResponse create(
            @CurrentMember Membership member, @PathVariable UUID dayId, @Valid @RequestBody ActivityRequest request) {
        return ActivityResponse.of(activities.create(member, dayId, request.toFields()));
    }

    @PatchMapping("/{activityId}")
    @Door(EDITABLE)
    ActivityResponse edit(
            @CurrentMember Membership member,
            @PathVariable UUID dayId,
            @PathVariable UUID activityId,
            @Valid @RequestBody ActivityRequest request) {
        return ActivityResponse.of(activities.edit(member, dayId, activityId, request.toFields()));
    }

    @DeleteMapping("/{activityId}")
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentMember Membership member, @PathVariable UUID dayId, @PathVariable UUID activityId) {
        activities.delete(member, dayId, activityId);
    }


    @PostMapping("/{activityId}/photos")
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.CREATED)
    ActivityResponse addPhoto(
            @CurrentMember Membership member,
            @PathVariable UUID dayId,
            @PathVariable UUID activityId,
            @RequestPart("photo") MultipartFile photo)
            throws IOException {
        activityPhotos.add(member, activityId, photo.getBytes());
        return ActivityResponse.of(activities.view(member, dayId, activityId));
    }


    @DeleteMapping("/{activityId}/photos/{photoId}")
    @Door(EDITABLE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void removePhoto(
            @CurrentMember Membership member, @PathVariable UUID activityId, @PathVariable UUID photoId) {
        activityPhotos.remove(member, activityId, photoId);
    }


    @PutMapping("/order")
    @Door(EDITABLE)
    DayResponse reorder(
            @CurrentMember Membership member,
            @PathVariable UUID dayId,
            @Valid @RequestBody ReorderActivitiesRequest request) {
        return DayResponse.of(
                activities.reorder(member, dayId, request.expectedActivityIds(), request.activityIds()));
    }


    @PostMapping("/{activityId}/move")
    @Door(EDITABLE)
    ActivityResponse move(
            @CurrentMember Membership member,
            @PathVariable UUID dayId,
            @PathVariable UUID activityId,
            @Valid @RequestBody MoveActivityRequest request) {
        return ActivityResponse.of(activities.move(member, dayId, activityId, request.targetDayId()));
    }
}
