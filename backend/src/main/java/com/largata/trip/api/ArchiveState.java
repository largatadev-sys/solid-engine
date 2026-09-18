package com.largata.trip.api;

import java.util.UUID;


public interface ArchiveState {


    boolean isArchived(UUID tripId);
}
