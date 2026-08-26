package com.largata.itinerary;

import com.largata.workspace.WorkspaceService;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;


@Component
class StrangersSurface {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final int MAX_PAGE_SIZE = 50;

    private final WorkspaceService workspaces;

    StrangersSurface(WorkspaceService workspaces) {
        this.workspaces = workspaces;
    }


    String archivedArray() {
        Set<UUID> archived = workspaces.allArchivedItineraryIds();
        return archived.isEmpty()
                ? "{}"
                : archived.stream().map(UUID::toString).collect(Collectors.joining(",", "{", "}"));
    }


    static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
