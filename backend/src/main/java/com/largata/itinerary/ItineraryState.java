package com.largata.itinerary;

/**
 * The Itinerary state machine (02-domain-model): {@code draft → active → completed → published}.
 *
 * <p>S0.3 only ever produces {@code DRAFT}: the transitions arrive with the stories that own them
 * (register #10 decides the draft→active trigger at S1.7; publishing is S4.1). The full vocabulary
 * is declared here anyway — the states are the domain's, decided at design time, and an enum that
 * grew one value per story would read as if the model were being discovered.
 */
public enum ItineraryState {
    DRAFT,
    ACTIVE,
    COMPLETED,
    PUBLISHED;

    /** The wire and column form: lower-case, as the API contract and V3 both spell it. */
    public String wireName() {
        return name().toLowerCase();
    }
}
