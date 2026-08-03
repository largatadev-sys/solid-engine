package com.largata.common.authz;

import java.util.UUID;


public interface PublicationState {


    boolean isPublished(UUID itineraryId);
}
