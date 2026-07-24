package com.largata.itinerary;

import com.largata.common.error.ConflictException;

/**
 * Another member holds the edit lease on this itinerary (S1.4, ADR-014) — the single-writer lock is
 * taken, so this caller may not acquire it or write plan content right now.
 *
 * <p><strong>A 409, and the message names the holder.</strong> {@link ConflictException} → 409 (the
 * situation is a genuine conflict on a shared resource, not a bad request or a missing one), and the
 * message carries the holder's display name so the client's "{name} is editing this itinerary right
 * now" modal can show it verbatim (the standing envelope convention: clients branch on {@code code},
 * show {@code message} as-is). The code is stable — {@code EDIT_LOCKED} — so a client that wants to
 * special-case the lock (render the modal rather than a generic error toast) keys on that, never on
 * the prose.
 *
 * <p>The holder's name is resolved through the identity module ({@code TravelerService.summariesByIds},
 * the S1.2 cross-module name lookup) at the point the lock is refused — never stored on the lease
 * row, which holds only the holder's id (a name is a snapshot identity owns, ADR-002).
 */
class EditLockedException extends ConflictException {

    EditLockedException(String holderDisplayName) {
        super("EDIT_LOCKED", holderDisplayName + " is editing this itinerary right now.");
    }
}
