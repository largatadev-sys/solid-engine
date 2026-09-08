package com.largata.trip.plan;

import com.largata.trip.api.ActivityFacts;
import com.largata.trip.api.PlanApi;
import com.largata.trip.api.TripDayFacts;
import com.largata.trip.api.TripPlan;
import com.largata.trip.record.TripPlanHeaders;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
class PlanReadService implements PlanApi {

    private final DayRepository days;
    private final ActivityRepository activities;
    private final TripPlanHeaders headers;

    PlanReadService(DayRepository days, ActivityRepository activities, TripPlanHeaders headers) {
        this.days = days;
        this.activities = activities;
        this.headers = headers;
    }


    @Transactional(readOnly = true)
    public Optional<TripPlan> planOf(UUID tripId) {
        return headers.headerOf(tripId).map(header -> header.withDays(daysOf(tripId)));
    }


    private List<TripPlan.PlanDay> daysOf(UUID tripId) {
        return days.findByItineraryIdOrderByOrdinalAsc(tripId).stream()
                .map(day -> new TripPlan.PlanDay(day.ordinal(), day.title(), activitiesOf(day.id())))
                .toList();
    }


    private List<TripPlan.PlanActivity> activitiesOf(UUID dayId) {
        return activities.findByDayIdOrderBySortOrderAscIdAsc(dayId).stream()
                .map(
                        activity ->
                                new TripPlan.PlanActivity(
                                        activity.sortOrder(),
                                        activity.title(),
                                        activity.timeOfDay() == null
                                                ? null
                                                : activity.timeOfDay().toString(),
                                        activity.costAmount(),
                                        activity.costCurrency(),
                                        activity.place(),
                                        activity.description(),
                                        activity.notes(),
                                        activity.externalUrl(),
                                        activity.bookingPurpose(),
                                        activity.bookingProvider(),
                                        activity.bookingPriceAmount(),
                                        activity.bookingPriceCurrency()))
                .toList();
    }


    @Transactional(readOnly = true)
    public Optional<TripDayFacts> dayFactsOf(UUID tripId, UUID dayId) {
        if (dayId == null) {
            return Optional.empty();
        }
        return days.findByIdAndItineraryId(dayId, tripId)
                .map(day -> new TripDayFacts(day.id(), day.ordinal(), day.title(), labelOf(day)));
    }


    @Transactional(readOnly = true)
    public Optional<ActivityFacts> activityFactsOf(UUID tripId, UUID activityId) {
        if (activityId == null) {
            return Optional.empty();
        }
        return activities
                .findById(activityId)
                .flatMap(
                        activity ->
                                days.findByIdAndItineraryId(activity.dayId(), tripId)
                                        .map(day -> factsOf(activity, day)));
    }


    private static ActivityFacts factsOf(Activity activity, Day day) {
        return new ActivityFacts(
                activity.id(),
                day.id(),
                day.ordinal(),
                activity.title(),
                labelOf(day),
                activity.timeOfDay(),
                activity.place(),
                activity.pin() == null ? null : activity.pin().latitude(),
                activity.pin() == null ? null : activity.pin().longitude(),
                activity.pin() == null ? null : (short) activity.pin().zoom());
    }


    private static String labelOf(Day day) {
        String prefix = "Day " + day.ordinal();
        String title = day.title();
        return title == null || title.isBlank() ? prefix : prefix + ": " + title.strip();
    }
}
