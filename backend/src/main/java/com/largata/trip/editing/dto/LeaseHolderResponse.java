package com.largata.trip.editing.dto;

import com.largata.trip.editing.entity.LeaseHolder;
import java.time.Instant;
import java.util.UUID;


public record LeaseHolderResponse(
        UUID travelerId, String handle, String displayName, String avatarUrl, Instant expiresAt) {

    public static LeaseHolderResponse of(LeaseHolder holder) {
        return holder == null
                ? null
                : new LeaseHolderResponse(
                        holder.travelerId(),
                        holder.handle(),
                        holder.displayName(),
                        holder.avatarUrl(),
                        holder.expiresAt());
    }
}
