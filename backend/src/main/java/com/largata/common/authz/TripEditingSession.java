package com.largata.common.authz;

import java.util.Optional;


public interface TripEditingSession {


    Optional<String> heldByAnotherTraveler(Membership member);
}
