package com.largata.invitation.web;

import java.util.UUID;

/**
 * The result of accepting an invitation (S1.2): the itinerary just joined, so the client can open it
 * (the walls-open moment made navigable). The membership is the real effect; this names where it
 * applies.
 */
public record AcceptResponse(UUID itineraryId) {}
