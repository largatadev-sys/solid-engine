package com.largata.trip.room;

import com.largata.identity.web.CurrentTravelers;
import com.largata.trip.exception.ItineraryPublishedException;
import com.largata.trip.exception.MembershipFrozenException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;


public final class WorkspaceThreshold implements HandlerInterceptor {

    public static final String MEMBERSHIP_ATTRIBUTE = WorkspaceThreshold.class.getName() + ".membership";

    private static final Set<String> READS = Set.of("GET", "HEAD", "OPTIONS");

    private final CurrentTravelers travelers;
    private final AuthorizationGuard guard;
    private final TripFence fence;
    private final UndeclaredWrites undeclaredWrites;

    public WorkspaceThreshold(
            CurrentTravelers travelers,
            AuthorizationGuard guard,
            TripFence fence,
            UndeclaredWrites undeclaredWrites) {
        if (travelers == null || guard == null || fence == null || undeclaredWrites == null) {
            throw new IllegalArgumentException("The threshold is who is asking, the guard, the fence and a policy");
        }
        this.travelers = travelers;
        this.guard = guard;
        this.fence = fence;
        this.undeclaredWrites = undeclaredWrites;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) {
            return true;
        }
        Optional<UUID> named = tripIdIn(pathOf(request));
        if (named.isEmpty()) {
            return true;
        }
        UUID tripId = named.get();

        Membership member = guard.requireMember(travelers.current().id(), tripId);
        if (!method.hasMethodAnnotation(ReachesClosedRoom.class)) {
            fence.requireOpenRoom(tripId);
        }
        demandTheDoor(method, request.getMethod(), tripId);

        request.setAttribute(MEMBERSHIP_ATTRIBUTE, member);
        return true;
    }


    static Optional<UUID> tripIdIn(String path) {
        String[] segments = path.split("/");
        if (segments.length < 4 || !"v1".equals(segments[1]) || !"trips".equals(segments[2])) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(segments[3]));
        } catch (IllegalArgumentException notAnId) {
            return Optional.empty();
        }
    }


    private void demandTheDoor(HandlerMethod method, String httpMethod, UUID tripId) {
        Door door = method.getMethodAnnotation(Door.class);
        if (door == null) {
            if (!READS.contains(httpMethod) && undeclaredWrites == UndeclaredWrites.REFUSED) {
                throw new IllegalStateException(
                        "A write under the threshold declares its door, and this one does not: "
                                + method.getBeanType().getSimpleName()
                                + "."
                                + method.getMethod().getName());
            }
            return;
        }
        switch (door.value()) {
            case OPEN -> {}
            case EDITABLE -> fence.requireUnfrozen(tripId, ItineraryPublishedException::new);
            case MEMBERSHIP_MUTABLE -> fence.requireUnfrozen(tripId, MembershipFrozenException::new);
        }
    }


    private static String pathOf(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        return context != null && !context.isEmpty() && uri.startsWith(context)
                ? uri.substring(context.length())
                : uri;
    }
}
