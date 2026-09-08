package com.largata.trip.ownership.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.largata.trip.ownership.entity.OwnershipOffer;
import com.largata.trip.ownership.entity.OwnershipOfferStatus;


public interface OwnershipOfferRepository extends JpaRepository<OwnershipOffer, UUID> {


    Optional<OwnershipOffer> findByWorkspaceIdAndStatus(UUID workspaceId, OwnershipOfferStatus status);


    Optional<OwnershipOffer> findByWorkspaceIdAndTargetTravelerIdAndStatus(
            UUID workspaceId, UUID targetTravelerId, OwnershipOfferStatus status);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM OwnershipOffer o WHERE o.workspaceId = :workspaceId")
    int deleteByWorkspaceId(@Param("workspaceId") UUID workspaceId);
}
