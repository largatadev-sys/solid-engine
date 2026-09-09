package com.largata.trip.fork;

import com.largata.trip.api.TripCreationApi;
import com.largata.trip.plan.entity.Activity;
import com.largata.trip.plan.entity.ActivityFields;
import com.largata.trip.plan.entity.Day;
import com.largata.trip.plan.repository.ActivityRepository;
import com.largata.trip.plan.repository.DayRepository;
import com.largata.trip.trip.entity.Trip;
import com.largata.trip.trip.entity.TripFields;
import com.largata.trip.trip.repository.TripRepository;
import com.largata.trip.workspace.service.WorkspaceService;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
class TripCreationService implements TripCreationApi {

    private final TripRepository trips;
    private final DayRepository days;
    private final ActivityRepository activities;
    private final WorkspaceService workspaces;

    TripCreationService(
            TripRepository trips,
            DayRepository days,
            ActivityRepository activities,
            WorkspaceService workspaces) {
        this.trips = trips;
        this.days = days;
        this.activities = activities;
        this.workspaces = workspaces;
    }


    @Override
    @Transactional
    public UUID createFrom(PlanBlueprint blueprint, UUID ownerId) {
        Instant at = Instant.now();
        Trip copy =
                trips.save(
                        Trip.newTrip(
                                ownerId,
                                new TripFields(
                                        blueprint.title(),
                                        blueprint.destination(),
                                        blueprint.currency(),
                                        blueprint.description(),
                                        blueprint.standouts(),
                                        blueprint.bestTimeOfYear() == null
                                                ? ""
                                                : blueprint.bestTimeOfYear(),
                                        null,
                                        null,
                                        blueprint.pin()),
                                at));
        copy.editFields(fieldsOfTrip(blueprint), ownerId, at);
        trips.save(copy);
        workspaces.formAround(copy.id(), ownerId, at);

        for (BlueprintDay day : blueprint.days()) {
            Day created = days.save(Day.at(copy.id(), day.ordinal(), day.title(), at));
            for (BlueprintActivity activity : day.activities()) {
                activities.save(
                        Activity.create(
                                created.id(), activity.sortOrder(), fieldsOf(activity), ownerId, at));
            }
        }
        return copy.id();
    }


    private static TripFields fieldsOfTrip(PlanBlueprint blueprint) {
        return new TripFields(
                blueprint.title(),
                blueprint.destination(),
                blueprint.currency(),
                blueprint.description(),
                blueprint.standouts(),
                blueprint.bestTimeOfYear() == null ? "" : blueprint.bestTimeOfYear(),
                null,
                null,
                blueprint.pin());
    }


    private static ActivityFields fieldsOf(BlueprintActivity activity) {
        return new ActivityFields(
                activity.title(),
                activity.timeOfDay() == null ? null : LocalTime.parse(activity.timeOfDay()),
                activity.costAmount(),
                activity.costCurrency(),
                activity.place(),
                activity.description(),
                activity.notes(),
                activity.externalUrl(),
                activity.bookingPurpose(),
                activity.bookingProvider(),
                activity.bookingPriceAmount(),
                activity.bookingPriceCurrency(),
                activity.pin());
    }
}
