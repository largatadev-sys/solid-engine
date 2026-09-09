package com.largata.profile;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.InstantCursor;
import com.largata.common.api.Page;
import com.largata.identity.FollowService;
import com.largata.identity.FollowStanding;
import com.largata.identity.IdentityExceptions.NoSuchHandleException;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import com.largata.identity.api.PublicProfileResponse;
import com.largata.identity.api.TravelerCardResponse;
import com.largata.profile.api.DiaryTripResponse;
import com.largata.profile.api.ShowcaseItineraryResponse;
import com.largata.postcard.api.LegacyEntries;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.largata.publication.api.ItineraryDiscoveryApi;
import com.largata.publication.api.ItineraryDiscoveryApi.DiscoverableItinerary;
import com.largata.trip.api.MembershipApi;
import com.largata.trip.api.TripApi;
import com.largata.trip.api.TripTeaser;


@Service
public class PublicProfileService {


    private final ItineraryDiscoveryApi itineraries;
    private final LegacyEntries entries;
    private final MembershipApi workspaces;
    private final TravelerService travelers;
    private final Analytics analytics;
    private final FollowService follows;
    private final TripApi trips;

    PublicProfileService(
            ItineraryDiscoveryApi itineraries,
            LegacyEntries entries,
            MembershipApi workspaces,
            TravelerService travelers,
            Analytics analytics,
            FollowService follows,
            TripApi trips) {
        this.itineraries = itineraries;
        this.entries = entries;
        this.workspaces = workspaces;
        this.travelers = travelers;
        this.analytics = analytics;
        this.follows = follows;
        this.trips = trips;
    }


    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;


    @Transactional(readOnly = true)
    public ProfileCounts countsFor(UUID travelerId) {
        java.util.Set<UUID> archived = workspaces.allArchivedTripIds();
        return new ProfileCounts(
                itineraries.countOwnedBy(travelerId, archived),
                itineraries.countDestinationsOwnedBy(travelerId, archived));
    }


    @Transactional(readOnly = true)
    public Page<ShowcaseItineraryResponse> myShowcase(
            UUID travelerId, String cursor, Integer requestedLimit) {
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<DiscoverableItinerary> found =
                itineraries.ownedPage(
                        travelerId,
                        workspaces.allArchivedTripIds(),
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        boolean more = found.size() > limit;
        List<DiscoverableItinerary> rows = more ? found.subList(0, limit) : found;
        List<ShowcaseItineraryResponse> cards = showcaseCardsOf(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        DiscoverableItinerary last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.publishedAt(), last.id()));
    }


    public record ProfileCounts(long publishedCount, long destinationCount) {}


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }


    @Transactional(readOnly = true)
    public PublicProfileResponse byHandle(String rawHandle, UUID viewerId) {
        TravelerSummary subject = onboardedByHandle(rawHandle);

        analytics.emit(
                AnalyticsEvent.named("public_profile_viewed")
                        .with("travelerId", viewerId)
                        .with("subjectId", subject.id())
                        .build());

        FollowStanding standing = follows.standingOf(subject.id(), viewerId);

        return new PublicProfileResponse(
                TravelerCardResponse.of(subject),
                subject.bio(),
                subject.vanityNumber(),
                itineraries.countOwnedBy(subject.id(), workspaces.allArchivedTripIds()),
                itineraries.countDestinationsOwnedBy(subject.id(), workspaces.allArchivedTripIds()),
                standing.followersCount(),
                standing.followingCount(),
                standing.followedByViewer(),
                standing.followsViewer(),
                subject.profileVisibility().wireName(),
                standing.viewerRelation().wireName());
    }


    @Transactional(readOnly = true)
    public Page<ShowcaseItineraryResponse> showcaseOf(
            String rawHandle, String cursor, Integer requestedLimit) {
        TravelerSummary subject = onboardedByHandle(rawHandle);
        int limit = clamp(requestedLimit);
        InstantCursor from = cursor == null ? null : InstantCursor.decode(cursor);

        List<DiscoverableItinerary> found =
                itineraries.ownedPage(
                        subject.id(),
                        workspaces.allArchivedTripIds(),
                        from == null ? null : from.at(),
                        from == null ? null : from.id(),
                        limit + 1);

        boolean more = found.size() > limit;
        List<DiscoverableItinerary> rows = more ? found.subList(0, limit) : found;
        List<ShowcaseItineraryResponse> cards = showcaseCardsOf(rows);

        if (!more) {
            return Page.exhausted(cards);
        }
        DiscoverableItinerary last = rows.getLast();
        return Page.of(cards, InstantCursor.encode(last.publishedAt(), last.id()));
    }


    @Transactional(readOnly = true)
    public Page<DiaryTripResponse> diaryTripsOf(
            String rawHandle, String cursor, Integer requestedLimit) {
        TravelerSummary subject = onboardedByHandle(rawHandle);
        int limit = clamp(requestedLimit);
        UUID from = cursor == null ? null : Cursor.decode(cursor);

        List<LegacyEntries.TripRoll> found = entries.tripsOf(subject.id(), from, limit + 1);

        boolean more = found.size() > limit;
        List<LegacyEntries.TripRoll> rows = more ? found.subList(0, limit) : found;
        List<DiaryTripResponse> sections = diarySectionsOf(rows);

        if (!more) {
            return Page.exhausted(sections);
        }
        return Page.of(sections, Cursor.encode(rows.getLast().latestEntryId()));
    }


    private TravelerSummary onboardedByHandle(String rawHandle) {
        return travelers.onboardedByExactHandle(rawHandle).orElseThrow(NoSuchHandleException::new);
    }


    private List<ShowcaseItineraryResponse> showcaseCardsOf(List<DiscoverableItinerary> rows) {
        return rows.stream()
                .map(
                        itinerary ->
                                new ShowcaseItineraryResponse(
                                        itinerary.id(),
                                        itinerary.title(),
                                        itinerary.destination(),
                                        itinerary.durationDays() == null ? 0 : itinerary.durationDays(),
                                        itinerary.coverImageUrl()))
                .toList();
    }


    private List<DiaryTripResponse> diarySectionsOf(List<LegacyEntries.TripRoll> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> tripIds = rows.stream().map(LegacyEntries.TripRoll::tripId).toList();
        Set<UUID> archived = workspaces.archivedAmong(tripIds);
        Map<UUID, TripTeaser> trips = tripsOf(tripIds);

        return rows.stream()
                .filter(row -> !archived.contains(row.tripId()))
                .map(row -> sectionOf(row, trips))
                .filter(section -> section != null)
                .toList();
    }


    private DiaryTripResponse sectionOf(LegacyEntries.TripRoll row, Map<UUID, TripTeaser> trips) {
        TripTeaser trip = trips.get(row.tripId());
        if (trip == null) {
            return null;
        }
        return new DiaryTripResponse(
                trip.tripId(),
                trip.title(),
                row.entryCount(),
                trip.destination(),
                0,
                trip.coverImageUrl());
    }


    private Map<UUID, TripTeaser> tripsOf(Collection<UUID> ids) {
        return trips.teasersOf(ids).stream()
                .collect(Collectors.toMap(TripTeaser::tripId, teaser -> teaser));
    }

}
