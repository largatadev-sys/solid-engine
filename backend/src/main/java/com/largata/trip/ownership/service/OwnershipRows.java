package com.largata.trip.ownership.service;

import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.ownership.repository.OwnershipOfferRepository;
import com.largata.trip.ownership.repository.OwnershipTransferRepository;


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
