package com.largata.itinerary;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.identity.IdentityExceptions.NoSuchHandleException;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.api.PublicProfileResponse;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.itinerary.api.DiaryTripResponse;
import com.largata.itinerary.api.ShowcaseItineraryResponse;
import com.largata.workspace.WorkspaceService;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PublicProfileService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final ItineraryRepository itineraries;
    private final DiaryEntryRepository entries;
    private final DayService days;
    private final WorkspaceService workspaces;
    private final TravelerService travelers;
    private final Analytics analytics;

    PublicProfileService(
            ItineraryRepository itineraries,
            DiaryEntryRepository entries,
            DayService days,
            WorkspaceService workspaces,
            TravelerService travelers,
            Analytics analytics) {
        this.itineraries = itineraries;
        this.entries = entries;
        this.days = days;
        this.workspaces = workspaces;
        this.travelers = travelers;
        this.analytics = analytics;
    }


    @Transactional(readOnly = true)
    public PublicProfileResponse byHandle(String rawHandle, UUID viewerId) {
        TravelerSummary subject = onboardedByHandle(rawHandle);

        analytics.emit(
                AnalyticsEvent.named("public_profile_viewed")
                        .with("travelerId", viewerId)
                        .with("subjectId", subject.id())
                        .build());

        return new PublicProfileResponse(
                TravelerCardResponse.of(subject),
                subject.bio(),
                subject.vanityNumber(),
                itineraries.countOnTheStrangersSurface(subject.id(), archivedArray()),
                postcardCountOf(subject.id()));
    }


    @Transactional(readOnly = true)
    public Page<ShowcaseItineraryResponse> showcaseOf(
            String rawHandle, String cursor, Integer requestedLimit) {
        TravelerSummary subject = onboardedByHandle(rawHandle);
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<Itinerary> found =
                itineraries.findStrangersSurfacePage(
                        subject.id(),
                        archivedArray(),
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        boolean more = found.size() > limit;
        List<Itinerary> rows = more ? found.subList(0, limit) : found;
        List<ShowcaseItineraryResponse> cards = showcaseCardsOf(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        Itinerary last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.publishedAt(), last.id()));
    }


    @Transactional(readOnly = true)
    public Page<DiaryTripResponse> diaryTripsOf(
            String rawHandle, String cursor, Integer requestedLimit) {
        TravelerSummary subject = onboardedByHandle(rawHandle);
        int limit = clamp(requestedLimit);
        UUID from = cursor == null ? null : Cursor.decode(cursor);

        List<DiaryEntryRepository.DiaryTripRow> found =
                from == null
                        ? entries.findSharedTrips(subject.id(), Limit.of(limit + 1))
                        : entries.findSharedTripsBefore(subject.id(), from, Limit.of(limit + 1));

        boolean more = found.size() > limit;
        List<DiaryEntryRepository.DiaryTripRow> rows = more ? found.subList(0, limit) : found;
        List<DiaryTripResponse> sections = diarySectionsOf(rows);

        if (!more) {
            return Page.exhausted(sections);
        }
        return Page.of(sections, Cursor.encode(rows.getLast().getLatestEntryId()));
    }


    private TravelerSummary onboardedByHandle(String rawHandle) {
        return travelers.onboardedByExactHandle(rawHandle).orElseThrow(NoSuchHandleException::new);
    }


    private long postcardCountOf(UUID subjectId) {
        Set<UUID> archived = workspaces.allArchivedItineraryIds();
        return archived.isEmpty()
                ? entries.countShared(subjectId)
                : entries.countSharedOutsideArchived(subjectId, archived);
    }


    private List<ShowcaseItineraryResponse> showcaseCardsOf(List<Itinerary> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<UUID, Long> dayCounts = days.dayCountsOf(rows.stream().map(Itinerary::id).toList());
        return rows.stream()
                .map(
                        itinerary ->
                                ShowcaseItineraryResponse.of(
                                        itinerary, dayCounts.getOrDefault(itinerary.id(), 0L).intValue()))
                .toList();
    }


    private List<DiaryTripResponse> diarySectionsOf(List<DiaryEntryRepository.DiaryTripRow> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> tripIds = rows.stream().map(DiaryEntryRepository.DiaryTripRow::getItineraryId).toList();
        Set<UUID> archived = workspaces.archivedAmong(tripIds);
        Map<UUID, Itinerary> trips = tripsOf(tripIds);
        Map<UUID, Long> dayCounts = days.dayCountsOf(tripIds);

        return rows.stream()
                .filter(row -> !archived.contains(row.getItineraryId()))
                .map(row -> sectionOf(row, trips, dayCounts))
                .filter(section -> section != null)
                .toList();
    }


    private DiaryTripResponse sectionOf(
            DiaryEntryRepository.DiaryTripRow row, Map<UUID, Itinerary> trips, Map<UUID, Long> dayCounts) {
        Itinerary trip = trips.get(row.getItineraryId());
        if (trip == null) {
            return null;
        }
        return new DiaryTripResponse(
                trip.id(),
                trip.title(),
                row.getEntryCount(),
                trip.destination(),
                dayCounts.getOrDefault(trip.id(), 0L).intValue(),
                trip.coverImageUrl());
    }


    private Map<UUID, Itinerary> tripsOf(Collection<UUID> ids) {
        return itineraries.findAllById(ids).stream()
                .collect(Collectors.toMap(Itinerary::id, itinerary -> itinerary));
    }


    private String archivedArray() {
        Set<UUID> archived = workspaces.allArchivedItineraryIds();
        return archived.isEmpty()
                ? "{}"
                : archived.stream().map(UUID::toString).collect(Collectors.joining(",", "{", "}"));
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
