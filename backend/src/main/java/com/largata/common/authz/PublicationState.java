package com.largata.common.authz;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;


public interface PublicationState {


    boolean isPublished(UUID itineraryId);


    Set<UUID> publishedAmong(Collection<UUID> itineraryIds);
}
