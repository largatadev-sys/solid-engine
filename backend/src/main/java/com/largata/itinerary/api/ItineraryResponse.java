package com.largata.itinerary.api;

import com.largata.itinerary.DayView;
import com.largata.itinerary.Itinerary;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The itinerary as the API shows it — one shape for create and for fetch, because they return the
 * same thing and two shapes would be two contracts to keep additive.
 *
 * <p><strong>{@code state} and {@code visibility} ship now, though both are constant in S0.3.</strong>
 * Nothing in this story can produce anything but {@code draft}/{@code private} — the transitions
 * arrive at S1.7 and S4.1. They are here anyway because the AC ("created itinerary is draft with
 * private visibility") is only directly testable if the client can see them, and because a client
 * that already reads the fields needs no change when the values start varying. Omission is free
 * under additive-only; adding later is free too — but a client shipped without them would have to be
 * updated to notice a trip had been published.
 *
 * <p><strong>{@code description}, {@code lastEditedBy/At} and {@code days} are S1.3 additions</strong>
 * (ADR-008: purely additive — an S0.3 client that never reads them keeps working). {@code days} is
 * the plan's structure (ADR-013), each carrying its activities; it is empty for a pre-S1.3 itinerary
 * or one created without a duration, which is a valid plan, not an error. {@code lastEdited*} is null
 * until the first field edit (ticket 04 writes it) — create is not an edit.
 *
 * <p><strong>{@code ownerId} is deliberately absent.</strong> S0.3 returns only the caller's own
 * itineraries, so it would say "you" in every response — and the moment E1 makes workspaces real,
 * "who owns this" becomes a question about membership, answered by the endpoint that owns that
 * question rather than smuggled onto this one.
 *
 * <p><strong>{@code archived} is the S1.9 addition, and it is a boolean beside {@code state} rather
 * than a value inside it — deliberately.</strong> Archive lives on the <em>workspace</em> machine
 * (02-domain-model), which is orthogonal to the itinerary's: a trip can be {@code completed} and
 * archived at once, and an {@code "archived"} value in {@code state} could not say both. Two
 * orthogonal facts in one enum is a modelling error that ADR-008 would make permanent on the wire.
 * The projection direction is the grilling's decision 2: the workspace stores it, this read model
 * exposes it. Purely additive — every pre-S1.9 client ignores the field and keeps working.
 */
public record ItineraryResponse(
        UUID id,
        String title,
        List<String> destinations,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String state,
        String visibility,
        boolean archived,
        UUID lastEditedBy,
        Instant lastEditedAt,
        List<DayResponse> days,
        Instant createdAt) {

    /**
     * <strong>The LIST-item shape only: no plan tree embedded.</strong> {@code GET /v1/itineraries}
     * shows cards, not plans, so it carries {@code days = []} rather than paying for a plan read the
     * card never uses.
     *
     * <p><strong>Not for create — and that correction is the point of this paragraph.</strong> This
     * overload originally served create too, on the reasoning that "create returns before any day is
     * meaningfully populated". That reasoning was <em>wrong</em>: {@code durationDays} seeds the days
     * inside the create transaction, and the mobile client seeds its detail cache from the create
     * response — so an empty {@code days} taught the app that a just-created 3-day trip had none, and
     * the plan screen showed "No days yet" until something forced a refetch. Create now uses {@link
     * #of(Itinerary, List)} via {@code ItineraryService.createWithPlan}. Any future path that creates
     * something and returns it must do the same; reaching for this overload there reintroduces the bug.
     */
    public static ItineraryResponse of(Itinerary itinerary) {
        return of(itinerary, List.of(), false);
    }

    /** The single-fetch shape: the itinerary with its day/activity plan embedded (S1.3). */
    public static ItineraryResponse of(Itinerary itinerary, List<DayView> days) {
        return of(itinerary, days, false);
    }

    /**
     * The S1.9 shape: as above, plus whether the trip's workspace is archived.
     *
     * <p><strong>{@code archived} arrives as a parameter rather than being read off the itinerary,
     * because the itinerary does not know</strong> — the fact lives on the workspace (ADR-002: modules
     * reach each other by service interface, never by another's tables). The caller that has both — a
     * controller, or the plan composition — supplies it.
     *
     * <p>The two overloads above default it to {@code false}, which is correct for every path that
     * cannot produce an archived trip: {@code create} makes a live one, and the list composes its own
     * value. A default that silently said "archived" would be the dangerous direction; this one at
     * worst under-reports on a path that has no archived case to report.
     */
    public static ItineraryResponse of(Itinerary itinerary, List<DayView> days, boolean archived) {
        return new ItineraryResponse(
                itinerary.id(),
                itinerary.title(),
                itinerary.destinations(),
                itinerary.description(),
                itinerary.startDate(),
                itinerary.endDate(),
                itinerary.state().wireName(),
                itinerary.visibility().wireName(),
                archived,
                itinerary.lastEditedBy(),
                itinerary.lastEditedAt(),
                days.stream().map(DayResponse::of).toList(),
                itinerary.createdAt());
    }
}
