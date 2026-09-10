package com.largata.trip.plan.service;

import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import com.largata.trip.api.ActivityFacts;
import com.largata.trip.api.PlanApi;
import com.largata.trip.api.TripDayFacts;
import com.largata.trip.api.TripPlan;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.trip.service.TripPlanHeaders;
import com.largata.trip.plan.repository.DayRepository;
import com.largata.trip.plan.repository.ActivityRepository;
import com.largata.trip.plan.entity.Activity;
import com.largata.trip.plan.entity.Day;


@Service
class PlanReadService implements PlanApi {

    private final DayRepository days;
    private final ActivityRepository activities;
    private final TripPlanHeaders headers;
    private final PhotoService photos;

    PlanReadService(
            DayRepository days,
            ActivityRepository activities,
            TripPlanHeaders headers,
            PhotoService photos) {
        this.days = days;
        this.activities = activities;
        this.headers = headers;
        this.photos = photos;
    }


    @Transactional(readOnly = true)
    public Optional<TripPlan> planOf(UUID tripId) {
        return headers.headerOf(tripId).map(header -> header.withDays(daysOf(tripId)));
    }


    private List<TripPlan.PlanDay> daysOf(UUID tripId) {
        List<Activity> all = activities.allUnder(tripId);
        Map<UUID, List<UUID>> photoIds = photoIdsFor(all);
        Map<UUID, List<TripPlan.PlanActivity>> byDay =
                all.stream()
                        .collect(
                                Collectors.groupingBy(
                                        Activity::dayId,
                                        LinkedHashMap::new,
                                        Collectors.mapping(
                                                activity -> planActivityOf(activity, photoIds),
                                                Collectors.toList())));
        return days.findByItineraryIdOrderByOrdinalAsc(tripId).stream()
                .map(
                        day ->
                                new TripPlan.PlanDay(
                                        day.ordinal(),
                                        day.title(),
                                        byDay.getOrDefault(day.id(), List.of())))
                .toList();
    }


    private Map<UUID, List<UUID>> photoIdsFor(List<Activity> all) {
        if (all.isEmpty()) {
            return Map.of();
        }
        return photos.idsBySubject(
                PhotoSubject.ACTIVITY, all.stream().map(Activity::id).toList());
    }


    private static TripPlan.PlanActivity planActivityOf(
            Activity activity, Map<UUID, List<UUID>> photoIds) {
        return new TripPlan.PlanActivity(
                activity.sortOrder(),
                activity.title(),
                activity.timeOfDay() == null ? null : activity.timeOfDay().toString(),
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
                activity.pin(),
                photoIds.getOrDefault(activity.id(), List.of()));
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
