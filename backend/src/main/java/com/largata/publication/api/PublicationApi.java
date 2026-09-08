package com.largata.publication.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PublicationApi {

    Map<UUID, UUID> objectIdsByTrip(List<UUID> tripIds);
}
