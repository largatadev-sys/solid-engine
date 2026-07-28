package com.largata.workspace;

/**
 * The Trip Workspace state machine (02-domain-model): {@code active → completed → archived}, with
 * <strong>archive reversible</strong> — unarchive returns the workspace to the state derivable from
 * its itinerary (S1.9, 2026-07-28).
 *
 * <p><strong>Two of these three values are derivable; one is not, and that asymmetry is the whole
 * reason the column exists.</strong> {@code ACTIVE} and {@code COMPLETED} mirror the itinerary
 * (1:1) — which is precisely why S1.7 refused to store them, and why the column deferred three
 * times. {@code ARCHIVED} is the first workspace fact the itinerary cannot answer, so it is what
 * finally justified the storage. The mirrored pair rides along because canon's machine names them
 * and because unarchive needs somewhere to return to.
 *
 * <p><strong>Unarchive recomputes rather than remembers</strong> (spec decision 8): there is no
 * "previous state" column, because the state below {@code ARCHIVED} is derivable at any moment from
 * the itinerary. Storing it would be the duplicated fact S1.7 rejected, with the added failure mode
 * of drifting out of step while archived.
 */
public enum WorkspaceState {
    ACTIVE,
    COMPLETED,
    ARCHIVED;

    /**
     * Whether the trip is frozen — the one question the write fence asks (S1.9 spec decision 4).
     *
     * <p>Written as a method rather than an {@code == ARCHIVED} comparison at each call site so that
     * the fence's meaning lives in one place: if a future state also freezes writes (canon has none
     * planned), the call sites do not each need finding.
     */
    public boolean isArchived() {
        return this == ARCHIVED;
    }
}
