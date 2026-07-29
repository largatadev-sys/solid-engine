package com.largata.common.authz;

import java.util.UUID;


public interface TripWritability {


    boolean isFrozen(UUID itineraryId);
}
