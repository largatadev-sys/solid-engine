package com.largata.membership;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface OwnershipOfferRepository extends JpaRepository<OwnershipOffer, UUID> {


    Optional<OwnershipOffer> findByWorkspaceIdAndStatus(UUID workspaceId, OwnershipOfferStatus status);


    Optional<OwnershipOffer> findByWorkspaceIdAndTargetTravelerIdAndStatus(
            UUID workspaceId, UUID targetTravelerId, OwnershipOfferStatus status);
}
