package com.largata.itinerary;

import com.largata.common.error.ConflictException;
import java.util.Map;


public class StalePlanException extends ConflictException {

    private final long currentPlanVersion;

    StalePlanException(long currentPlanVersion) {
        super(
                "STALE_PLAN",
                "This plan changed while you were away. Discard your changes to load it, "
                        + "or save anyway to replace it.");
        this.currentPlanVersion = currentPlanVersion;
    }


    public long currentPlanVersion() {
        return currentPlanVersion;
    }


    @Override
    public Map<String, Object> details() {
        return Map.of("currentPlanVersion", currentPlanVersion);
    }
}
