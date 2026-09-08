package com.largata.trip.ownership;

import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Component
public class OwnershipRows {

    private final OwnershipOfferRepository offers;
    private final OwnershipTransferRepository transfers;

    OwnershipRows(OwnershipOfferRepository offers, OwnershipTransferRepository transfers) {
        this.offers = offers;
        this.transfers = transfers;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void deleteEverythingHangingOff(UUID workspaceId) {
        offers.deleteByWorkspaceId(workspaceId);
        transfers.deleteByWorkspaceId(workspaceId);
    }
}
