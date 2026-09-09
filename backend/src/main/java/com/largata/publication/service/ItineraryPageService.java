package com.largata.publication.service;

import com.largata.common.geo.PinPayload;
import com.largata.identity.TravelerService;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.publication.dto.ItineraryPageResponse;
import com.largata.publication.dto.ItineraryPageResponse.EstimatedCostResponse;
import com.largata.publication.dto.ItineraryPageResponse.PageActivityResponse;
import com.largata.media.MediaUrls;
import com.largata.publication.dto.ItineraryPageResponse.PageDayResponse;
import com.largata.publication.dto.ItineraryPageResponse.PagePhotoResponse;
import com.largata.publication.entity.ItineraryObject;
import com.largata.trip.api.ForkApi;
import com.largata.publication.dto.ItineraryPageResponse.ForkedFromResponse;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;


@Service
public class ItineraryPageService {

    private final ObjectMapper json;
    private final TravelerService travelers;
    private final ForkApi forks;

    ItineraryPageService(ObjectMapper json, TravelerService travelers, ForkApi forks) {
        this.json = json;
        this.travelers = travelers;
        this.forks = forks;
    }


    @Transactional(readOnly = true)
    public ItineraryPageResponse pageOf(ItineraryObject object, java.util.UUID readerId) {
        PlanSnapshot snapshot = json.readValue(object.plan(), PlanSnapshot.class);
        List<PageDayResponse> days =
                snapshot.days().stream().map(ItineraryPageService::dayOf).toList();
        return new ItineraryPageResponse(
                object.id(),
                object.tripId(),
                object.publishedAt().toString(),
                snapshot.title(),
                snapshot.destination(),
                PinPayload.of(snapshot.pin()),
                snapshot.description(),
                snapshot.standouts(),
                snapshot.bestTimeOfYear(),
                snapshot.coverImageUrl(),
                snapshot.days().size(),
                creatorOf(object),
                costOf(snapshot).orElse(null),
                days,
                forks.forkCountOf(object.tripId()),
                forks.provenanceOf(object.tripId(), readerId)
                        .map(
                                source ->
                                        new ForkedFromResponse(
                                                source.sourceTripId(),
                                                source.ownerHandle(),
                                                source.sourceVisible()))
                        .orElse(null),
                json.readTree(object.plan()));
    }


    private TravelerCardResponse creatorOf(ItineraryObject object) {
        return travelers
                .summaryById(object.ownerId())
                .map(TravelerCardResponse::of)
                .orElse(null);
    }


    private static PageDayResponse dayOf(PlanSnapshot.Day day) {
        return new PageDayResponse(
                day.ordinal(),
                day.title(),
                day.activities().stream().map(ItineraryPageService::activityOf).toList());
    }


    private static PageActivityResponse activityOf(PlanSnapshot.Activity activity) {
        return new PageActivityResponse(
                activity.sortOrder(),
                activity.title(),
                activity.timeOfDay(),
                activity.costAmount(),
                activity.costCurrency(),
                activity.place(),
                PinPayload.of(activity.pin()),
                activity.description(),
                activity.notes(),
                activity.externalUrl(),
                activity.bookingPurpose(),
                activity.bookingProvider(),
                activity.bookingPriceAmount(),
                activity.bookingPriceCurrency(),
                photosOf(activity));
    }


    private static List<PagePhotoResponse> photosOf(PlanSnapshot.Activity activity) {
        if (activity.photoIds() == null) {
            return List.of();
        }
        return activity.photoIds().stream()
                .map(id -> new PagePhotoResponse(id, MediaUrls.of(id), MediaUrls.thumbnailOf(id)))
                .toList();
    }


    private static Optional<EstimatedCostResponse> costOf(PlanSnapshot snapshot) {
        List<PlanSnapshot.Activity> all =
                snapshot.days().stream().flatMap(day -> day.activities().stream()).toList();
        List<PlanSnapshot.Activity> priced =
                all.stream().filter(activity -> activity.costAmount() != null).toList();
        List<PlanSnapshot.Activity> counted =
                priced.stream().filter(activity -> activity.costAmount().signum() != 0).toList();
        if (counted.isEmpty()) {
            return Optional.empty();
        }

        Set<String> currencies =
                counted.stream()
                        .map(ItineraryPageService::normalize)
                        .collect(Collectors.toCollection(HashSet::new));
        if (currencies.size() != 1) {
            return Optional.empty();
        }

        BigDecimal total =
                priced.stream()
                        .map(PlanSnapshot.Activity::costAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        return Optional.of(
                new EstimatedCostResponse(
                        total, currencies.iterator().next(), priced.size() != all.size()));
    }


    private static String normalize(PlanSnapshot.Activity activity) {
        String currency = activity.costCurrency();
        return currency == null || currency.isBlank() ? null : currency.strip().toUpperCase(Locale.ROOT);
    }
}
